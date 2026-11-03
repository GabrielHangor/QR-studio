import { randomUUID } from "node:crypto";

import testUtils from "@adonisjs/core/services/test_utils";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";
import { test } from "@japa/runner";

import User from "#models/user";

async function owner() {
  return User.create({
    email: `${randomUUID()}@example.test`,
    fullName: "Test",
    password: "test-password-123",
  });
}

function logoValues(userId: number, qrId: string) {
  return {
    qr_code_id: qrId,
    user_id: userId,
    storage_key: `logos/${qrId}.png`,
    media_type: "image/png",
    byte_size: 1024,
    width: 32,
    height: 32,
    sha256: "a".repeat(64),
  };
}

async function logo(userId: number, qrId: string) {
  await db.table("qr_logos").insert(logoValues(userId, qrId));
  return qrId;
}

async function qr(userId: number, extra: Record<string, unknown> = {}) {
  const id = randomUUID();
  const code = randomUUID().replaceAll("-", "");
  await db.table("short_codes").insert({ code, qr_code_id: id });
  await db.table("qr_codes").insert({
    id,
    user_id: userId,
    short_code: code,
    name: "QR",
    design_version: 1,
    design: {},
    encoding: {},
    ...extra,
  });
  return { id, code };
}

async function destination(qrId: string, extra: Record<string, unknown> = {}) {
  const id = randomUUID();
  await db
    .table("qr_destinations")
    .insert({ id, qr_code_id: qrId, url: "https://example.com", ...extra });
  return id;
}

function event(
  userId: number,
  qrId: string,
  destinationId: string,
  extra: Record<string, unknown> = {},
) {
  return db.table("redirect_events").insert({
    user_id: userId,
    qr_code_id: qrId,
    destination_id: destinationId,
    ...extra,
  });
}

async function delivery(userId: number, extra: Record<string, unknown> = {}) {
  const id = randomUUID();
  await db.table("notification_deliveries").insert({
    id,
    user_id: userId,
    kind: "test_notification",
    recipient: "user@example.test",
    encrypted_payload: "opaque-encrypted-test-payload",
    deduplication_key: id,
    ...extra,
  });
  return id;
}

async function application(userId: number, extra: Record<string, unknown> = {}) {
  const id = randomUUID();
  await db.table("trial_applications").insert({
    id,
    user_id: userId,
    purpose: "Dynamic QR for a menu",
    ...extra,
  });
  return id;
}

const upsertHourlyStat = `
  INSERT INTO redirect_hourly_stats
    (user_id, qr_code_id, bucket_start, country_code, city, device_type, os_name, redirects)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (qr_code_id, bucket_start, country_code, city, device_type, os_name)
  DO UPDATE SET redirects = redirect_hourly_stats.redirects + EXCLUDED.redirects
`;

const bucket = "2026-11-03T10:00:00.000Z";

// A rejected PostgreSQL statement aborts its transaction; isolate it in a savepoint.
function rejectedWrite(operation: (trx: TransactionClientContract) => Promise<unknown>) {
  return db.transaction(operation);
}

test.group("MVP data constraints", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("defaults new accounts to ordinary users in Moscow time", async ({ assert }) => {
    const user = await owner();
    const row = await db.from("users").where("id", user.id).firstOrFail();
    assert.equal(row.role, "user");
    assert.equal(row.timezone, "Europe/Moscow");
    assert.isNull(row.trial_started_at);
    assert.isNull(row.last_login_at);
  });

  test("prevents duplicate email identities regardless of case and boundary spaces", async ({
    assert,
  }) => {
    const user = await owner();
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("users").insert({
            email: ` ${user.email.toUpperCase()} `,
            password: "unused",
            created_at: new Date(),
          }),
        ),
      /users_email_identity_unique/,
    );
  });

  test("validates role, trial and deletion dates", async ({ assert }) => {
    const user = await owner();
    await assert.rejects(
      () =>
        rejectedWrite((trx) => trx.from("users").where("id", user.id).update({ role: "owner" })),
      /users_role_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.from("users").where("id", user.id).update({ trial_started_at: new Date() }),
        ),
      /users_trial_dates_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.from("users").where("id", user.id).update({ deletion_requested_at: new Date() }),
        ),
      /users_deletion_dates_check/,
    );
  });

  test("preserves trial dates and extension history after removing all QR codes", async ({
    assert,
  }) => {
    const user = await owner();
    const start = new Date("2026-10-23T00:00:00Z");
    const previous = new Date("2026-11-22T00:00:00Z");
    const extended = new Date("2026-12-22T00:00:00Z");
    await db
      .from("users")
      .where("id", user.id)
      .update({ trial_started_at: start, trial_ends_at: extended });
    await db.table("trial_extensions").insert({
      user_id: user.id,
      previous_ends_at: previous,
      new_ends_at: extended,
      reason: "Test extension",
    });
    const code = await qr(user.id);
    await db.from("qr_codes").where("id", code.id).delete();
    const stored = await db.from("users").where("id", user.id).firstOrFail();
    assert.equal(stored.trial_ends_at.toISOString(), extended.toISOString());
    assert.lengthOf(await db.from("trial_extensions").where("user_id", user.id), 1);
  });

  test("requires hashed, time-bounded account action tokens", async ({ assert }) => {
    const user = await owner();
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("account_action_tokens").insert({
            user_id: user.id,
            purpose: "password_reset",
            email: user.email,
            token_hash: "plaintext-token",
            expires_at: new Date(Date.now() + 60_000),
          }),
        ),
      /account_tokens_hash_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("account_action_tokens").insert({
            user_id: user.id,
            purpose: "password_reset",
            email: user.email,
            token_hash: "a".repeat(64),
            expires_at: new Date("2000-01-01T00:00:00Z"),
          }),
        ),
      /account_tokens_expiry_check/,
    );
  });

  test("allows one active trial application per account and a new one after rejection", async ({
    assert,
  }) => {
    const user = await owner();
    await application(user.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("trial_applications").insert({
            user_id: user.id,
            purpose: "Second request",
            status: "waitlisted",
            decided_at: new Date(),
          }),
        ),
      /trial_applications_one_active/,
    );
    const rejected = await db.from("trial_applications").where("user_id", user.id).firstOrFail();
    await db
      .from("trial_applications")
      .where("id", rejected.id)
      .update({ status: "rejected", decided_at: new Date() });
    await application(user.id);
    assert.lengthOf(await db.from("trial_applications").where("user_id", user.id), 2);
  });

  test("requires decision timestamps exactly for decided trial applications", async ({
    assert,
  }) => {
    const user = await owner();
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("trial_applications").insert({
            user_id: user.id,
            purpose: "Approved without decision",
            status: "approved",
          }),
        ),
      /trial_applications_decision_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("trial_applications").insert({
            user_id: user.id,
            purpose: "Pending with decision",
            decided_at: new Date(),
          }),
        ),
      /trial_applications_decision_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("trial_applications").insert({
            user_id: user.id,
            purpose: "   ",
          }),
        ),
      /trial_applications_purpose_check/,
    );
  });

  test("validates paywall intent option, price and currency", async ({ assert }) => {
    const user = await owner();
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("paywall_intents").insert({
            user_id: user.id,
            option: "free",
            price_minor: 0,
            currency: "RUB",
          }),
        ),
      /paywall_intents_option_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("paywall_intents").insert({
            user_id: user.id,
            option: "subscription",
            price_minor: 0,
            currency: "rub",
          }),
        ),
      /paywall_intents_currency_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("paywall_intents").insert({
            user_id: user.id,
            option: "one_time",
            price_minor: -1,
            currency: "RUB",
          }),
        ),
      /paywall_intents_price_check/,
    );
    await db.table("paywall_intents").insert({
      user_id: user.id,
      option: "one_time",
      price_minor: 99000,
      currency: "RUB",
    });
    assert.lengthOf(await db.from("paywall_intents").where("user_id", user.id), 1);
  });

  test("prevents QR logos from belonging to another owner's QR", async ({ assert }) => {
    const first = await owner();
    const second = await owner();
    const code = await qr(first.id);
    await assert.rejects(
      () => rejectedWrite((trx) => trx.table("qr_logos").insert(logoValues(second.id, code.id))),
      /qr_logos_qr_owner_fk/,
    );
  });

  test("keeps a QR logo while the QR is in the trash and removes it with the QR", async ({
    assert,
  }) => {
    const user = await owner();
    const code = await qr(user.id, { deleted_at: new Date() });
    await logo(user.id, code.id);
    assert.exists(await db.from("qr_logos").where("qr_code_id", code.id).first());
    await db.from("qr_codes").where("id", code.id).delete();
    assert.isNull(await db.from("qr_logos").where("qr_code_id", code.id).first());
  });

  test("validates QR logo media type, size and checksum", async ({ assert }) => {
    const user = await owner();
    const code = await qr(user.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx
            .table("qr_logos")
            .insert({ ...logoValues(user.id, code.id), media_type: "image/gif" }),
        ),
      /qr_logos_media_type_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("qr_logos").insert({ ...logoValues(user.id, code.id), byte_size: 0 }),
        ),
      /qr_logos_byte_size_check/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("qr_logos").insert({ ...logoValues(user.id, code.id), sha256: "A".repeat(64) }),
        ),
      /qr_logos_hash_check/,
    );
  });

  test("preserves short code reservations and refuses reissue, mutation or deletion", async ({
    assert,
  }) => {
    const user = await owner();
    const code = await qr(user.id);
    await db.from("qr_codes").where("id", code.id).delete();
    assert.exists(await db.from("short_codes").where("code", code.code).first());
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("qr_codes").insert({
            id: randomUUID(),
            user_id: user.id,
            short_code: code.code,
            name: "Reissue",
            design_version: 1,
            design: {},
            encoding: {},
          }),
        ),
      /qr_reserved_code_fk/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.from("short_codes").where("code", code.code).update({ code: "replacement" }),
        ),
      /reservations are permanent/,
    );
    await assert.rejects(
      () => rejectedWrite((trx) => trx.from("short_codes").where("code", code.code).delete()),
      /reservations are permanent/,
    );
  });

  test("only activates approved destinations and allows one active and one pending candidate", async ({
    assert,
  }) => {
    const user = await owner();
    const code = await qr(user.id);
    await destination(code.id, { status: "approved", activated_at: new Date() });
    await destination(code.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("qr_destinations").insert({
            qr_code_id: code.id,
            url: "https://example.org",
            status: "approved",
            activated_at: new Date(),
          }),
        ),
      /destinations_one_active/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("qr_destinations").insert({ qr_code_id: code.id, url: "https://example.org" }),
        ),
      /destinations_one_pending/,
    );
    const other = await qr(user.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx
            .table("qr_destinations")
            .insert({ qr_code_id: other.id, url: "https://example.org", activated_at: new Date() }),
        ),
      /destinations_activation_check/,
    );
  });

  test("keeps redirect events as a buffer without visitor or campaign columns", async ({
    assert,
  }) => {
    const user = await owner();
    const code = await qr(user.id);
    const target = await destination(code.id, { status: "approved", activated_at: new Date() });
    await event(user.id, code.id, target, { country_code: "RU", device_type: "mobile" });
    const row = await db.from("redirect_events").where("qr_code_id", code.id).firstOrFail();
    assert.isFalse(row.is_bot);
    assert.isNull(row.aggregated_at);
    const columns = (
      await db
        .from("information_schema.columns")
        .where({ table_schema: "public", table_name: "redirect_events" })
        .select("column_name")
    ).map((column) => column.column_name);
    assert.notInclude(columns, "visitor_key");
    assert.notInclude(columns, "campaign_id");
    assert.notInclude(columns, "latitude");
    assert.notInclude(columns, "browser_name");
    assert.include(columns, "aggregated_at");
  });

  test("merges hourly stats with identical dimensions, including NULL, into one row", async ({
    assert,
  }) => {
    const user = await owner();
    const code = await qr(user.id);
    await db.rawQuery(upsertHourlyStat, [user.id, code.id, bucket, null, null, null, null, 2]);
    await db.rawQuery(upsertHourlyStat, [user.id, code.id, bucket, null, null, null, null, 3]);
    await db.rawQuery(upsertHourlyStat, [user.id, code.id, bucket, "RU", null, null, null, 1]);
    const rows = await db.from("redirect_hourly_stats").where("qr_code_id", code.id).orderBy("id");
    assert.lengthOf(rows, 2);
    assert.equal(rows[0].redirects, 5);
    assert.equal(rows[1].country_code, "RU");
  });

  test("rejects hourly buckets that are not aligned to the hour", async ({ assert }) => {
    const user = await owner();
    const code = await qr(user.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("redirect_hourly_stats").insert({
            user_id: user.id,
            qr_code_id: code.id,
            bucket_start: "2026-11-03T10:30:00.000Z",
            redirects: 1,
          }),
        ),
      /hourly_stats_bucket_check/,
    );
  });

  test("removes hourly stats with their QR", async ({ assert }) => {
    const user = await owner();
    const code = await qr(user.id);
    await db.rawQuery(upsertHourlyStat, [user.id, code.id, bucket, null, null, null, null, 4]);
    await db.from("qr_codes").where("id", code.id).delete();
    assert.isEmpty(await db.from("redirect_hourly_stats").where("qr_code_id", code.id));
  });

  test("rejects events with a foreign owner or another QR's destination", async ({ assert }) => {
    const first = await owner();
    const second = await owner();
    const code = await qr(first.id);
    const other = await qr(second.id);
    const target = await destination(other.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx
            .table("redirect_events")
            .insert({ user_id: second.id, qr_code_id: code.id, destination_id: target }),
        ),
      /events_qr_owner_fk/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx
            .table("redirect_events")
            .insert({ user_id: first.id, qr_code_id: code.id, destination_id: target }),
        ),
      /events_destination_fk/,
    );
  });

  test("represents independent pause, manual block, threat block and trash", async ({ assert }) => {
    const user = await owner();
    const code = await qr(user.id, {
      paused_at: new Date(),
      deleted_at: new Date(),
    });
    await db.table("qr_blocks").insert([
      { qr_code_id: code.id, kind: "manual", reason: "Manual test block" },
      { qr_code_id: code.id, kind: "threat", reason: "Threat test block" },
    ]);
    await db
      .from("qr_blocks")
      .where({ qr_code_id: code.id, kind: "threat" })
      .update({ released_at: new Date(Date.now() + 1000), release_reason: "Cleared test" });
    assert.lengthOf(
      await db.from("qr_blocks").where("qr_code_id", code.id).whereNull("released_at"),
      1,
    );
    const stored = await db.from("qr_codes").where("id", code.id).firstOrFail();
    assert.isNotNull(stored.paused_at);
    assert.isNotNull(stored.deleted_at);
  });

  test("deduplicates active jobs, validates leases and permits a new job after completion", async ({
    assert,
  }) => {
    const key = randomUUID();
    const id = randomUUID();
    await db.table("background_jobs").insert({ id, handler: "test", deduplication_key: key });
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("background_jobs").insert({ handler: "test", deduplication_key: key }),
        ),
      /jobs_active_deduplication/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.from("background_jobs").where("id", id).update({ status: "running" }),
        ),
      /jobs_lease_check/,
    );
    await db
      .from("background_jobs")
      .where("id", id)
      .update({
        status: "running",
        attempts: 1,
        locked_by: "worker-test",
        lease_expires_at: new Date(Date.now() + 60_000),
      });
    await db.from("background_jobs").where("id", id).update({
      status: "completed",
      locked_by: null,
      lease_expires_at: null,
      finished_at: new Date(),
    });
    await db.table("background_jobs").insert({ handler: "test", deduplication_key: key });
    assert.lengthOf(await db.from("background_jobs").where("deduplication_key", key), 2);
  });

  test("prevents duplicate notifications and cross-owner background work", async ({ assert }) => {
    const first = await owner();
    const second = await owner();
    const notification = await delivery(first.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("notification_deliveries").insert({
            user_id: first.id,
            kind: "test",
            recipient: first.email,
            encrypted_payload: "opaque",
            deduplication_key: notification,
          }),
        ),
      /notification_deliveries_deduplication_key_unique/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx
            .table("background_jobs")
            .insert({ user_id: second.id, notification_id: notification, handler: "test" }),
        ),
      /jobs_notification_owner_fk/,
    );
  });

  test("erases QR-dependent history and work while preserving a preset and reservation", async ({
    assert,
  }) => {
    const user = await owner();
    await db.table("design_presets").insert({
      user_id: user.id,
      name: "Preset",
      design_version: 1,
      design: {},
    });
    const code = await qr(user.id);
    await logo(user.id, code.id);
    const target = await destination(code.id, { status: "approved", activated_at: new Date() });
    const check = randomUUID();
    await db.table("link_checks").insert({
      id: check,
      qr_code_id: code.id,
      destination_id: target,
      trigger: "initial",
      status: "safe",
      checked_at: new Date(),
    });
    await db
      .table("qr_blocks")
      .insert({ qr_code_id: code.id, link_check_id: check, kind: "threat", reason: "Test block" });
    await db.table("complaints").insert({ qr_code_id: code.id, reason: "Test complaint" });
    await event(user.id, code.id, target);
    await db.rawQuery(upsertHourlyStat, [user.id, code.id, bucket, null, null, null, null, 1]);
    const notification = await delivery(user.id, { qr_code_id: code.id });
    await db.table("background_jobs").insert({
      user_id: user.id,
      qr_code_id: code.id,
      notification_id: notification,
      handler: "test",
    });
    await db.from("qr_codes").where("id", code.id).delete();
    assert.isEmpty(await db.from("qr_destinations").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("link_checks").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("qr_blocks").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("complaints").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("redirect_events").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("redirect_hourly_stats").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("notification_deliveries").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("background_jobs").where("qr_code_id", code.id));
    assert.isNull(await db.from("qr_logos").where("qr_code_id", code.id).first());
    assert.exists(await db.from("design_presets").where("user_id", user.id).first());
    assert.exists(await db.from("short_codes").where("code", code.code).first());
  });

  test("supports ordered account cleanup without losing the audit or reserved address", async ({
    assert,
  }) => {
    const user = await owner();
    const code = await qr(user.id);
    await logo(user.id, code.id);
    const target = await destination(code.id);
    await event(user.id, code.id, target);
    await db.table("design_presets").insert({
      user_id: user.id,
      name: "Preset",
      design_version: 1,
      design: {},
    });
    await db.table("audit_logs").insert({
      actor_user_id: user.id,
      action: "test",
      target_type: "qr_code",
      target_id: code.id,
      reason: "Test action",
    });
    await db.from("qr_codes").where("user_id", user.id).delete();
    await db.from("design_presets").where("user_id", user.id).delete();
    await db.from("users").where("id", user.id).delete();
    assert.isNull(await db.from("qr_codes").where("id", code.id).first());
    assert.isNull(await db.from("qr_logos").where("qr_code_id", code.id).first());
    assert.exists(await db.from("short_codes").where("code", code.code).first());
    const audit = await db.from("audit_logs").where("target_id", code.id).firstOrFail();
    assert.isNull(audit.actor_user_id);
  });
});
