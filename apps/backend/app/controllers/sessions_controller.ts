import { inject } from "@adonisjs/core";
import type { HttpContext } from "@adonisjs/core/http";

// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { AccountService } from "#services/account_service";
import UserTransformer from "#transformers/user_transformer";
import { loginValidator } from "#validators/user";

@inject()
export default class SessionsController {
  constructor(private accounts: AccountService) {}

  create({ response }: HttpContext) {
    return response.noContent();
  }

  async store({ request, auth, session, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);

    const user = await this.accounts.authenticate(email, password);
    await auth.use("web").login(user);
    await session.tag(String(user.id));

    return serialize({ user: UserTransformer.transform(user) });
  }

  async destroy({ auth, session, response }: HttpContext) {
    await auth.use("web").logout();
    session.clear();
    session.regenerate();

    return response.noContent();
  }
}
