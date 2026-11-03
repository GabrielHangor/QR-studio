import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { TrialApplicationSchema } from "#database/schema";
import User from "#models/user";

export enum TrialApplicationStatus {
  Pending = "pending",
  Waitlisted = "waitlisted",
  Approved = "approved",
  Rejected = "rejected",
}

export default class TrialApplication extends TrialApplicationSchema {
  declare status: TrialApplicationStatus;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: "decidedByUserId" })
  declare decidedBy: BelongsTo<typeof User> | null;
}
