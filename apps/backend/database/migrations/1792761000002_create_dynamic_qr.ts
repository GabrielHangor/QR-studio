import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    // No owner or payload: reservations survive all account/QR data cleanup.
    this.schema.createTable("short_codes", (table) => {
      table.string("code", 64).primary().checkRegex("^[A-Za-z0-9_-]+$", "short_codes_format_check");
      table.uuid("qr_code_id").notNullable().unique();
      table.unique(["code", "qr_code_id"]);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
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
      table.integer("design_version").notNullable().checkPositive("qr_codes_design_version_check");
      table.jsonb("design").notNullable();
      table.jsonb("encoding").notNullable();
      table.timestamp("paused_at", { useTz: true });
      table.timestamp("deleted_at", { useTz: true });
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["user_id", "id"]);
      table.index(["user_id", "deleted_at", "created_at"]);
      table.check("length(btrim(name)) > 0", [], "qr_codes_name_check");
      table.check(
        "jsonb_typeof(design) = 'object' AND jsonb_typeof(encoding) = 'object'",
        [],
        "qr_codes_design_check",
      );
    });

    // Personal logo of a dynamic QR; deleted together with the QR.
    this.schema.createTable("qr_logos", (table) => {
      table.uuid("qr_code_id").primary();
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table
        .foreign(["user_id", "qr_code_id"], "qr_logos_qr_owner_fk")
        .references(["user_id", "id"])
        .inTable("qr_codes")
        .onDelete("CASCADE");
      table.text("storage_key").notNullable().unique();
      table
        .string("media_type", 32)
        .notNullable()
        .checkIn(["image/png", "image/jpeg", "image/webp"], "qr_logos_media_type_check");
      table.bigInteger("byte_size").notNullable().checkPositive("qr_logos_byte_size_check");
      table.integer("width").notNullable().checkPositive("qr_logos_width_check");
      table.integer("height").notNullable().checkPositive("qr_logos_height_check");
      table.string("sha256", 64).notNullable().checkRegex("^[0-9a-f]{64}$", "qr_logos_hash_check");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.check("length(btrim(storage_key)) > 0", [], "qr_logos_storage_key_check");
    });

    this.schema.createTable("qr_destinations", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.uuid("qr_code_id").notNullable().references("qr_codes.id").onDelete("CASCADE");
      table
        .text("url")
        .notNullable()
        .checkRegex("^[hH][tT][tT][pP][sS]{0,1}://", "destinations_url_check");
      table
        .string("status", 20)
        .notNullable()
        .defaultTo("pending")
        .checkIn(["pending", "approved", "rejected", "cancelled"], "destinations_status_check");
      table.timestamp("activated_at", { useTz: true });
      table.timestamp("retired_at", { useTz: true });
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["qr_code_id", "id"]);
      table.index(["qr_code_id", "created_at"]);
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
      table.unique(["qr_code_id"], {
        indexName: "destinations_one_active",
        useConstraint: false,
        predicate: this.knex().whereNotNull("activated_at").whereNull("retired_at"),
      });
      table.unique(["qr_code_id"], {
        indexName: "destinations_one_pending",
        useConstraint: false,
        predicate: this.knex().whereRaw("status = 'pending'"),
      });
    });
  }

  async down() {
    this.schema.dropTable("qr_logos");
    this.schema.dropTable("qr_destinations");
    this.schema.dropTable("qr_codes");
    this.schema.dropTable("short_codes");
    this.schema.raw("DROP FUNCTION protect_short_code_reservations()");
  }
}
