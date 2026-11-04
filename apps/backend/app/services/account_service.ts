import { inject } from "@adonisjs/core";
import db from "@adonisjs/lucid/services/db";
import type { Infer } from "@vinejs/vine/types";

import AccountUnavailableException, {
  AccountRestriction,
} from "#exceptions/account_unavailable_exception";
import Session from "#models/session";
import User from "#models/user";
// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { EmailVerificationService } from "#services/email_verification_service";
import type { signupValidator } from "#validators/user";

type RegistrationData = Omit<Infer<typeof signupValidator>, "passwordConfirmation">;

@inject()
export class AccountService {
  constructor(private readonly emailVerification: EmailVerificationService) {}

  async register({ fullName, email, password }: RegistrationData) {
    return db.transaction(async (trx) => {
      const user = await User.create({ fullName, email, password }, { client: trx });
      await this.emailVerification.issue(trx, user);
      return user.useTransaction(trx).refresh();
    });
  }

  async authenticate(email: string, password: string) {
    const user = await User.verifyCredentials(email, password);
    await this.ensureAvailable(user);
    return user;
  }

  async ensureAvailable(user: User) {
    let restriction: AccountRestriction | undefined;

    if (user.deletionRequestedAt) restriction = AccountRestriction.PendingDeletion;
    else if (user.blockedAt) restriction = AccountRestriction.Blocked;

    if (!restriction) return;

    await Session.query().where("userId", String(user.id)).delete();
    throw new AccountUnavailableException(restriction);
  }
}
