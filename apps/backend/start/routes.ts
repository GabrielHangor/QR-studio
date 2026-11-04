/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from "@adonisjs/core/services/router";

import { controllers } from "#generated/controllers";
import { middleware } from "#start/kernel";

router
  .group(() => {
    router
      .group(() => {
        router.get("csrf", [controllers.Sessions, "create"]).as("csrf");
        router.post("signup", [controllers.NewAccount, "store"]).as("signup");
        router.post("login", [controllers.Sessions, "store"]).as("login");
        router
          .post("email-verification", [controllers.EmailVerification, "verify"])
          .as("emailVerification");
      })
      .prefix("auth")
      .as("auth");

    router
      .group(() => {
        router
          .get("profile", [controllers.Profile, "show"])
          .as("profile")
          .use(middleware.accountAccess());
        router.post("logout", [controllers.Sessions, "destroy"]).as("logout");
        router
          .post("email-verification", [controllers.EmailVerification, "resend"])
          .as("resendEmailVerification")
          .use(middleware.accountAccess());
      })
      .prefix("account")
      .as("account")
      .use(middleware.auth());
  })
  .prefix("/api/v1");
