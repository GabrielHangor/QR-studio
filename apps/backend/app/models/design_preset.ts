import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { DesignPresetSchema } from "#database/schema";
import User from "#models/user";

export default class DesignPreset extends DesignPresetSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
