import { hasOne } from "@adonisjs/lucid/orm";
import type { HasOne } from "@adonisjs/lucid/types/relations";

import { ShortCodeSchema } from "#database/schema";
import QrCode from "#models/qr_code";

export default class ShortCode extends ShortCodeSchema {
  static primaryKey = "code";

  @hasOne(() => QrCode, { foreignKey: "shortCode", localKey: "code" })
  declare qrCode: HasOne<typeof QrCode> | null;
}
