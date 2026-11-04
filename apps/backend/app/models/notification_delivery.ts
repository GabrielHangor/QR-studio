import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { NotificationDeliverySchema } from "#database/schema";
import QrCode from "#models/qr_code";
import User from "#models/user";

export enum NotificationDeliveryKind {
  EmailVerification = "email_verification",
}

export enum NotificationDeliveryStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed",
  Cancelled = "cancelled",
}

export default class NotificationDelivery extends NotificationDeliverySchema {
  declare kind: NotificationDeliveryKind;
  declare status: NotificationDeliveryStatus;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode> | null;
}
