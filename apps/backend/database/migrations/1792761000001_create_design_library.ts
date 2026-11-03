import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("design_presets", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.string("name", 200).notNullable();
      table.integer("design_version").notNullable().checkPositive("presets_design_version_check");
      table.jsonb("design").notNullable();
      table.index(["user_id", "created_at"]);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.check("length(btrim(name)) > 0", [], "presets_name_check");
      table.check("jsonb_typeof(design) = 'object'", [], "presets_design_check");
    });
  }

  async down() {
    this.schema.dropTable("design_presets");
  }
}
