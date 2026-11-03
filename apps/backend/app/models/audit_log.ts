import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { AuditLogSchema } from "#database/schema";
import UserModel from "#models/user";

export enum AuditLogTargetType {
  User = "user",
  QrCode = "qr_code",
  Complaint = "complaint",
  TrialApplication = "trial_application",
}

export default class AuditLog extends AuditLogSchema {
  declare targetType: AuditLogTargetType;

  @belongsTo(() => UserModel, { foreignKey: "actorUserId" })
  declare actor: BelongsTo<typeof UserModel> | null;
}
