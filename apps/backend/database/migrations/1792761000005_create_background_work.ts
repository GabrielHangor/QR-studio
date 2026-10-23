import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("notification_deliveries", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").notNullable().references("users.id").onDelete("CASCADE");
      table.uuid("qr_code_id");
      table
        .foreign(["user_id", "qr_code_id"], "deliveries_qr_owner_fk")
        .references(["user_id", "id"])
        .inTable("qr_codes")
        .onDelete("CASCADE");
      table.string("kind", 100).notNullable();
      table.string("recipient", 254).notNullable();
      // Encrypted by the application; verification/reset URLs must never be stored in plaintext.
      table.text("encrypted_payload");
      table.string("deduplication_key", 255).notNullable().unique();
      table
        .string("status", 20)
        .notNullable()
        .defaultTo("pending")
        .checkIn(["pending", "sent", "failed", "cancelled"], "deliveries_status_check");
      table.string("provider_message_id", 255);
      table.string("last_error_code", 100);
      table.timestamp("sent_at", { useTz: true });
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.unique(["user_id", "id"]);
      table.index(["user_id", "created_at"]);
      table.index("qr_code_id");
      table.index(["status", "created_at"]);
      table.check("(status = 'sent') = (sent_at IS NOT NULL)", [], "deliveries_sent_at_check");
      table.check(
        "(encrypted_payload IS NOT NULL AND length(encrypted_payload) > 0) OR (status <> 'pending' AND encrypted_payload IS NULL)",
        [],
        "deliveries_payload_check",
      );
      table.check(
        "length(btrim(kind)) > 0 AND length(btrim(recipient)) > 0 AND length(btrim(deduplication_key)) > 0",
        [],
        "deliveries_content_check",
      );
    });

    this.schema.createTable("background_jobs", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.integer("user_id").references("users.id").onDelete("CASCADE");
      table.uuid("qr_code_id");
      table
        .foreign(["user_id", "qr_code_id"], "jobs_qr_owner_fk")
        .references(["user_id", "id"])
        .inTable("qr_codes")
        .onDelete("CASCADE");
      table.uuid("notification_id");
      table
        .foreign(["user_id", "notification_id"], "jobs_notification_owner_fk")
        .references(["user_id", "id"])
        .inTable("notification_deliveries")
        .onDelete("CASCADE");
      table.string("handler", 100).notNullable();
      table.jsonb("payload").notNullable().defaultTo("{}");
      table.string("deduplication_key", 255);
      table
        .string("status", 20)
        .notNullable()
        .defaultTo("pending")
        .checkIn(["pending", "running", "completed", "failed", "cancelled"], "jobs_status_check");
      table.integer("attempts").notNullable().defaultTo(0);
      table
        .integer("max_attempts")
        .notNullable()
        .defaultTo(5)
        .checkPositive("jobs_max_attempts_check");
      table.timestamp("available_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.string("locked_by", 100);
      table.timestamp("lease_expires_at", { useTz: true });
      table.timestamp("finished_at", { useTz: true });
      table.string("last_error_code", 100);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.index("user_id");
      table.index("qr_code_id");
      table.index("notification_id");
      table.check("attempts >= 0 AND attempts <= max_attempts", [], "jobs_attempts_check");
      table.check(
        "(status = 'running' AND locked_by IS NOT NULL AND lease_expires_at IS NOT NULL) OR (status <> 'running' AND locked_by IS NULL AND lease_expires_at IS NULL)",
        [],
        "jobs_lease_check",
      );
      table.check(
        "(status IN ('completed', 'failed', 'cancelled')) = (finished_at IS NOT NULL)",
        [],
        "jobs_finished_at_check",
      );
      table.check(
        "(qr_code_id IS NULL AND notification_id IS NULL) OR user_id IS NOT NULL",
        [],
        "jobs_resource_owner_check",
      );
      table.check(
        "deduplication_key IS NULL OR length(btrim(deduplication_key)) > 0",
        [],
        "jobs_deduplication_key_check",
      );
      table.check(
        "length(btrim(handler)) > 0 AND jsonb_typeof(payload) = 'object'",
        [],
        "jobs_payload_check",
      );
      table.index(["available_at", "id"], "jobs_ready_index", {
        predicate: this.knex().whereRaw("status = 'pending'"),
      });
      table.index(["lease_expires_at"], "jobs_expired_lease_index", {
        predicate: this.knex().whereRaw("status = 'running'"),
      });
      table.unique(["deduplication_key"], {
        indexName: "jobs_active_deduplication",
        useConstraint: false,
        predicate: this.knex()
          .whereNotNull("deduplication_key")
          .whereRaw("status IN ('pending', 'running')"),
      });
    });
  }

  async down() {
    this.schema.dropTable("background_jobs");
    this.schema.dropTable("notification_deliveries");
  }
}
