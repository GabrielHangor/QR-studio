import type { HttpContext } from "@adonisjs/core/http";

import User from "#models/user";
import UserTransformer from "#transformers/user_transformer";
import { loginValidator } from "#validators/user";

export default class SessionsController {
  create({ response }: HttpContext) {
    response.header("Cache-Control", "no-store");
    return response.noContent();
  }

  async store({ request, auth, session, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);

    const user = await User.verifyCredentials(email, password);
    await auth.use("web").login(user);
    await session.tag(String(user.id));

    return serialize({
      user: UserTransformer.transform(user),
    });
  }

  async destroy({ auth, session }: HttpContext) {
    await auth.use("web").logout();
    session.clear();
    session.regenerate();

    return {
      message: "Logged out successfully",
    };
  }
}
