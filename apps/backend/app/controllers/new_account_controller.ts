import { inject } from "@adonisjs/core";
import type { HttpContext } from "@adonisjs/core/http";

// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { AccountService } from "#services/account_service";
import UserTransformer from "#transformers/user_transformer";
import { signupValidator } from "#validators/user";

@inject()
export default class NewAccountController {
  constructor(private readonly accounts: AccountService) {}

  async store({ request, auth, session, response, serialize }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator);

    const user = await this.accounts.register({ fullName, email, password });
    await auth.use("web").login(user);
    await session.tag(String(user.id));
    response.status(201);

    return serialize({ user: UserTransformer.transform(user) });
  }
}
