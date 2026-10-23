import type { Infer } from "@vinejs/vine/types";

import AccountUnavailableException, {
  AccountRestriction,
} from "#exceptions/account_unavailable_exception";
import Session from "#models/session";
import User from "#models/user";
import type { signupValidator } from "#validators/user";

type RegistrationData = Omit<Infer<typeof signupValidator>, "passwordConfirmation">;

export class AccountService {
  async register({ fullName, email, password }: RegistrationData) {
    const user = await User.create({ fullName, email, password });
    return user.refresh();
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
