import type { SchemaRules } from "@adonisjs/lucid/types/schema_generator";

export default {
  tables: {
    qr_logos: {
      columns: {
        sha256: {
          tsType: "string",
          decorators: [{ name: "@column", args: { columnName: "sha256" } }],
        },
      },
    },
  },
} satisfies SchemaRules;
