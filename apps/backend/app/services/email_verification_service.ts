import { createHash, randomBytes } from "node:crypto";

import { inject } from "@adonisjs/core";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";
import { DateTime } from "luxon";

import InvalidVerificationTokenException from "#exceptions/invalid_verification_token_exception";
import AccountActionToken, { AccountActionTokenPurpose } from "#models/account_action_token";
import { NotificationDeliveryKind } from "#models/notification_delivery";
import User from "#models/user";
// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { NotificationService } from "#services/notification_service";
import env from "#start/env";

/** Lifetime of an email verification link. */
const EMAIL_VERIFICATION_TTL = { hours: 24 };

/** Only the SHA-256 hash of the secret is stored; the secret lives in the encrypted delivery. */
function hashToken(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

@inject()
export class EmailVerificationService {
  constructor(private readonly notifications: NotificationService) {}

  /** Revokes open tokens of the same purpose and queues a new verification email. */
  async issue(trx: TransactionClientContract, user: User) {
    const now = DateTime.utc();

    await AccountActionToken.query({ client: trx })
      .where("userId", user.id)
      .where("purpose", AccountActionTokenPurpose.EmailVerification)
      .whereNull("consumedAt")
      .whereNull("revokedAt")
      .update({ revokedAt: now });

    const secret = randomBytes(32).toString("base64url");
    const token = await AccountActionToken.create(
      {
        userId: user.id,
        purpose: AccountActionTokenPurpose.EmailVerification,
        tokenHash: hashToken(secret),
        email: user.email,
        expiresAt: now.plus(EMAIL_VERIFICATION_TTL),
      },
      { client: trx },
    );

    await this.notifications.enqueue(trx, {
      userId: user.id,
      kind: NotificationDeliveryKind.EmailVerification,
      recipient: user.email,
      payload: { url: `${env.get("APP_FRONTEND_URL")}/verify-email?token=${secret}` },
      deduplicationKey: `email_verification:${token.id}`,
    });
  }

  /** Issues a new link unless the email is already verified. */
  async resend(user: User) {
    if (user.emailVerifiedAt) return;
    await db.transaction((trx) => this.issue(trx, user));
  }

  async consume(secret: string) {
    const now = DateTime.utc();

    await db.transaction(async (trx) => {
      const token = await AccountActionToken.query({ client: trx })
        .where("tokenHash", hashToken(secret))
        .where("purpose", AccountActionTokenPurpose.EmailVerification)
        .forUpdate()
        .first();
      if (
        !token ||
        token.consumedAt ||
        token.revokedAt ||
        token.expiresAt.toMillis() <= now.toMillis()
      ) {
        throw new InvalidVerificationTokenException();
      }

      const user = await User.query({ client: trx }).where("id", token.userId).forUpdate().first();
      if (!user || user.email !== token.email) throw new InvalidVerificationTokenException();

      token.useTransaction(trx);
      token.consumedAt = now;
      await token.save();

      if (!user.emailVerifiedAt) {
        user.useTransaction(trx);
        user.emailVerifiedAt = now;
        await user.save();
      }
    });
  }
}
