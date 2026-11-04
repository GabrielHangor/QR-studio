import encryption from "@adonisjs/core/services/encryption";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";
import mail from "@adonisjs/mail/services/main";
import { DateTime } from "luxon";

import VerifyEmailNotification from "#mails/verify_email_notification";
import NotificationDelivery, {
  NotificationDeliveryKind,
  NotificationDeliveryStatus,
} from "#models/notification_delivery";

export type NotificationPayload = Record<string, string>;

type EnqueueInput = {
  userId: number;
  kind: NotificationDeliveryKind;
  recipient: string;
  payload: NotificationPayload;
  deduplicationKey: string;
};

/** Upper bound of deliveries re-queued by one sweeper run. */
const SWEEP_LIMIT = 100;

/**
 * Transactional outbox: the delivery row is written in the caller's transaction,
 * and the queue job is dispatched only after that transaction commits.
 */
export class NotificationService {
  async enqueue(trx: TransactionClientContract, input: EnqueueInput) {
    const existing = await NotificationDelivery.query({ client: trx })
      .where("deduplicationKey", input.deduplicationKey)
      .first();
    if (existing) return existing;

    const delivery = await NotificationDelivery.create(
      {
        userId: input.userId,
        kind: input.kind,
        recipient: input.recipient,
        encryptedPayload: encryption.encrypt(input.payload),
        deduplicationKey: input.deduplicationKey,
      },
      { client: trx },
    );

    trx.after("commit", () => this.dispatch(delivery.id));
    return delivery;
  }

  async dispatch(deliveryId: string) {
    // Lazy import: the job injects this service, so a static import would create a module cycle.
    const { default: SendNotification } = await import("#jobs/send_notification");
    await SendNotification.dispatch({ deliveryId }).dedup({ id: deliveryId }).run();
  }

  /** Sends a pending delivery once. The row lock and status check make repeated runs no-ops. */
  async deliver(deliveryId: string) {
    try {
      await db.transaction(async (trx) => {
        const delivery = await NotificationDelivery.query({ client: trx })
          .where("id", deliveryId)
          .forUpdate()
          .first();
        if (!delivery || delivery.status !== NotificationDeliveryStatus.Pending) return;
        if (!delivery.encryptedPayload) throw new Error("Pending delivery has no payload");

        const payload = encryption.decrypt<NotificationPayload>(delivery.encryptedPayload);
        if (!payload) throw new Error("Pending delivery payload cannot be decrypted");

        await mail.send(this.buildMail(delivery.kind, delivery.recipient, payload));

        delivery.useTransaction(trx);
        delivery.status = NotificationDeliveryStatus.Sent;
        delivery.sentAt = DateTime.utc();
        delivery.encryptedPayload = null;
        await delivery.save();
      });
    } catch (error) {
      await this.recordError(deliveryId, error);
      // The original error is deliberately not chained: it may contain the recipient or the link.
      // oxlint-disable-next-line eslint/preserve-caught-error
      throw new Error(`Notification delivery ${deliveryId} failed`);
    }
  }

  async markFailed(deliveryId: string) {
    await NotificationDelivery.query()
      .where("id", deliveryId)
      .where("status", NotificationDeliveryStatus.Pending)
      .update({ status: NotificationDeliveryStatus.Failed });
  }

  /** Re-dispatches pending deliveries older than the threshold; queue dedup keeps this idempotent. */
  async requeueStalePending(olderThanMinutes: number) {
    const cutoff = DateTime.utc().minus({ minutes: olderThanMinutes }).toJSDate();
    const stale = await NotificationDelivery.query()
      .where("status", NotificationDeliveryStatus.Pending)
      .where("createdAt", "<", cutoff)
      .orderBy("createdAt", "asc")
      .limit(SWEEP_LIMIT);

    await Promise.all(stale.map((delivery) => this.dispatch(delivery.id)));
    return stale.length;
  }

  private buildMail(
    kind: NotificationDeliveryKind,
    recipient: string,
    payload: NotificationPayload,
  ) {
    switch (kind) {
      case NotificationDeliveryKind.EmailVerification:
        return new VerifyEmailNotification(recipient, payload.url);
      default: {
        const unknownKind: never = kind;
        throw new Error(`Unknown notification kind: ${unknownKind}`);
      }
    }
  }

  private async recordError(deliveryId: string, error: unknown) {
    const code =
      error instanceof Error && "code" in error && typeof error.code === "string"
        ? error.code
        : "E_NOTIFICATION_SEND";
    await NotificationDelivery.query()
      .where("id", deliveryId)
      .where("status", NotificationDeliveryStatus.Pending)
      .update({ lastErrorCode: code });
  }
}
