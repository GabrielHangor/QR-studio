import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("users", (table) => {
      table.increments("id").notNullable();
      table.string("full_name").nullable();
      table.string("email", 254).notNullable().unique();
      table.string("password").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable();
      table.timestamp("updated_at", { useTz: true });
      table
        .string("role", 20)
        .notNullable()
        .defaultTo("user")
        .checkIn(["user", "admin"], "users_role_check");
      table.string("timezone", 64).notNullable().defaultTo("Europe/Moscow");
      table.timestamp("email_verified_at", { useTz: true });
      table.timestamp("trial_started_at", { useTz: true });
      table.timestamp("trial_ends_at", { useTz: true });
      table.timestamp("blocked_at", { useTz: true });
      table.text("block_reason");
      table.timestamp("deletion_requested_at", { useTz: true });
      table.timestamp("delete_after", { useTz: true }).index();
      table.check(
        "(trial_started_at IS NULL AND trial_ends_at IS NULL) OR (trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at >= trial_started_at)",
        [],
        "users_trial_dates_check",
      );
      table.check(
        "(deletion_requested_at IS NULL AND delete_after IS NULL) OR (deletion_requested_at IS NOT NULL AND delete_after IS NOT NULL AND delete_after >= deletion_requested_at)",
        [],
        "users_deletion_dates_check",
      );
      table.check(
        "(blocked_at IS NULL AND block_reason IS NULL) OR (blocked_at IS NOT NULL AND length(btrim(block_reason)) > 0 AND block_reason IS NOT NULL)",
        [],
        "users_block_reason_check",
      );
      table.unique([this.raw("lower(btrim(email))")], {
        indexName: "users_email_identity_unique",
        useConstraint: false,
      });
      table.index(["trial_ends_at"], "users_trial_expiry_index", {
        predicate: this.knex().whereNotNull("trial_ends_at"),
      });
    });
  }

  async down() {
    this.schema.dropTable("users");
  }
}
