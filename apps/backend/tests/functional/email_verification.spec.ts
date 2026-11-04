import { createHash, randomUUID } from "node:crypto";

import app from "@adonisjs/core/services/app";
import encryption from "@adonisjs/core/services/encryption";
import db from "@adonisjs/lucid/services/db";
import mail from "@adonisjs/mail/services/main";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

import { NotificationService } from "#services/notification_service";
import { browser } from "#tests/helpers/browser";

const password = "test-password-123";

type ErrorBody = { errors: { code: string }[] };

async function json<T>(response: Response) {
  return (await response.json()) as T;
}
const emails: string[] = [];

/**
 * These tests make real HTTP requests, so the commit hook that queues the delivery
 * runs on a real commit. Teardown removes users (cascading to tokens and deliveries)
 * and queue jobs, so later specs see no leftover data.
 */
test.group("Email verification", (group) => {
  group.each.teardown(async () => {
    mail.restore();
    if (emails.length) await db.from("users").whereIn("email", emails).delete();
    await db.from("queue_jobs").delete();
    emails.length = 0;
  });

  function newEmail() {
    const email = `${randomUUID()}@example.test`;
    emails.push(email);
    return email;
  }

  async function signup(email = newEmail()) {
    const client = browser();
    await client.request("/auth/csrf");
    const response = await client.request("/auth/signup", {
      fullName: "Verify Me",
      email,
      password,
      passwordConfirmation: password,
    });
    return { client, email, response };
  }

  function deliveriesFor(email: string) {
    return db
      .from("notification_deliveries")
      .where("recipient", email)
      .orderBy("created_at", "desc");
  }

  /** The link is only readable from the encrypted payload, as the mail body would be. */
  async function latestToken(email: string) {
    const [delivery] = await deliveriesFor(email);
    const payload = encryption.decrypt<{ url: string }>(delivery.encrypted_payload);
    return new URL(payload!.url).searchParams.get("token")!;
  }

  function verify(client: ReturnType<typeof browser>, token: string) {
    return client.request("/auth/email-verification", { token });
  }

  test("signup stores one pending delivery and only the hash of the token", async ({ assert }) => {
    const { response, email } = await signup();
    assert.equal(response.status, 201);

    const deliveries = await deliveriesFor(email);
    assert.lengthOf(deliveries, 1);
    assert.equal(deliveries[0].status, "pending");
    assert.equal(deliveries[0].kind, "email_verification");
    assert.isNotNull(deliveries[0].encrypted_payload);
    assert.notInclude(deliveries[0].encrypted_payload, "verify-email");

    const user = await db.from("users").where("email", email).firstOrFail();
    const [token] = await db.from("account_action_tokens").where("user_id", user.id);
    assert.lengthOf(await db.from("account_action_tokens").where("user_id", user.id), 1);
    assert.match(token.token_hash, /^[0-9a-f]{64}$/);

    const secret = await latestToken(email);
    assert.equal(createHash("sha256").update(secret).digest("hex"), token.token_hash);
    assert.notEqual(token.token_hash, secret);
  });

  test("signup commit queues the delivery job with the delivery id as dedup key", async ({
    assert,
  }) => {
    const { email } = await signup();
    const [delivery] = await deliveriesFor(email);
    const jobs = await db.from("queue_jobs").where("dedup_id", "like", `%${delivery.id}`);
    assert.lengthOf(jobs, 1);
  });

  test("worker sends the email once and clears the encrypted payload", async ({ assert }) => {
    const fake = mail.fake();
    const { email } = await signup();
    const [delivery] = await deliveriesFor(email);

    await (await app.container.make(NotificationService)).deliver(delivery.id);
    fake.mails.assertSentCount(1);

    await (await app.container.make(NotificationService)).deliver(delivery.id);
    fake.mails.assertSentCount(1);

    const sent = await db.from("notification_deliveries").where("id", delivery.id).firstOrFail();
    assert.equal(sent.status, "sent");
    assert.isNotNull(sent.sent_at);
    assert.isNull(sent.encrypted_payload);
  });

  test("valid token verifies the email and is single-use", async ({ assert }) => {
    const { client, email } = await signup();
    const token = await latestToken(email);

    assert.equal((await verify(client, token)).status, 204);

    const profile = await client.request("/account/profile");
    assert.equal(profile.status, 200);
    assert.isNotNull(
      (await json<{ data: { emailVerifiedAt: string | null } }>(profile)).data.emailVerifiedAt,
    );

    const repeat = await verify(client, token);
    assert.equal(repeat.status, 400);
    assert.equal((await json<ErrorBody>(repeat)).errors[0].code, "E_INVALID_VERIFICATION_TOKEN");
  });

  test("expired token is rejected", async ({ assert }) => {
    const { client, email } = await signup();
    const token = await latestToken(email);
    const user = await db.from("users").where("email", email).firstOrFail();
    await db
      .from("account_action_tokens")
      .where("user_id", user.id)
      .update({
        created_at: DateTime.utc().minus({ days: 2 }).toJSDate(),
        expires_at: DateTime.utc().minus({ hours: 1 }).toJSDate(),
      });

    const response = await verify(client, token);
    assert.equal(response.status, 400);
    assert.equal((await json<ErrorBody>(response)).errors[0].code, "E_INVALID_VERIFICATION_TOKEN");
  });

  test("token is rejected after the account email changed", async ({ assert }) => {
    const { client, email } = await signup();
    const token = await latestToken(email);
    const user = await db.from("users").where("email", email).firstOrFail();
    const changed = newEmail();
    await db.from("users").where("id", user.id).update({ email: changed });

    const response = await verify(client, token);
    assert.equal(response.status, 400);
    assert.isNull((await db.from("users").where("id", user.id).firstOrFail()).email_verified_at);
  });

  test("token revoked by a newer issue is rejected, the newer one works", async ({ assert }) => {
    const { client, email } = await signup();
    const oldToken = await latestToken(email);

    assert.equal((await client.request("/account/email-verification", {})).status, 204);
    const newToken = await latestToken(email);
    assert.notEqual(oldToken, newToken);

    assert.equal((await verify(client, oldToken)).status, 400);
    assert.equal((await verify(client, newToken)).status, 204);
  });

  test("resend for a verified account creates no delivery", async ({ assert }) => {
    const { client, email } = await signup();
    assert.equal((await verify(client, await latestToken(email))).status, 204);

    const before = await deliveriesFor(email);
    assert.equal((await client.request("/account/email-verification", {})).status, 204);
    assert.lengthOf(await deliveriesFor(email), before.length);
  });

  test("sweeper re-queues a stale pending delivery and queue dedup keeps it single", async ({
    assert,
  }) => {
    const { email } = await signup();
    const [delivery] = await deliveriesFor(email);
    await db
      .from("notification_deliveries")
      .where("id", delivery.id)
      .update({ created_at: DateTime.utc().minus({ hours: 1 }).toJSDate() });

    const service = await app.container.make(NotificationService);
    assert.equal(await service.requeueStalePending(5), 1);
    assert.equal(await service.requeueStalePending(5), 1);

    const jobs = await db.from("queue_jobs").where("dedup_id", "like", `%${delivery.id}`);
    assert.lengthOf(jobs, 1);
  });
});
