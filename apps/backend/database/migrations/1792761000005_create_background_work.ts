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
  }

  async down() {
    this.schema.dropTable("notification_deliveries");
  }
}
