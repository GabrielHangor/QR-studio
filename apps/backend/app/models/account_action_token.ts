import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import { AccountActionTokenSchema } from "#database/schema";
import User from "#models/user";

export enum AccountActionTokenPurpose {
  EmailVerification = "email_verification",
  PasswordReset = "password_reset",
}

export default class AccountActionToken extends AccountActionTokenSchema {
  declare purpose: AccountActionTokenPurpose;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
