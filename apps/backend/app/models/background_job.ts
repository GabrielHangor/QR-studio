import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { BackgroundJobSchema } from "#database/schema";
import NotificationDelivery from "#models/notification_delivery";
import QrCode from "#models/qr_code";
import User from "#models/user";

export enum BackgroundJobStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export default class BackgroundJob extends BackgroundJobSchema {
  declare status: BackgroundJobStatus;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User> | null;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode> | null;

  @belongsTo(() => NotificationDelivery, { foreignKey: "notificationId" })
  declare notification: BelongsTo<typeof NotificationDelivery> | null;
}
