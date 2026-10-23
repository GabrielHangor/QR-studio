import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

import { AssetSchema } from "#database/schema";
import DesignPreset from "#models/design_preset";
import QrCode from "#models/qr_code";
import User from "#models/user";

export default class Asset extends AssetSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @hasMany(() => DesignPreset, { foreignKey: "logoAssetId" })
  declare designPresets: HasMany<typeof DesignPreset>;

  @hasMany(() => QrCode, { foreignKey: "logoAssetId" })
  declare qrCodes: HasMany<typeof QrCode>;
}
