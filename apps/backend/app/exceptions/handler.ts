import { errors as authErrors } from "@adonisjs/auth";
import { type HttpContext, ExceptionHandler } from "@adonisjs/core/http";
import app from "@adonisjs/core/services/app";
import { errors as shieldErrors } from "@adonisjs/shield";
import { errors as validationErrors } from "@vinejs/vine";
import type { SimpleError } from "@vinejs/vine/types";

import AccountUnavailableException from "#exceptions/account_unavailable_exception";
import InvalidVerificationTokenException from "#exceptions/invalid_verification_token_exception";

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction;

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof validationErrors.E_VALIDATION_ERROR) {
      return ctx.response.status(error.status).send({
        errors: error.messages.map((message: SimpleError) => ({ code: error.code, ...message })),
      });
    }
    if (
      error instanceof shieldErrors.E_BAD_CSRF_TOKEN ||
      error instanceof authErrors.E_INVALID_CREDENTIALS ||
      error instanceof authErrors.E_UNAUTHORIZED_ACCESS ||
      error instanceof AccountUnavailableException ||
      error instanceof InvalidVerificationTokenException
    ) {
      return ctx.response.status(error.status).send({
        errors: [{ code: error.code, message: error.message }],
      });
    }
    return super.handle(error, ctx);
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx);
  }
}
