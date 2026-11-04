import vine from "@vinejs/vine";

/**
 * Validator for the email verification link token
 */
export const verifyEmailValidator = vine.create({
  token: vine.string().trim().minLength(1).maxLength(256),
});
