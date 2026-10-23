import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

import { CampaignSchema } from "#database/schema";
import QrCode from "#models/qr_code";
import RedirectEvent from "#models/redirect_event";
import User from "#models/user";

export default class Campaign extends CampaignSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @hasMany(() => QrCode)
  declare qrCodes: HasMany<typeof QrCode>;

  @hasMany(() => RedirectEvent)
  declare redirectEvents: HasMany<typeof RedirectEvent>;
}
