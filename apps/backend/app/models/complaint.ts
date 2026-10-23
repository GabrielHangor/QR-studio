import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { ComplaintSchema } from "#database/schema";
import QrCode from "#models/qr_code";
import User from "#models/user";

export enum ComplaintKind {
  Report = "report",
  Appeal = "appeal",
}

export enum ComplaintStatus {
  Open = "open",
  InReview = "in_review",
  Resolved = "resolved",
  Dismissed = "dismissed",
}

export default class Complaint extends ComplaintSchema {
  declare kind: ComplaintKind;
  declare status: ComplaintStatus;

  @belongsTo(() => QrCode)
  declare qrCode: BelongsTo<typeof QrCode>;

  @belongsTo(() => User, { foreignKey: "reporterUserId" })
  declare reporter: BelongsTo<typeof User> | null;

  @belongsTo(() => User, { foreignKey: "resolvedByUserId" })
  declare resolvedBy: BelongsTo<typeof User> | null;
}
