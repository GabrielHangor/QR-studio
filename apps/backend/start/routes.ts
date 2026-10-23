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

router.get("/", () => {
  return { hello: "world" };
});

router
  .group(() => {
    router
      .group(() => {
        router.get("csrf", [controllers.Sessions, "create"]).as("csrf");
        router.post("signup", [controllers.NewAccount, "store"]);
        router.post("login", [controllers.Sessions, "store"]);
      })
      .prefix("auth")
      .as("auth");

    router
      .group(() => {
        router.get("profile", [controllers.Profile, "show"]);
        router.post("logout", [controllers.Sessions, "destroy"]);
      })
      .prefix("account")
      .as("profile")
      .use(middleware.auth());
  })
  .prefix("/api/v1");
