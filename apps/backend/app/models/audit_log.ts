import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { AuditLogSchema } from "#database/schema";
import User from "#models/user";

export default class AuditLog extends AuditLogSchema {
  @belongsTo(() => User, { foreignKey: "actorUserId" })
  declare actor: BelongsTo<typeof User> | null;
}
