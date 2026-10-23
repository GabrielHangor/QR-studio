import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("redirect_events", (table) => {
      table.bigIncrements("id");
      table.integer("user_id").notNullable();
      table.uuid("qr_code_id").notNullable();
      table.uuid("destination_id").notNullable();
      table.uuid("campaign_id");
      table.timestamp("occurred_at", { useTz: true }).notNullable().defaultTo(this.now());
      // Account-scoped HMAC of the random visitor cookie; null means not identified.
      table.string("visitor_key", 64);
      table.string("country_code", 2);
      table.text("region");
      table.text("city");
      table.decimal("latitude", 9, 6);
      table.decimal("longitude", 9, 6);
      table.string("device_type", 32);
      table.string("os_name", 100);
      table.string("browser_name", 100);
      table.boolean("is_bot");
      table
        .foreign(["user_id", "qr_code_id"], "events_qr_owner_fk")
        .references(["user_id", "id"])
        .inTable("qr_codes")
        .onDelete("CASCADE");
      table
        .foreign(["qr_code_id", "destination_id"], "events_destination_fk")
        .references(["qr_code_id", "id"])
        .inTable("qr_destinations")
        .onDelete("CASCADE");
      table
        .foreign(["user_id", "campaign_id"], "events_campaign_owner_fk")
        .references(["user_id", "id"])
        .inTable("campaigns");
      table.index(["user_id", "occurred_at"]);
      table.index(["qr_code_id", "occurred_at"]);
      table.index("destination_id");
      table.check(
        "visitor_key IS NULL OR visitor_key ~ '^[0-9a-f]{64}$'",
        [],
        "events_visitor_key_check",
      );
      table.check(
        "country_code IS NULL OR country_code ~ '^[A-Z]{2}$'",
        [],
        "events_country_check",
      );
      table.check(
        "(latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
        [],
        "events_coordinates_check",
      );
    });
    this.schema.raw(
      "CREATE INDEX events_campaign_time_index ON redirect_events (campaign_id, occurred_at) WHERE campaign_id IS NOT NULL",
    );
    this.schema.raw(
      "CREATE INDEX events_visitor_time_index ON redirect_events (user_id, visitor_key, occurred_at) WHERE visitor_key IS NOT NULL",
    );
  }

  async down() {
    this.schema.dropTable("redirect_events");
  }
}
