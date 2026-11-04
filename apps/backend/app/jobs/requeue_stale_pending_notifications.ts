import { inject } from "@adonisjs/core";
import { Job } from "@adonisjs/queue";

// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { NotificationService } from "#services/notification_service";

/** Sweeper: re-queues deliveries whose commit-time dispatch never reached the queue. */
@inject()
export default class RequeueStalePendingNotifications extends Job<{ olderThanMinutes: number }> {
  constructor(private readonly notifications: NotificationService) {
    super();
  }

  async execute() {
    await this.notifications.requeueStalePending(this.payload.olderThanMinutes);
  }
}
