import { withAuthFinder } from "@adonisjs/auth/mixins/lucid";
import { compose } from "@adonisjs/core/helpers";
import hash from "@adonisjs/core/services/hash";
import { hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";

import { UserSchema } from "#database/schema";
import AccountActionToken from "#models/account_action_token";
import Asset from "#models/asset";
import AuditLog from "#models/audit_log";
import BackgroundJob from "#models/background_job";
import Campaign from "#models/campaign";
import Complaint from "#models/complaint";
import DesignPreset from "#models/design_preset";
import NotificationDelivery from "#models/notification_delivery";
import QrBlock from "#models/qr_block";
import QrCode from "#models/qr_code";
import RedirectEvent from "#models/redirect_event";
import TrialExtension from "#models/trial_extension";

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @hasMany(() => AccountActionToken)
  declare accountActionTokens: HasMany<typeof AccountActionToken>;

  @hasMany(() => TrialExtension)
  declare trialExtensions: HasMany<typeof TrialExtension>;

  @hasMany(() => TrialExtension, { foreignKey: "actorUserId" })
  declare authoredTrialExtensions: HasMany<typeof TrialExtension>;

  @hasMany(() => Asset)
  declare assets: HasMany<typeof Asset>;

  @hasMany(() => Campaign)
  declare campaigns: HasMany<typeof Campaign>;

  @hasMany(() => DesignPreset)
  declare designPresets: HasMany<typeof DesignPreset>;

  @hasMany(() => QrCode)
  declare qrCodes: HasMany<typeof QrCode>;

  @hasMany(() => RedirectEvent)
  declare redirectEvents: HasMany<typeof RedirectEvent>;

  @hasMany(() => NotificationDelivery)
  declare notificationDeliveries: HasMany<typeof NotificationDelivery>;

  @hasMany(() => BackgroundJob)
  declare backgroundJobs: HasMany<typeof BackgroundJob>;

  @hasMany(() => QrBlock, { foreignKey: "createdByUserId" })
  declare createdQrBlocks: HasMany<typeof QrBlock>;

  @hasMany(() => QrBlock, { foreignKey: "releasedByUserId" })
  declare releasedQrBlocks: HasMany<typeof QrBlock>;

  @hasMany(() => Complaint, { foreignKey: "reporterUserId" })
  declare reportedComplaints: HasMany<typeof Complaint>;

  @hasMany(() => Complaint, { foreignKey: "resolvedByUserId" })
  declare resolvedComplaints: HasMany<typeof Complaint>;

  @hasMany(() => AuditLog, { foreignKey: "actorUserId" })
  declare auditLogs: HasMany<typeof AuditLog>;

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(" ") : this.email.split("@");

    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }

    return `${first.slice(0, 2)}`.toUpperCase();
  }
}
