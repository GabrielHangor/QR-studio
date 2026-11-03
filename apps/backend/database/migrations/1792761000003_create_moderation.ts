import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.createTable("link_checks", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.uuid("qr_code_id").notNullable().references("qr_codes.id").onDelete("CASCADE");
      table.uuid("destination_id").notNullable();
      table
        .string("trigger", 20)
        .notNullable()
        .checkIn(["initial", "periodic", "manual"], "link_checks_trigger_check");
      table
        .string("status", 20)
        .notNullable()
        .defaultTo("pending")
        .checkIn(["pending", "safe", "unsafe", "error"], "link_checks_status_check");
      table.string("provider", 100);
      table.string("result_code", 100);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("checked_at", { useTz: true });
      table
        .foreign(["qr_code_id", "destination_id"], "link_checks_destination_fk")
        .references(["qr_code_id", "id"])
        .inTable("qr_destinations")
        .onDelete("CASCADE");
      table.unique(["qr_code_id", "id"]);
      table.index(["destination_id", "created_at"]);
      table.index(["status", "created_at"]);
      table.check(
        "(status = 'pending' AND checked_at IS NULL) OR (status <> 'pending' AND checked_at IS NOT NULL)",
        [],
        "link_checks_completion_check",
      );
    });

    this.schema.createTable("qr_blocks", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.uuid("qr_code_id").notNullable().references("qr_codes.id").onDelete("CASCADE");
      table.string("kind", 20).notNullable().checkIn(["manual", "threat"], "qr_blocks_kind_check");
      table.uuid("link_check_id");
      table.integer("created_by_user_id").references("users.id").onDelete("SET NULL");
      table.text("reason").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("released_at", { useTz: true });
      table.integer("released_by_user_id").references("users.id").onDelete("SET NULL");
      table.text("release_reason");
      table
        .foreign(["qr_code_id", "link_check_id"], "qr_blocks_check_fk")
        .references(["qr_code_id", "id"])
        .inTable("link_checks");
      table.index(["qr_code_id", "created_at"]);
      table.check("length(btrim(reason)) > 0", [], "qr_blocks_reason_check");
      table.check(
        "(released_at IS NULL AND release_reason IS NULL) OR (released_at IS NOT NULL AND released_at >= created_at AND release_reason IS NOT NULL AND length(btrim(release_reason)) > 0)",
        [],
        "qr_blocks_release_check",
      );
      table.unique(["qr_code_id", "kind"], {
        indexName: "qr_blocks_active_kind",
        useConstraint: false,
        predicate: this.knex().whereNull("released_at"),
      });
    });

    this.schema.createTable("complaints", (table) => {
      table.uuid("id").primary().defaultTo(this.raw("gen_random_uuid()"));
      table.uuid("qr_code_id").notNullable().references("qr_codes.id").onDelete("CASCADE");
      table.integer("reporter_user_id").references("users.id").onDelete("SET NULL");
      table
        .string("kind", 20)
        .notNullable()
        .defaultTo("report")
        .checkIn(["report", "appeal"], "complaints_kind_check");
      table.text("reason").notNullable();
      table
        .string("status", 20)
        .notNullable()
        .defaultTo("open")
        .checkIn(["open", "in_review", "resolved", "dismissed"], "complaints_status_check");
      table.integer("resolved_by_user_id").references("users.id").onDelete("SET NULL");
      table.text("resolution");
      table.timestamp("resolved_at", { useTz: true });
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.index(["status", "created_at"]);
      table.index(["qr_code_id", "created_at"]);
      table.check("length(btrim(reason)) > 0", [], "complaints_reason_check");
      table.check(
        "(status IN ('open', 'in_review') AND resolved_at IS NULL AND resolution IS NULL) OR (status IN ('resolved', 'dismissed') AND resolved_at IS NOT NULL AND resolution IS NOT NULL AND length(btrim(resolution)) > 0)",
        [],
        "complaints_resolution_check",
      );
    });

    this.schema.createTable("audit_logs", (table) => {
      table.bigIncrements("id");
      table.integer("actor_user_id").references("users.id").onDelete("SET NULL");
      table.string("action", 100).notNullable();
      table
        .string("target_type", 20)
        .notNullable()
        .checkIn(["user", "qr_code", "complaint", "trial_application"], "audit_logs_target_check");
      // Opaque IDs remain useful after the target is deleted; no copied names, URLs or emails.
      table.string("target_id", 64).notNullable();
      table.text("reason").notNullable();
      table.jsonb("metadata").notNullable().defaultTo("{}");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.now());
      table.index(["target_type", "target_id", "created_at"]);
      table.index(["actor_user_id", "created_at"]);
      table.index("created_at");
      table.check(
        "length(btrim(action)) > 0 AND length(btrim(target_id)) > 0 AND length(btrim(reason)) > 0",
        [],
        "audit_logs_content_check",
      );
      table.check("jsonb_typeof(metadata) = 'object'", [], "audit_logs_metadata_check");
    });
  }

  async down() {
    this.schema.dropTable("audit_logs");
    this.schema.dropTable("complaints");
    this.schema.dropTable("qr_blocks");
    this.schema.dropTable("link_checks");
  }
}
