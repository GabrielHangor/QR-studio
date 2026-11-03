import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { QrLogoSchema } from "#database/schema";
import QrCode from "#models/qr_code";
import User from "#models/user";

export enum QrLogoMediaType {
  Png = "image/png",
  Jpeg = "image/jpeg",
  Webp = "image/webp",
}

export default class QrLogo extends QrLogoSchema {
  declare mediaType: QrLogoMediaType;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;
}
