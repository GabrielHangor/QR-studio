import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class NoStoreMiddleware {
  async handle({ response }: HttpContext, next: NextFn) {
    response.header("Cache-Control", "no-store");
    return next();
  }
}
