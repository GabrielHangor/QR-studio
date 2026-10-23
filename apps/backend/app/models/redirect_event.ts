import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { RedirectEventSchema } from "#database/schema";
import Campaign from "#models/campaign";
import QrCode from "#models/qr_code";
import QrDestination from "#models/qr_destination";
import User from "#models/user";

export default class RedirectEvent extends RedirectEventSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;

  @belongsTo(() => QrDestination, { foreignKey: "destinationId" })
  declare destination: BelongsTo<typeof QrDestination>;

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign> | null;
}
