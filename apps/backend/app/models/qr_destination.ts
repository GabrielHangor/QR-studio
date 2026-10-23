import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

import { QrDestinationSchema } from "#database/schema";
import LinkCheck from "#models/link_check";
import QrCode from "#models/qr_code";
import RedirectEvent from "#models/redirect_event";

export default class QrDestination extends QrDestinationSchema {
  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;

  @hasMany(() => LinkCheck, { foreignKey: "destinationId" })
  declare linkChecks: HasMany<typeof LinkCheck>;

  @hasMany(() => RedirectEvent, { foreignKey: "destinationId" })
  declare redirectEvents: HasMany<typeof RedirectEvent>;
}
