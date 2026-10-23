import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

import { LinkCheckSchema } from "#database/schema";
import QrBlock from "#models/qr_block";
import QrCode from "#models/qr_code";
import QrDestination from "#models/qr_destination";

export enum LinkCheckTrigger {
  Initial = "initial",
  Periodic = "periodic",
  Manual = "manual",
}

export enum LinkCheckStatus {
  Pending = "pending",
  Safe = "safe",
  Unsafe = "unsafe",
  Error = "error",
}

export default class LinkCheck extends LinkCheckSchema {
  declare trigger: LinkCheckTrigger;
  declare status: LinkCheckStatus;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;

  @belongsTo(() => QrDestination, { foreignKey: "destinationId" })
  declare destination: BelongsTo<typeof QrDestination>;

  @hasMany(() => QrBlock)
  declare blocks: HasMany<typeof QrBlock>;
}
