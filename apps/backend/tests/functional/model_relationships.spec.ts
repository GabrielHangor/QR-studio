import { randomUUID } from "node:crypto";

import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

import BackgroundJob from "#models/background_job";
import QrBlock from "#models/qr_block";
import QrCode from "#models/qr_code";
import RedirectEvent from "#models/redirect_event";
import Session from "#models/session";
import ShortCode from "#models/short_code";
import User from "#models/user";

function account() {
  return User.create({ email: `${randomUUID()}@example.test`, password: "test-password-123" });
}

async function qrGraph() {
  const user = await account();
  const campaign = await user.related("campaigns").create({ name: "Campaign" });
  const logo = await user.related("assets").create({
    storageKey: `logos/${randomUUID()}.png`,
    mediaType: "image/png",
    byteSize: 1024,
    width: 32,
    height: 32,
    sha256: "a".repeat(64),
  });
  const reservation = await ShortCode.create({ code: randomUUID(), qrCodeId: randomUUID() });
  const qr = await user.related("qrCodes").create({
    id: reservation.qrCodeId,
    shortCode: reservation.code,
    name: "QR",
    campaignId: campaign.id,
    logoAssetId: logo.id,
    designVersion: 1,
    design: { color: "#000000" },
    encoding: {},
  });
  const destination = await qr.related("destinations").create({
    url: "HTTPS://example.test/path",
    status: "approved",
    activatedAt: DateTime.utc(),
  });
  return { user, campaign, logo, reservation, qr, destination };
}

test.group("Lucid model relationships", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("creates owned resources and preloads the library, QR and short-code reservation", async ({
    assert,
  }) => {
    const { user, campaign, logo, reservation, qr, destination } = await qrGraph();
    const otherUser = await account();
    const preset = await user.related("designPresets").create({
      name: "Preset",
      designVersion: 1,
      design: { color: "#123456" },
      logoAssetId: logo.id,
    });
    const loaded = await User.query()
      .where("id", user.id)
      .preload("assets")
      .preload("designPresets", (query) => query.preload("logoAsset"))
      .preload("campaigns", (query) => query.preload("qrCodes"))
      .preload("qrCodes", (query) =>
        query.preload("user").preload("campaign").preload("logoAsset").preload("destinations"),
      )
      .firstOrFail();

    assert.equal(loaded.assets[0].id, logo.id);
    assert.equal(loaded.designPresets[0].id, preset.id);
    assert.equal(loaded.designPresets[0].logoAsset?.id, logo.id);
    assert.equal(loaded.campaigns[0].qrCodes[0].id, qr.id);
    assert.equal(loaded.qrCodes[0].user.id, user.id);
    assert.equal(loaded.qrCodes[0].campaign?.id, campaign.id);
    assert.equal(loaded.qrCodes[0].logoAsset?.id, logo.id);
    assert.equal(loaded.qrCodes[0].destinations[0].id, destination.id);
    assert.deepEqual(loaded.qrCodes[0].design, { color: "#000000" });
    assert.isTrue(loaded.qrCodes[0].createdAt.isValid);
    assert.deepEqual(await otherUser.related("qrCodes").query(), []);

    const reserved = await ShortCode.findOrFail(reservation.code);
    await reserved.load("qrCode", (query) => query.preload("reservation"));
    assert.equal(reserved.qrCode?.id, qr.id);
    assert.equal(reserved.qrCode?.reservation.code, reservation.code);
    await logo.load("designPresets");
    await logo.load("qrCodes");
    assert.equal(logo.designPresets[0].id, preset.id);
    assert.equal(logo.qrCodes[0].id, qr.id);
  });

  test("loads moderation and account actions, retaining history after the actor is deleted", async ({
    assert,
  }) => {
    const { user, qr, destination } = await qrGraph();
    const actor = await account();
    const check = await destination.related("linkChecks").create({
      qrCodeId: qr.id,
      trigger: "manual",
      status: "unsafe",
      checkedAt: DateTime.utc(),
    });
    const block = await qr.related("blocks").create({
      kind: "threat",
      linkCheckId: check.id,
      createdByUserId: actor.id,
      reason: "Test threat",
    });
    const complaint = await qr.related("complaints").create({
      kind: "report",
      reason: "Test report",
      reporterUserId: actor.id,
      resolvedByUserId: actor.id,
      status: "resolved",
      resolution: "Reviewed",
      resolvedAt: DateTime.utc(),
    });
    const audit = await actor.related("auditLogs").create({
      action: "complaint.resolve",
      targetType: "complaint",
      targetId: complaint.id,
      reason: "Reviewed",
      metadata: {},
    });
    const extension = await user.related("trialExtensions").create({
      actorUserId: actor.id,
      previousEndsAt: DateTime.utc().plus({ days: 30 }),
      newEndsAt: DateTime.utc().plus({ days: 60 }),
      reason: "Test extension",
    });
    const token = await user.related("accountActionTokens").create({
      purpose: "email_verification",
      tokenHash: "a".repeat(64),
      email: user.email,
      expiresAt: DateTime.utc().plus({ hours: 1 }),
    });
    const loaded = await QrCode.query()
      .where("id", qr.id)
      .preload("linkChecks", (query) => query.preload("destination").preload("blocks"))
      .preload("blocks", (query) => query.preload("linkCheck").preload("createdBy"))
      .preload("complaints", (query) => query.preload("reporter").preload("resolvedBy"))
      .firstOrFail();
    assert.equal(loaded.linkChecks[0].destination.id, destination.id);
    assert.equal(loaded.linkChecks[0].blocks[0].id, block.id);
    assert.equal(loaded.blocks[0].linkCheck?.id, check.id);
    assert.equal(loaded.blocks[0].createdBy?.id, actor.id);
    assert.equal(loaded.complaints[0].reporter?.id, actor.id);
    assert.equal(loaded.complaints[0].resolvedBy?.id, actor.id);
    await actor.load("authoredTrialExtensions");
    assert.equal(actor.authoredTrialExtensions[0].id, extension.id);
    await token.load("user");
    assert.equal(token.user.id, user.id);

    await actor.delete();
    const orphanedBlock = await QrBlock.query()
      .where("id", block.id)
      .preload("createdBy")
      .firstOrFail();
    assert.isNull(orphanedBlock.createdBy);
    await extension.refresh();
    await extension.load("actor");
    assert.isNull(extension.actor);
    await audit.refresh();
    await audit.load("actor");
    assert.isNull(audit.actor);
    assert.equal(audit.targetId, complaint.id);
  });

  test("loads analytics and background work, then keeps only the reservation after QR cleanup", async ({
    assert,
  }) => {
    const { user, campaign, qr, destination, reservation } = await qrGraph();
    const event = await destination.related("redirectEvents").create({
      userId: user.id,
      qrCodeId: qr.id,
      campaignId: campaign.id,
      visitorKey: "b".repeat(64),
      countryCode: "RU",
      latitude: "55.750000",
      longitude: "37.620000",
    });
    const notification = await user.related("notificationDeliveries").create({
      qrCodeId: qr.id,
      kind: "test_notification",
      recipient: user.email,
      encryptedPayload: "opaque-encrypted-test-payload",
      deduplicationKey: randomUUID(),
    });
    const job = await notification.related("backgroundJobs").create({
      userId: user.id,
      qrCodeId: qr.id,
      handler: "send_notification",
      payload: { notificationId: notification.id },
    });
    const loadedJob = await BackgroundJob.query()
      .where("id", job.id)
      .preload("user")
      .preload("qrCode")
      .preload("notification", (query) => query.preload("backgroundJobs"))
      .firstOrFail();
    assert.equal(loadedJob.user?.id, user.id);
    assert.equal(loadedJob.qrCode?.id, qr.id);
    assert.equal(loadedJob.notification?.backgroundJobs[0].id, job.id);
    assert.deepEqual(loadedJob.payload, { notificationId: notification.id });
    assert.equal(loadedJob.status, "pending");
    const loadedEvent = await RedirectEvent.query()
      .where("id", String(event.id))
      .preload("user")
      .preload("qrCode")
      .preload("campaign")
      .preload("destination")
      .firstOrFail();
    assert.equal(loadedEvent.user.id, user.id);
    assert.equal(loadedEvent.qrCode.id, qr.id);
    assert.equal(loadedEvent.campaign?.id, campaign.id);
    assert.equal(loadedEvent.destination.id, destination.id);
    const session = await Session.create({
      id: randomUUID(),
      userId: String(user.id),
      data: "{}",
      expiresAt: DateTime.utc().plus({ hours: 1 }),
    });
    assert.equal((await Session.findOrFail(session.id)).userId, String(user.id));

    await qr.delete();
    assert.isNull(await RedirectEvent.find(event.id));
    assert.isNull(await BackgroundJob.find(job.id));
    await reservation.refresh();
    await reservation.load("qrCode");
    assert.isNull(reservation.qrCode);
    assert.equal(reservation.qrCodeId, qr.id);
  });
});
