import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { AccountActionTokenSchema } from "#database/schema";
import User from "#models/user";

export default class AccountActionToken extends AccountActionTokenSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
