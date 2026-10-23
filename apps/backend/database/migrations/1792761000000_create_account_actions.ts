import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("account_action_tokens", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table
        .string("purpose", 32)
        .notNullable()
        .checkIn(["email_verification", "password_reset"], "account_tokens_purpose_check");
      table
        .string("token_hash", 64)
        .notNullable()
        .unique()
        .checkRegex("^[0-9a-f]{64}$", "account_tokens_hash_check");
      table.string("email", 254).notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("expires_at", { useTz: true }).notNullable().index();
      table.timestamp("consumed_at", { useTz: true });
      table.timestamp("revoked_at", { useTz: true });
      table.index(["user_id", "purpose"]);
      table.check("expires_at > created_at", [], "account_tokens_expiry_check");
      table.check("consumed_at IS NULL OR revoked_at IS NULL", [], "account_tokens_terminal_check");
    });

    this.schema.createTable("trial_extensions", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.integer("actor_user_id").references("users.id").onDelete("SET NULL");
      table.timestamp("previous_ends_at", { useTz: true }).notNullable();
      table.timestamp("new_ends_at", { useTz: true }).notNullable();
      table.text("reason").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.index(["user_id", "created_at"]);
      table.check("new_ends_at > previous_ends_at", [], "trial_extensions_dates_check");
      table.check("length(btrim(reason)) > 0", [], "trial_extensions_reason_check");
    });
  }

  async down() {
    this.schema.dropTable("trial_extensions");
    this.schema.dropTable("account_action_tokens");
  }
}
