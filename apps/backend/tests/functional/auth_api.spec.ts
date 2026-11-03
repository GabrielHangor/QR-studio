import { randomUUID } from "node:crypto";

import testUtils from "@adonisjs/core/services/test_utils";
import type { InferData } from "@adonisjs/core/types/transformers";
import db from "@adonisjs/lucid/services/db";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

import User, { UserRole } from "#models/user";
import { browser, sessionCookie } from "#tests/helpers/browser";
import type UserTransformer from "#transformers/user_transformer";

type PublicUser = InferData<UserTransformer>;
type AuthResponse = { data: { user: PublicUser } };
type ProfileResponse = { data: PublicUser };
type ErrorResponse = {
  errors: { code: string; message: string; field?: string; rule?: string }[];
};

const password = "test-password-123";

function createUser() {
  return User.create({ email: `${randomUUID()}@example.test`, fullName: "Test User", password });
}

async function signedInBrowser(user: User) {
  const client = browser();
  await client.request("/auth/csrf");
  const login = await client.request("/auth/login", { email: user.email, password });
  if (login.status !== 200) throw new Error(`Test login failed: ${login.status}`);
  return client;
}

const restrictions = [
  {
    name: "blocked",
    code: "E_ACCOUNT_BLOCKED",
    attributes: () => ({ blockedAt: DateTime.utc(), blockReason: "Private administrative reason" }),
  },
  {
    name: "pending deletion",
    code: "E_ACCOUNT_PENDING_DELETION",
    attributes: () => ({
      deletionRequestedAt: DateTime.utc(),
      deleteAfter: DateTime.utc().plus({ days: 30 }),
    }),
  },
];

test.group("Account API", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("registers a normalized identity and ignores client-controlled account privileges", async ({
    assert,
  }) => {
    const email = `${randomUUID()}@example.test`;
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/signup", {
      fullName: "  Test User  ",
      email: `  ${email.toUpperCase()}  `,
      password,
      passwordConfirmation: password,
      role: UserRole.Admin,
      timezone: "Asia/Tokyo",
      emailVerifiedAt: DateTime.utc().toISO(),
      blockedAt: DateTime.utc().toISO(),
    });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = (await response.json()) as AuthResponse;
    assert.equal(body.data.user.email, email);
    assert.equal(body.data.user.fullName, "Test User");
    assert.isNull(body.data.user.emailVerifiedAt);
    assert.equal(body.data.user.timezone, "Europe/Moscow");
    assert.notProperty(body.data.user, "password");
    const user = await User.findOrFail(body.data.user.id);
    assert.equal(user.role, UserRole.User);
    assert.isNull(user.blockedAt);
    assert.isNull(user.trialStartedAt);
    assert.isTrue(await user.verifyPassword(password));
    assert.equal((await client.request("/account/profile")).status, 200);
  });

  test("accepts a 128-character password at registration", async ({ assert }) => {
    const client = browser();
    await client.request("/auth/csrf");
    const longPassword = "p".repeat(128);
    const response = await client.request("/auth/signup", {
      email: `${randomUUID()}@example.test`,
      password: longPassword,
      passwordConfirmation: longPassword,
    });
    assert.equal(response.status, 201);
  });

  test("allows registration without a name and leaves password whitespace unchanged", async ({
    assert,
  }) => {
    const email = `${randomUUID()}@example.test`;
    const spacedPassword = " password-with-spaces ";
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/signup", {
      email,
      password: spacedPassword,
      passwordConfirmation: spacedPassword,
    });
    assert.equal(response.status, 201);
    const user = await User.findByOrFail("email", email);
    assert.isNull(user.fullName);
    assert.isTrue(await user.verifyPassword(spacedPassword));
    assert.isFalse(await user.verifyPassword(spacedPassword.trim()));
  });

  test("normalizes email when a model is created or updated", async ({ assert }) => {
    const id = randomUUID();
    const user = await User.create({ email: ` ${id.toUpperCase()}@EXAMPLE.TEST `, password });
    assert.equal(user.email, `${id}@example.test`);
    await user.merge({ email: ` CHANGED-${id.toUpperCase()}@EXAMPLE.TEST ` }).save();
    await user.refresh();
    assert.equal(user.email, `changed-${id}@example.test`);
  });

  test("finds an existing identity regardless of input email case and boundary spaces", async ({
    assert,
  }) => {
    const user = await createUser();
    const canonicalEmail = user.email;
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/login", {
      email: `  ${canonicalEmail.toUpperCase()}  `,
      password,
    });
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as AuthResponse).data.user.id, user.id);
  });

  test("returns a field validation error for an already registered email identity", async ({
    assert,
  }) => {
    const user = await createUser();
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/signup", {
      email: ` ${user.email.toUpperCase()} `,
      password,
      passwordConfirmation: password,
    });
    assert.equal(response.status, 422);
    assert.deepEqual(((await response.json()) as ErrorResponse).errors, [
      {
        code: "E_VALIDATION_ERROR",
        field: "email",
        rule: "database.unique",
        message: "The email has already been taken",
      },
    ]);
    assert.equal((await client.request("/account/profile")).status, 401);
  });

  for (const invalid of [
    { name: "invalid email", body: { email: "invalid" }, field: "email" },
    {
      name: "short password",
      body: { password: "short", passwordConfirmation: "short" },
      field: "password",
    },
    {
      name: "oversized password",
      body: { password: "a".repeat(129), passwordConfirmation: "a".repeat(129) },
      field: "password",
    },
    {
      name: "mismatched confirmation",
      body: { passwordConfirmation: "another-password" },
      field: "passwordConfirmation",
    },
    { name: "oversized name", body: { fullName: "a".repeat(256) }, field: "fullName" },
  ]) {
    test(`validates ${invalid.name} with Vine`, async ({ assert }) => {
      const client = browser();
      await client.request("/auth/csrf");
      const response = await client.request("/auth/signup", {
        email: `${randomUUID()}@example.test`,
        password,
        passwordConfirmation: password,
        ...invalid.body,
      });
      assert.equal(response.status, 422);
      const body = (await response.json()) as ErrorResponse;
      const error = body.errors.find((entry) => entry.field === invalid.field);
      assert.isDefined(error);
      assert.equal(error!.code, "E_VALIDATION_ERROR");
      assert.isString(error!.message);
      assert.isString(error!.rule);
      assert.notProperty(body, "stack");
    });
  }

  test("returns verification and timezone through the profile transformer", async ({ assert }) => {
    const user = await createUser();
    const verifiedAt = DateTime.utc();
    await user.merge({ emailVerifiedAt: verifiedAt, timezone: "Asia/Vladivostok" }).save();
    const client = await signedInBrowser(user);
    const response = await client.request("/account/profile");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const { data } = (await response.json()) as ProfileResponse;
    assert.sameMembers(Object.keys(data), [
      "id",
      "fullName",
      "email",
      "emailVerifiedAt",
      "timezone",
      "createdAt",
      "updatedAt",
      "initials",
    ]);
    assert.equal(Date.parse(data.emailVerifiedAt!), verifiedAt.toMillis());
    assert.equal(data.timezone, "Asia/Vladivostok");
  });

  test("uses the same credential error for unknown identities and wrong passwords", async ({
    assert,
  }) => {
    const user = await createUser();
    const client = browser();
    await client.request("/auth/csrf");
    const wrong = await client.request("/auth/login", {
      email: user.email,
      password: "wrong-password",
    });
    const unknown = await client.request("/auth/login", {
      email: `${randomUUID()}@example.test`,
      password,
    });
    assert.equal(wrong.status, 400);
    assert.equal(unknown.status, 400);
    const body = (await wrong.json()) as ErrorResponse;
    assert.equal(body.errors[0].code, "E_INVALID_CREDENTIALS");
    assert.deepEqual(await unknown.json(), body);
    assert.notProperty(body, "stack");
  });

  for (const restriction of restrictions) {
    test(`refuses login to a ${restriction.name} account and revokes its other sessions`, async ({
      assert,
    }) => {
      const user = await createUser();
      const previous = await signedInBrowser(user);
      await user.merge(restriction.attributes()).save();
      const client = browser();
      await client.request("/auth/csrf");
      const wrongPassword = await client.request("/auth/login", {
        email: user.email,
        password: "wrong-password",
      });
      assert.equal(wrongPassword.status, 400);
      assert.equal(
        ((await wrongPassword.json()) as ErrorResponse).errors[0].code,
        "E_INVALID_CREDENTIALS",
      );
      const response = await client.request("/auth/login", { email: user.email, password });
      assert.equal(response.status, 403);
      const body = (await response.json()) as ErrorResponse;
      assert.equal(body.errors[0].code, restriction.code);
      assert.notInclude(JSON.stringify(body), "Private administrative reason");
      assert.lengthOf(await db.from("sessions").where("user_id", String(user.id)), 0);
      assert.equal((await previous.request("/account/profile")).status, 401);
      assert.equal((await client.request("/account/profile")).status, 401);
    });

    test(`revokes all existing sessions when a ${restriction.name} account accesses the profile`, async ({
      assert,
    }) => {
      const user = await createUser();
      const first = await signedInBrowser(user);
      const second = await signedInBrowser(user);
      const originalCookie = first.cookies.get(sessionCookie)!;
      await user.merge(restriction.attributes()).save();
      const response = await first.request("/account/profile");
      assert.equal(response.status, 403);
      assert.equal(((await response.json()) as ErrorResponse).errors[0].code, restriction.code);
      assert.lengthOf(await db.from("sessions").where("user_id", String(user.id)), 0);
      assert.equal((await second.request("/account/profile")).status, 401);
      await user
        .merge({ blockedAt: null, blockReason: null, deletionRequestedAt: null, deleteAfter: null })
        .save();
      const replay = browser();
      replay.cookies.set(sessionCookie, originalCookie);
      assert.equal((await replay.request("/account/profile")).status, 401);
      assert.equal((await (await signedInBrowser(user)).request("/account/profile")).status, 200);
    });
  }

  test("allows a restricted user to explicitly log out", async ({ assert }) => {
    const user = await createUser();
    const client = await signedInBrowser(user);
    await user.merge({ blockedAt: DateTime.utc(), blockReason: "Test block" }).save();
    const response = await client.request("/account/logout", {});
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal((await client.request("/account/profile")).status, 401);
  });
});
