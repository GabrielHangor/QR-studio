import { Exception } from "@adonisjs/core/exceptions";

export default class InvalidVerificationTokenException extends Exception {
  constructor() {
    super("Verification link is invalid or expired", {
      status: 400,
      code: "E_INVALID_VERIFICATION_TOKEN",
    });
  }
}
