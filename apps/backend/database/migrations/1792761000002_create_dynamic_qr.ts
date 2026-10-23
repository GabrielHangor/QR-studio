import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    // No owner or payload: reservations survive all account/QR data cleanup.
    this.schema.createTable("short_codes", (table) => {
      table.string("code", 64).primary();
      table.uuid("qr_code_id").notNullable().unique();
      table.unique(["code", "qr_code_id"]);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.check("code ~ '^[A-Za-z0-9_-]+$'", [], "short_codes_format_check");
    });

    this.schema.raw(`
      CREATE FUNCTION protect_short_code_reservations() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Short code reservations are permanent' USING ERRCODE = '23514';
      END;
      $$
    `);
    this.schema.raw(
      "CREATE TRIGGER short_codes_immutable BEFORE UPDATE OR DELETE ON short_codes FOR EACH ROW EXECUTE FUNCTION protect_short_code_reservations()",
    );

    this.schema.createTable("qr_codes", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.string("short_code", 64).notNullable().unique();
      table
        .foreign(["short_code", "id"], "qr_reserved_code_fk")
        .references(["code", "qr_code_id"])
        .inTable("short_codes");
      table.string("name", 200).notNullable();
      table.uuid("campaign_id");
      table.uuid("logo_asset_id");
      table.integer("design_version").notNullable();
      table.jsonb("design").notNullable();
      table.jsonb("encoding").notNullable();
      table.timestamp("paused_at", { useTz: true });
      table.timestamp("deleted_at", { useTz: true });
      table.timestamp("purge_after", { useTz: true }).index();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["user_id", "id"]);
      table
        .foreign(["user_id", "campaign_id"], "qr_campaign_owner_fk")
        .references(["user_id", "id"])
        .inTable("campaigns")
        .onDelete("NO ACTION");
      table
        .foreign(["user_id", "logo_asset_id"], "qr_logo_owner_fk")
        .references(["user_id", "id"])
        .inTable("assets")
        .onDelete("NO ACTION");
      table.index(["user_id", "deleted_at", "created_at"]);
      table.index("campaign_id");
      table.index("logo_asset_id");
      table.check("length(btrim(name)) > 0", [], "qr_codes_name_check");
      table.check(
        "design_version > 0 AND jsonb_typeof(design) = 'object' AND jsonb_typeof(encoding) = 'object'",
        [],
        "qr_codes_design_check",
      );
      table.check(
        "(deleted_at IS NULL AND purge_after IS NULL) OR (deleted_at IS NOT NULL AND purge_after IS NOT NULL AND purge_after >= deleted_at)",
        [],
        "qr_codes_deletion_dates_check",
      );
    });

    this.schema.createTable("qr_destinations", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.uuid("qr_code_id").notNullable().references("qr_codes.id").onDelete("CASCADE");
      table.text("url").notNullable();
      table.string("status", 20).notNullable().defaultTo("pending");
      table.timestamp("activated_at", { useTz: true });
      table.timestamp("retired_at", { useTz: true });
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["qr_code_id", "id"]);
      table.index(["qr_code_id", "created_at"]);
      table.check(
        "status IN ('pending', 'approved', 'rejected', 'cancelled')",
        [],
        "destinations_status_check",
      );
      table.check("url ~* '^https{0,1}://'", [], "destinations_url_check");
      table.check(
        "activated_at IS NULL OR status = 'approved'",
        [],
        "destinations_activation_check",
      );
      table.check(
        "retired_at IS NULL OR (activated_at IS NOT NULL AND retired_at >= activated_at)",
        [],
        "destinations_retirement_check",
      );
    });
    this.schema.raw(
      "CREATE UNIQUE INDEX destinations_one_active ON qr_destinations (qr_code_id) WHERE activated_at IS NOT NULL AND retired_at IS NULL",
    );
    this.schema.raw(
      "CREATE UNIQUE INDEX destinations_one_pending ON qr_destinations (qr_code_id) WHERE status = 'pending'",
    );
  }

  async down() {
    this.schema.dropTable("qr_destinations");
    this.schema.dropTable("qr_codes");
    this.schema.dropTable("short_codes");
    this.schema.raw("DROP FUNCTION protect_short_code_reservations()");
  }
}
