import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { DesignPresetSchema } from "#database/schema";
import Asset from "#models/asset";
import User from "#models/user";

export default class DesignPreset extends DesignPresetSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => Asset, { foreignKey: "logoAssetId" })
  declare logoAsset: BelongsTo<typeof Asset> | null;
}
