import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

import { QrCodeSchema } from "#database/schema";
import Asset from "#models/asset";
import BackgroundJob from "#models/background_job";
import Campaign from "#models/campaign";
import Complaint from "#models/complaint";
import LinkCheck from "#models/link_check";
import NotificationDelivery from "#models/notification_delivery";
import QrBlock from "#models/qr_block";
import QrDestination from "#models/qr_destination";
import RedirectEvent from "#models/redirect_event";
import ShortCode from "#models/short_code";
import User from "#models/user";

export default class QrCode extends QrCodeSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign> | null;

  @belongsTo(() => Asset, { foreignKey: "logoAssetId" })
  declare logoAsset: BelongsTo<typeof Asset> | null;

  @belongsTo(() => ShortCode, { foreignKey: "shortCode", localKey: "code" })
  declare reservation: BelongsTo<typeof ShortCode>;

  @hasMany(() => QrDestination)
  declare destinations: HasMany<typeof QrDestination>;

  @hasMany(() => LinkCheck)
  declare linkChecks: HasMany<typeof LinkCheck>;

  @hasMany(() => QrBlock)
  declare blocks: HasMany<typeof QrBlock>;

  @hasMany(() => Complaint)
  declare complaints: HasMany<typeof Complaint>;

  @hasMany(() => RedirectEvent)
  declare redirectEvents: HasMany<typeof RedirectEvent>;

  @hasMany(() => NotificationDelivery)
  declare notificationDeliveries: HasMany<typeof NotificationDelivery>;

  @hasMany(() => BackgroundJob)
  declare backgroundJobs: HasMany<typeof BackgroundJob>;
}
