import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("assets", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.text("storage_key").notNullable().unique();
      table
        .string("media_type", 32)
        .notNullable()
        .checkIn(["image/png", "image/jpeg", "image/webp"], "assets_media_type_check");
      table.bigInteger("byte_size").notNullable().checkPositive("assets_byte_size_check");
      table.integer("width").notNullable().checkPositive("assets_width_check");
      table.integer("height").notNullable().checkPositive("assets_height_check");
      table.string("sha256", 64).notNullable().checkRegex("^[0-9a-f]{64}$", "assets_hash_check");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["user_id", "id"]);
      table.index(["user_id", "created_at"]);
      table.check("length(btrim(storage_key)) > 0", [], "assets_storage_key_check");
    });

    this.schema.createTable("campaigns", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.string("name", 200).notNullable();
      table.timestamp("archived_at", { useTz: true });
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["user_id", "id"]);
      table.index(["user_id", "archived_at", "created_at"]);
      table.check("length(btrim(name)) > 0", [], "campaigns_name_check");
    });

    this.schema.createTable("design_presets", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.string("name", 200).notNullable();
      table.integer("design_version").notNullable().checkPositive("presets_design_version_check");
      table.jsonb("design").notNullable();
      table.uuid("logo_asset_id");
      table
        .foreign(["user_id", "logo_asset_id"], "presets_logo_owner_fk")
        .references(["user_id", "id"])
        .inTable("assets")
        .onDelete("NO ACTION");
      table.index(["user_id", "created_at"]);
      table.index("logo_asset_id");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.check("length(btrim(name)) > 0", [], "presets_name_check");
      table.check("jsonb_typeof(design) = 'object'", [], "presets_design_check");
    });
  }

  async down() {
    this.schema.dropTable("design_presets");
    this.schema.dropTable("campaigns");
    this.schema.dropTable("assets");
  }
}
