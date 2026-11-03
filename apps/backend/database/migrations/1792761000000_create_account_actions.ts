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

    this.schema.createTable("trial_applications", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.text("purpose").notNullable();
      table
        .string("status", 20)
        .notNullable()
        .defaultTo("pending")
        .checkIn(
          ["pending", "waitlisted", "approved", "rejected"],
          "trial_applications_status_check",
        );
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("decided_at", { useTz: true });
      table.integer("decided_by_user_id").references("users.id").onDelete("SET NULL");
      table.index(["status", "created_at"]);
      table.unique(["user_id"], {
        indexName: "trial_applications_one_active",
        useConstraint: false,
        predicate: this.knex().whereRaw("status IN ('pending', 'waitlisted', 'approved')"),
      });
      table.check(
        "length(btrim(purpose)) > 0 AND length(purpose) <= 1000",
        [],
        "trial_applications_purpose_check",
      );
      table.check(
        "(status = 'pending') = (decided_at IS NULL)",
        [],
        "trial_applications_decision_check",
      );
    });

    this.schema.createTable("paywall_intents", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table
        .string("option", 20)
        .notNullable()
        .checkIn(["subscription", "one_time"], "paywall_intents_option_check");
      // Minor currency units, fixed when the option was shown.
      table.integer("price_minor").notNullable();
      table
        .specificType("currency", "char(3)")
        .notNullable()
        .checkRegex("^[A-Z]{3}$", "paywall_intents_currency_check");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.index(["user_id", "created_at"]);
      table.check("price_minor >= 0", [], "paywall_intents_price_check");
    });
  }

  async down() {
    this.schema.dropTable("paywall_intents");
    this.schema.dropTable("trial_applications");
    this.schema.dropTable("trial_extensions");
    this.schema.dropTable("account_action_tokens");
  }
}
