import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    // Ring buffer kept for 7 days; reports read the hourly aggregates instead.
    this.schema.createTable("redirect_events", (table) => {
      table.bigIncrements("id");
      table.integer("user_id").notNullable();
      table.uuid("qr_code_id").notNullable();
      table.uuid("destination_id").notNullable();
      table.timestamp("occurred_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("aggregated_at", { useTz: true });
      table.string("country_code", 2).checkRegex("^[A-Z]{2}$", "events_country_check");
      table.text("city");
      table.string("device_type", 32);
      table.string("os_name", 100);
      table.boolean("is_bot").notNullable().defaultTo(false);
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
      table.index(["qr_code_id", "occurred_at"]);
      table.index("destination_id");
      table.index(["occurred_at"], "events_occurred_at_index");
      table.index(["occurred_at"], "events_unaggregated_index", {
        predicate: this.knex().whereNull("aggregated_at"),
      });
    });

    this.schema.createTable("redirect_hourly_stats", (table) => {
      // Bots are excluded here; NULL dimensions are a separate category (NULLS NOT DISTINCT below).
      table.bigIncrements("id");
      table.integer("user_id").notNullable();
      table.uuid("qr_code_id").notNullable();
      table
        .foreign(["user_id", "qr_code_id"], "hourly_stats_qr_owner_fk")
        .references(["user_id", "id"])
        .inTable("qr_codes")
        .onDelete("CASCADE");
      table.timestamp("bucket_start", { useTz: true }).notNullable();
      table.string("country_code", 2).checkRegex("^[A-Z]{2}$", "hourly_stats_country_check");
      table.text("city");
      table.string("device_type", 32);
      table.string("os_name", 100);
      table.integer("redirects").notNullable().checkPositive("hourly_stats_redirects_check");
      table.check(
        "bucket_start = date_trunc('hour', bucket_start, 'UTC')",
        [],
        "hourly_stats_bucket_check",
      );
      table.index(["user_id", "bucket_start"]);
      table.index(["qr_code_id", "bucket_start"]);
    });

    this.schema.raw(`
      CREATE UNIQUE INDEX hourly_stats_dimensions_unique
      ON redirect_hourly_stats (qr_code_id, bucket_start, country_code, city, device_type, os_name)
      NULLS NOT DISTINCT
    `);
  }

  async down() {
    this.schema.dropTable("redirect_hourly_stats");
    this.schema.dropTable("redirect_events");
  }
}
