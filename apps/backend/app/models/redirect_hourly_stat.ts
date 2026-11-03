import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { RedirectHourlyStatSchema } from "#database/schema";
import QrCode from "#models/qr_code";
import User from "#models/user";

export default class RedirectHourlyStat extends RedirectHourlyStatSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;
}
