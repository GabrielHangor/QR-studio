import { Exception } from "@adonisjs/core/exceptions";

export enum AccountRestriction {
  Blocked = "blocked",
  PendingDeletion = "pending_deletion",
}

export default class AccountUnavailableException extends Exception {
  constructor(restriction: AccountRestriction) {
    super(
      restriction === AccountRestriction.Blocked
        ? "This account is blocked"
        : "This account is pending deletion",
      {
        status: 403,
        code:
          restriction === AccountRestriction.Blocked
            ? "E_ACCOUNT_BLOCKED"
            : "E_ACCOUNT_PENDING_DELETION",
      },
    );
  }
}
