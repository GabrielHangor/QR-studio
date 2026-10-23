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

async function campaign(userId: number) {
  const id = randomUUID();
  await db.table("campaigns").insert({ id, user_id: userId, name: "Campaign" });
  return id;
}

async function asset(userId: number) {
  const id = randomUUID();
  await db.table("assets").insert({
    id,
    user_id: userId,
    storage_key: `logos/${id}.png`,
    media_type: "image/png",
    byte_size: 1024,
    width: 32,
    height: 32,
    sha256: "a".repeat(64),
  });
  return id;
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

  test("prevents presets and QR codes from using another owner's logo or campaign", async ({
    assert,
  }) => {
    const first = await owner();
    const second = await owner();
    const logo = await asset(second.id);
    const otherCampaign = await campaign(second.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.table("design_presets").insert({
            user_id: first.id,
            name: "Invalid",
            design_version: 1,
            design: {},
            logo_asset_id: logo,
          }),
        ),
      /presets_logo_owner_fk/,
    );
    const code = await qr(first.id);
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.from("qr_codes").where("id", code.id).update({ logo_asset_id: logo }),
        ),
      /qr_logo_owner_fk/,
    );
    await assert.rejects(
      () =>
        rejectedWrite((trx) =>
          trx.from("qr_codes").where("id", code.id).update({ campaign_id: otherCampaign }),
        ),
      /qr_campaign_owner_fk/,
    );
  });

  test("keeps referenced logos even when their QR is in the trash", async ({ assert }) => {
    const user = await owner();
    const logo = await asset(user.id);
    const code = await qr(user.id, {
      logo_asset_id: logo,
      deleted_at: new Date(),
      purge_after: new Date(Date.now() + 60_000),
    });
    await assert.rejects(
      () => rejectedWrite((trx) => trx.from("assets").where("id", logo).delete()),
      /qr_logo_owner_fk/,
    );
    await db.from("qr_codes").where("id", code.id).delete();
    await db.from("assets").where("id", logo).delete();
    assert.isNull(await db.from("assets").where("id", logo).first());
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

  test("keeps event campaign history when a QR moves and the old campaign is archived", async ({
    assert,
  }) => {
    const user = await owner();
    const first = await campaign(user.id);
    const second = await campaign(user.id);
    const code = await qr(user.id, { campaign_id: first });
    const target = await destination(code.id, { status: "approved", activated_at: new Date() });
    await event(user.id, code.id, target, { campaign_id: first });
    await db.from("qr_codes").where("id", code.id).update({ campaign_id: second });
    await db.from("campaigns").where("id", first).update({ archived_at: new Date() });
    await event(user.id, code.id, target, { campaign_id: second });
    const events = await db.from("redirect_events").where("qr_code_id", code.id).orderBy("id");
    assert.deepEqual(
      events.map((row) => row.campaign_id),
      [first, second],
    );
    await assert.rejects(
      () => rejectedWrite((trx) => trx.from("campaigns").where("id", first).delete()),
      /events_campaign_owner_fk/,
    );
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
      purge_after: new Date(Date.now() + 60_000),
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

  test("erases QR-dependent history and work while preserving a preset logo and reservation", async ({
    assert,
  }) => {
    const user = await owner();
    const logo = await asset(user.id);
    await db.table("design_presets").insert({
      user_id: user.id,
      name: "Preset",
      design_version: 1,
      design: {},
      logo_asset_id: logo,
    });
    const code = await qr(user.id, { logo_asset_id: logo });
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
    assert.isEmpty(await db.from("notification_deliveries").where("qr_code_id", code.id));
    assert.isEmpty(await db.from("background_jobs").where("qr_code_id", code.id));
    assert.exists(await db.from("assets").where("id", logo).first());
    assert.exists(await db.from("short_codes").where("code", code.code).first());
  });

  test("supports ordered account cleanup without losing the audit or reserved address", async ({
    assert,
  }) => {
    const user = await owner();
    const logo = await asset(user.id);
    const groupId = await campaign(user.id);
    const code = await qr(user.id, { logo_asset_id: logo, campaign_id: groupId });
    const target = await destination(code.id);
    await event(user.id, code.id, target, { campaign_id: groupId });
    await db.table("design_presets").insert({
      user_id: user.id,
      name: "Preset",
      design_version: 1,
      design: {},
      logo_asset_id: logo,
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
    assert.isNull(await db.from("assets").where("id", logo).first());
    assert.exists(await db.from("short_codes").where("code", code.code).first());
    const audit = await db.from("audit_logs").where("target_id", code.id).firstOrFail();
    assert.isNull(audit.actor_user_id);
  });
});
