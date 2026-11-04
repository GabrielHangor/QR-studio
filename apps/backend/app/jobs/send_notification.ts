import { inject } from "@adonisjs/core";
import { Job } from "@adonisjs/queue";

// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { NotificationService } from "#services/notification_service";

@inject()
export default class SendNotification extends Job<{ deliveryId: string }> {
  static options = { maxRetries: 5 };

  constructor(private readonly notifications: NotificationService) {
    super();
  }

  async execute() {
    await this.notifications.deliver(this.payload.deliveryId);
  }

  async failed() {
    await this.notifications.markFailed(this.payload.deliveryId);
  }
}
