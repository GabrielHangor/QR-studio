import { belongsTo, hasMany, hasOne } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany, HasOne } from "@adonisjs/lucid/types/relations";

import { QrCodeSchema } from "#database/schema";
import Complaint from "#models/complaint";
import LinkCheck from "#models/link_check";
import NotificationDelivery from "#models/notification_delivery";
import QrBlock from "#models/qr_block";
import QrDestination from "#models/qr_destination";
import QrLogo from "#models/qr_logo";
import RedirectEvent from "#models/redirect_event";
import RedirectHourlyStat from "#models/redirect_hourly_stat";
import ShortCode from "#models/short_code";
import User from "#models/user";

export default class QrCode extends QrCodeSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => ShortCode, { foreignKey: "shortCode", localKey: "code" })
  declare reservation: BelongsTo<typeof ShortCode>;

  @hasOne(() => QrLogo)
  declare logo: HasOne<typeof QrLogo> | null;

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

  @hasMany(() => RedirectHourlyStat)
  declare hourlyStats: HasMany<typeof RedirectHourlyStat>;

  @hasMany(() => NotificationDelivery)
  declare notificationDeliveries: HasMany<typeof NotificationDelivery>;
}
