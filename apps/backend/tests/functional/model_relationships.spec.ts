import { randomUUID } from "node:crypto";

import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

import { AccountActionTokenPurpose } from "#models/account_action_token";
import { AuditLogTargetType } from "#models/audit_log";
import { ComplaintKind, ComplaintStatus } from "#models/complaint";
import { LinkCheckStatus, LinkCheckTrigger } from "#models/link_check";
import { NotificationDeliveryKind } from "#models/notification_delivery";
import { PaywallOption } from "#models/paywall_intent";
import QrBlock, { QrBlockKind } from "#models/qr_block";
import QrCode from "#models/qr_code";
import { QrDestinationStatus } from "#models/qr_destination";
import { QrLogoMediaType } from "#models/qr_logo";
import RedirectEvent from "#models/redirect_event";
import RedirectHourlyStat from "#models/redirect_hourly_stat";
import Session from "#models/session";
import ShortCode from "#models/short_code";
import { TrialApplicationStatus } from "#models/trial_application";
import User, { UserRole } from "#models/user";

function account() {
  return User.create({ email: `${randomUUID()}@example.test`, password: "test-password-123" });
}

async function qrGraph() {
  const user = await account();
  const reservation = await ShortCode.create({ code: randomUUID(), qrCodeId: randomUUID() });
  const qr = await user.related("qrCodes").create({
    id: reservation.qrCodeId,
    shortCode: reservation.code,
    name: "QR",
    designVersion: 1,
    design: { color: "#000000" },
    encoding: {},
  });
  const logo = await qr.related("logo").create({
    userId: user.id,
    storageKey: `logos/${randomUUID()}.png`,
    mediaType: QrLogoMediaType.Png,
    byteSize: 1024,
    width: 32,
    height: 32,
    sha256: "a".repeat(64),
  });
  const destination = await qr.related("destinations").create({
    url: "HTTPS://example.test/path",
    status: QrDestinationStatus.Approved,
    activatedAt: DateTime.utc(),
  });
  return { user, logo, reservation, qr, destination };
}

test.group("Lucid model relationships", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("creates owned resources and preloads the library, QR logo and short-code reservation", async ({
    assert,
  }) => {
    const { user, logo, reservation, qr, destination } = await qrGraph();
    const otherUser = await account();
    const preset = await user.related("designPresets").create({
      name: "Preset",
      designVersion: 1,
      design: { color: "#123456" },
    });
    const loaded = await User.query()
      .where("id", user.id)
      .preload("designPresets")
      .preload("qrCodes", (query) =>
        query.preload("user").preload("logo").preload("destinations").preload("hourlyStats"),
      )
      .firstOrFail();

    assert.equal(loaded.role, UserRole.User);
    assert.equal(loaded.designPresets[0].id, preset.id);
    assert.equal(loaded.qrCodes[0].user.id, user.id);
    assert.equal(loaded.qrCodes[0].logo?.qrCodeId, logo.qrCodeId);
    assert.equal(loaded.qrCodes[0].destinations[0].id, destination.id);
    assert.deepEqual(loaded.qrCodes[0].design, { color: "#000000" });
    assert.isTrue(loaded.qrCodes[0].createdAt.isValid);
    assert.deepEqual(await otherUser.related("qrCodes").query(), []);

    const reserved = await ShortCode.findOrFail(reservation.code);
    await reserved.load("qrCode", (query) => query.preload("reservation"));
    assert.equal(reserved.qrCode?.id, qr.id);
    assert.equal(reserved.qrCode?.reservation.code, reservation.code);
    await logo.load("qrCode");
    assert.equal(logo.qrCode.id, qr.id);
    await logo.load("user");
    assert.equal(logo.user.id, user.id);
  });

  test("loads moderation, account actions and paywall intents, retaining history after the actor is deleted", async ({
    assert,
  }) => {
    const { user, qr, destination } = await qrGraph();
    const actor = await account();
    const check = await destination.related("linkChecks").create({
      qrCodeId: qr.id,
      trigger: LinkCheckTrigger.Manual,
      status: LinkCheckStatus.Unsafe,
      checkedAt: DateTime.utc(),
    });
    const block = await qr.related("blocks").create({
      kind: QrBlockKind.Threat,
      linkCheckId: check.id,
      createdByUserId: actor.id,
      reason: "Test threat",
    });
    const complaint = await qr.related("complaints").create({
      kind: ComplaintKind.Report,
      reason: "Test report",
      reporterUserId: actor.id,
      resolvedByUserId: actor.id,
      status: ComplaintStatus.Resolved,
      resolution: "Reviewed",
      resolvedAt: DateTime.utc(),
    });
    const audit = await actor.related("auditLogs").create({
      action: "complaint.resolve",
      targetType: AuditLogTargetType.Complaint,
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
    const application = await user.related("trialApplications").create({
      purpose: "Dynamic QR for a menu",
      status: TrialApplicationStatus.Approved,
      decidedAt: DateTime.utc(),
      decidedByUserId: actor.id,
    });
    const paywallIntent = await user.related("paywallIntents").create({
      option: PaywallOption.OneTime,
      priceMinor: 99000,
      currency: "RUB",
    });
    const token = await user.related("accountActionTokens").create({
      purpose: AccountActionTokenPurpose.EmailVerification,
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
    await user.load("trialApplications");
    assert.equal(user.trialApplications[0].id, application.id);
    await application.load("decidedBy");
    assert.equal(application.decidedBy?.id, actor.id);
    await user.load("paywallIntents");
    assert.equal(user.paywallIntents[0].id, paywallIntent.id);
    assert.equal(user.paywallIntents[0].option, PaywallOption.OneTime);

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
    await application.refresh();
    await application.load("decidedBy");
    assert.isNull(application.decidedBy);
  });

  test("loads hourly stats and background work, then keeps only the reservation after QR cleanup", async ({
    assert,
  }) => {
    const { user, qr, destination, reservation } = await qrGraph();
    const event = await destination.related("redirectEvents").create({
      userId: user.id,
      qrCodeId: qr.id,
      countryCode: "RU",
    });
    const hourly = await qr.related("hourlyStats").create({
      userId: user.id,
      bucketStart: DateTime.utc(2026, 11, 3, 10),
      countryCode: "RU",
      city: null,
      deviceType: null,
      osName: null,
      redirects: 3,
    });
    await user.related("notificationDeliveries").create({
      qrCodeId: qr.id,
      kind: NotificationDeliveryKind.EmailVerification,
      recipient: user.email,
      encryptedPayload: "opaque-encrypted-test-payload",
      deduplicationKey: randomUUID(),
    });
    const loadedEvent = await RedirectEvent.query()
      .where("id", String(event.id))
      .preload("user")
      .preload("qrCode")
      .preload("destination")
      .firstOrFail();
    assert.equal(loadedEvent.user.id, user.id);
    assert.equal(loadedEvent.qrCode.id, qr.id);
    assert.equal(loadedEvent.destination.id, destination.id);
    assert.isFalse(loadedEvent.isBot);
    const loadedHourly = await RedirectHourlyStat.query()
      .where("id", String(hourly.id))
      .preload("user")
      .preload("qrCode")
      .firstOrFail();
    assert.equal(loadedHourly.user.id, user.id);
    assert.equal(loadedHourly.qrCode.id, qr.id);
    assert.equal(loadedHourly.redirects, 3);
    const session = await Session.create({
      id: randomUUID(),
      userId: String(user.id),
      data: "{}",
      expiresAt: DateTime.utc().plus({ hours: 1 }),
    });
    assert.equal((await Session.findOrFail(session.id)).userId, String(user.id));

    await qr.delete();
    assert.isNull(await RedirectEvent.find(event.id));
    assert.isNull(await RedirectHourlyStat.find(hourly.id));
    await reservation.refresh();
    await reservation.load("qrCode");
    assert.isNull(reservation.qrCode);
    assert.equal(reservation.qrCodeId, qr.id);
  });
});
