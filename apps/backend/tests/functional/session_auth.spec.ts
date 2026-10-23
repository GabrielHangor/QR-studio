import { randomUUID } from "node:crypto";

import testUtils from "@adonisjs/core/services/test_utils";
import db from "@adonisjs/lucid/services/db";
import { test } from "@japa/runner";

import User from "#models/user";
import env from "#start/env";

const sessionCookie = "qr-studio-session";
const password = "test-password-123";

/** Sends the real cookies received over HTTP, without Japa's synthetic session helpers. */
function browser() {
  const cookies = new Map<string, string>();
  return {
    cookies,
    async request(path: string, body?: Record<string, unknown>, headers?: Record<string, string>) {
      const response = await fetch(`http://${env.get("HOST")}:${env.get("PORT")}/api/v1${path}`, {
        method: body ? "POST" : "GET",
        redirect: "manual",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Cookie": [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
          ...(body && cookies.has("XSRF-TOKEN")
            ? { "X-XSRF-TOKEN": cookies.get("XSRF-TOKEN")! }
            : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";", 1)[0]!;
        const separator = pair.indexOf("=");
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
      return response;
    },
  };
}

async function createUser() {
  return User.create({ fullName: "Test User", email: `${randomUUID()}@example.test`, password });
}

test.group("Cookie session authentication", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("requires a session for the profile", async ({ assert }) => {
    const response = await browser().request("/account/profile");
    assert.equal(response.status, 401);
  });

  test("issues host-only session and XSRF cookies", async ({ assert }) => {
    const client = browser();
    const response = await client.request("/auth/csrf");
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${sessionCookie}=`));
    assert.isDefined(cookie);
    assert.include(cookie!, "HttpOnly");
    assert.include(cookie!, "SameSite=Lax");
    assert.notMatch(cookie!, /Domain=/i);
    assert.isTrue(client.cookies.has("XSRF-TOKEN"));
    const xsrf = response.headers.getSetCookie().find((value) => value.startsWith("XSRF-TOKEN="));
    assert.notInclude(xsrf!, "HttpOnly");
  });

  test("logs in, rotates the session, reads the profile, and revokes the old cookie on logout", async ({
    assert,
  }) => {
    const user = await createUser();
    const client = browser();
    await client.request("/auth/csrf");
    const anonymousCookie = client.cookies.get(sessionCookie);

    const login = await client.request("/auth/login", { email: user.email, password });
    assert.equal(login.status, 200);
    const body = (await login.json()) as { data: { user: { id: number } } };
    assert.equal(body.data.user.id, user.id);
    assert.notProperty(body.data, "token");
    assert.notProperty(body.data.user, "password");
    assert.notEqual(client.cookies.get(sessionCookie), anonymousCookie);

    const profile = await client.request("/account/profile");
    assert.equal(profile.status, 200);
    assert.equal(((await profile.json()) as { data: { id: number } }).data.id, user.id);
    assert.lengthOf(await db.from("sessions").where("user_id", String(user.id)), 1);
    const authenticatedCookie = client.cookies.get(sessionCookie)!;

    const logout = await client.request("/account/logout", {});
    assert.equal(logout.status, 200);
    assert.equal((await client.request("/account/profile")).status, 401);

    const replay = browser();
    replay.cookies.set(sessionCookie, authenticatedCookie);
    assert.equal((await replay.request("/account/profile")).status, 401);
  });

  test("rejects an expired PostgreSQL session", async ({ assert }) => {
    const user = await createUser();
    const client = browser();
    await client.request("/auth/csrf");
    const login = await client.request("/auth/login", { email: user.email, password });
    assert.equal(login.status, 200);
    await db.from("sessions").update({ expires_at: new Date(Date.now() - 60_000) });
    assert.equal((await client.request("/account/profile")).status, 401);
  });

  test("registers and authenticates without returning a bearer token", async ({ assert }) => {
    const client = browser();
    await client.request("/auth/csrf");
    const email = `${randomUUID()}@example.test`;
    const response = await client.request("/auth/signup", {
      fullName: "New User",
      email,
      password,
      passwordConfirmation: password,
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { data: { user: { email: string } } };
    assert.equal(body.data.user.email, email);
    assert.notProperty(body.data, "token");
    assert.notProperty(body.data.user, "password");
    assert.equal((await client.request("/account/profile")).status, 200);
  });

  test("rejects incorrect credentials", async ({ assert }) => {
    const user = await createUser();
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/login", {
      email: user.email,
      password: "incorrect",
    });
    assert.equal(response.status, 400);
    assert.equal((await client.request("/account/profile")).status, 401);
  });

  test("rejects invalid registration data", async ({ assert }) => {
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/signup", { email: "invalid" });
    assert.equal(response.status, 422);
    assert.equal((await client.request("/account/profile")).status, 401);
  });

  for (const path of ["/auth/signup", "/auth/login", "/account/logout"]) {
    test(`rejects a missing CSRF token on ${path}`, async ({ assert }) => {
      const response = await browser().request(path, {});
      assert.equal(response.status, 403);
      const body = (await response.json()) as { errors: { code: string }[] };
      assert.equal(body.errors[0]!.code, "E_BAD_CSRF_TOKEN");
    });
  }

  test("rejects a CSRF token from another session", async ({ assert }) => {
    const first = browser();
    const second = browser();
    await first.request("/auth/csrf");
    await second.request("/auth/csrf");
    const response = await second.request(
      "/auth/login",
      {},
      {
        "X-XSRF-TOKEN": first.cookies.get("XSRF-TOKEN")!,
      },
    );
    assert.equal(response.status, 403);
  });

  test("does not authenticate a bearer token", async ({ assert }) => {
    const response = await browser().request("/account/profile", undefined, {
      Authorization: "Bearer obsolete-access-token",
    });
    assert.equal(response.status, 401);
  });

  test("allows only configured credentialed browser origins", async ({ assert }) => {
    const allowedOrigin = env.get("CORS_ORIGIN")!.split(",")[0]!.trim();
    const allowed = await browser().request("/auth/csrf", undefined, { Origin: allowedOrigin });
    assert.equal(allowed.headers.get("access-control-allow-origin"), allowedOrigin);
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
    const rejected = await browser().request("/auth/csrf", undefined, {
      Origin: "https://untrusted.example",
    });
    assert.isNull(rejected.headers.get("access-control-allow-origin"));
  });
});
