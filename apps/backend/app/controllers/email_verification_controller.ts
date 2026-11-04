import { inject } from "@adonisjs/core";
import type { HttpContext } from "@adonisjs/core/http";

// oxlint-disable-next-line typescript/consistent-type-imports -- Adonis DI needs the runtime constructor in decorator metadata.
import { EmailVerificationService } from "#services/email_verification_service";
import { verifyEmailValidator } from "#validators/email_verification";

@inject()
export default class EmailVerificationController {
  constructor(private readonly verification: EmailVerificationService) {}

  async verify({ request, response }: HttpContext) {
    const { token } = await request.validateUsing(verifyEmailValidator);
    await this.verification.consume(token);
    return response.noContent();
  }

  /** 204 in both cases: a verified account gets no email, otherwise the email is queued asynchronously. */
  async resend({ auth, response }: HttpContext) {
    await this.verification.resend(auth.getUserOrFail());
    return response.noContent();
  }
}
