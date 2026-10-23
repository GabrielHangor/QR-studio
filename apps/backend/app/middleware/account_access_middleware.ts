import { inject } from "@adonisjs/core";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

import AccountUnavailableException from "#exceptions/account_unavailable_exception";
// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { AccountService } from "#services/account_service";

@inject()
export default class AccountAccessMiddleware {
  constructor(private accounts: AccountService) {}

  async handle({ auth, session }: HttpContext, next: NextFn) {
    try {
      await this.accounts.ensureAvailable(auth.getUserOrFail());
    } catch (error) {
      if (error instanceof AccountUnavailableException) {
        await auth.use("web").logout();
        session.clear();
        session.regenerate();
      }
      throw error;
    }
    return next();
  }
}
