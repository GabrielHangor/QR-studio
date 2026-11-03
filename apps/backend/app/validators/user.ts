import vine from "@vinejs/vine";

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().trim().toLowerCase().email().maxLength(254);
const password = () => vine.string().minLength(8).maxLength(128);

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(255).nullable().optional(),
  email: email().unique(async (db, value) => {
    const existing = await db.from("users").select("id").where("email", value).first();
    return !existing;
  }),
  password: password(),
  passwordConfirmation: password().sameAs("password"),
});

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string().maxLength(128),
});
