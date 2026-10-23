import type { HttpContext } from "@adonisjs/core/http";

import User from "#models/user";
import UserTransformer from "#transformers/user_transformer";
import { signupValidator } from "#validators/user";

export default class NewAccountController {
  async store({ request, auth, serialize }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator);

    const user = await User.create({ fullName, email, password });
    await auth.use("web").login(user);

    return serialize({
      user: UserTransformer.transform(user),
    });
  }
}
