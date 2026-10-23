import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

import { NotificationDeliverySchema } from "#database/schema";
import BackgroundJob from "#models/background_job";
import QrCode from "#models/qr_code";
import User from "#models/user";

export enum NotificationDeliveryStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed",
  Cancelled = "cancelled",
}

export default class NotificationDelivery extends NotificationDeliverySchema {
  declare status: NotificationDeliveryStatus;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode> | null;

  @hasMany(() => BackgroundJob, { foreignKey: "notificationId" })
  declare backgroundJobs: HasMany<typeof BackgroundJob>;
}
