import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { TrialExtensionSchema } from "#database/schema";
import User from "#models/user";

export default class TrialExtension extends TrialExtensionSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: "actorUserId" })
  declare actor: BelongsTo<typeof User> | null;
}
