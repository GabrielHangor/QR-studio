import { withAuthFinder } from "@adonisjs/auth/mixins/lucid";
import { compose } from "@adonisjs/core/helpers";
import hash from "@adonisjs/core/services/hash";
import { beforeSave, hasMany } from "@adonisjs/lucid/orm";
import type { LucidModel } from "@adonisjs/lucid/types/model";
import type { HasMany } from "@adonisjs/lucid/types/relations";

import { UserSchema } from "#database/schema";
import AccountActionToken from "#models/account_action_token";
import AuditLog from "#models/audit_log";
import BackgroundJob from "#models/background_job";
import Complaint from "#models/complaint";
import DesignPreset from "#models/design_preset";
import NotificationDelivery from "#models/notification_delivery";
import PaywallIntent from "#models/paywall_intent";
import QrBlock from "#models/qr_block";
import QrCode from "#models/qr_code";
import RedirectEvent from "#models/redirect_event";
import RedirectHourlyStat from "#models/redirect_hourly_stat";
import TrialApplication from "#models/trial_application";
import TrialExtension from "#models/trial_extension";

export enum UserRole {
  User = "user",
  Admin = "admin",
}

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  declare role: UserRole;

  @beforeSave()
  static normalizeEmail(user: User) {
    if (user.$dirty.email !== undefined) {
      user.email = user.email.trim().toLowerCase();
    }
  }

  static findForAuth<T extends LucidModel>(this: T, uids: string[], value: string) {
    return this.query()
      .where((query) => {
        for (const uid of uids) {
          if (uid === "email") {
            query.orWhereRaw("lower(btrim(??)) = lower(btrim(?))", [uid, value]);
          } else {
            query.orWhere(uid, value);
          }
        }
      })
      .first();
  }

  @hasMany(() => AccountActionToken)
  declare accountActionTokens: HasMany<typeof AccountActionToken>;

  @hasMany(() => TrialExtension)
  declare trialExtensions: HasMany<typeof TrialExtension>;

  @hasMany(() => TrialExtension, { foreignKey: "actorUserId" })
  declare authoredTrialExtensions: HasMany<typeof TrialExtension>;

  @hasMany(() => TrialApplication)
  declare trialApplications: HasMany<typeof TrialApplication>;

  @hasMany(() => PaywallIntent)
  declare paywallIntents: HasMany<typeof PaywallIntent>;

  @hasMany(() => DesignPreset)
  declare designPresets: HasMany<typeof DesignPreset>;

  @hasMany(() => QrCode)
  declare qrCodes: HasMany<typeof QrCode>;

  @hasMany(() => RedirectEvent)
  declare redirectEvents: HasMany<typeof RedirectEvent>;

  @hasMany(() => RedirectHourlyStat)
  declare redirectHourlyStats: HasMany<typeof RedirectHourlyStat>;

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
