import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { QrBlockSchema } from "#database/schema";
import LinkCheck from "#models/link_check";
import QrCode from "#models/qr_code";
import User from "#models/user";

export default class QrBlock extends QrBlockSchema {
  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;

  @belongsTo(() => LinkCheck)
  declare linkCheck: BelongsTo<typeof LinkCheck> | null;

  @belongsTo(() => User, { foreignKey: "createdByUserId" })
  declare createdBy: BelongsTo<typeof User> | null;

  @belongsTo(() => User, { foreignKey: "releasedByUserId" })
  declare releasedBy: BelongsTo<typeof User> | null;
}
