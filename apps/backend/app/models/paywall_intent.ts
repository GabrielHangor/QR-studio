import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { PaywallIntentSchema } from "#database/schema";
import User from "#models/user";

export enum PaywallOption {
  Subscription = "subscription",
  OneTime = "one_time",
}

export default class PaywallIntent extends PaywallIntentSchema {
  declare option: PaywallOption;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
