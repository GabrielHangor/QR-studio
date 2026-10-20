import * as v from "valibot";

import type { QrContentType } from "./content.js";

export type QrContentIssueCode =
  | "required"
  | "url"
  | "email"
  | "phone"
  | "subject"
  | "security"
  | "coordinate"
  | "latitude"
  | "longitude";
const text = v.string("required");
const required = v.pipe(text, v.trim(), v.nonEmpty("required"));
const email = v.pipe(required, v.email("email"));
const phone = v.pipe(required, v.regex(/^\+?[\d ().-]+$/, "phone"), v.regex(/\d/, "phone"));
const optionalEmail = v.optional(
  v.pipe(text, v.trim(), v.union([v.literal(""), email], "email")),
  "",
);
const optionalPhone = v.optional(
  v.pipe(text, v.trim(), v.union([v.literal(""), phone], "phone")),
  "",
);
const coordinate = (limit: number, code: "latitude" | "longitude") =>
  v.pipe(
    required,
    v.transform((value) => value.replace(",", ".")),
    v.regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/, "coordinate"),
    v.toNumber(),
    v.finite("coordinate"),
    v.minValue(-limit, code),
    v.maxValue(limit, code),
  );

/** The same schemas drive preview validation and localized field errors. */
export const qrContentSchemas = {
  url: v.object({ url: v.pipe(required, v.url("url"), v.regex(/^https?:\/\//i, "url")) }),
  text: v.object({ text: v.pipe(text, v.nonEmpty("required")) }),
  email: v.object({
    email,
    subject: v.optional(v.pipe(text, v.regex(/^[^\r\n]*$/, "subject")), ""),
    body: v.optional(text, ""),
  }),
  phone: v.object({ phone }),
  sms: v.object({ phone, body: v.optional(text, "") }),
  wifi: v.pipe(
    v.object({
      ssid: v.pipe(text, v.nonEmpty("required")),
      security: v.optional(v.picklist(["WPA", "WEP", "nopass"], "security"), "WPA"),
      password: v.optional(text, ""),
      hidden: v.optional(v.picklist(["true", "false"], "security"), "false"),
    }),
    v.forward(
      v.partialCheck(
        [["security"], ["password"]],
        (input) => input.security === "nopass" || input.password.length > 0,
        "required",
      ),
      ["password"],
    ),
  ),
  contact: v.object({
    name: required,
    organization: v.optional(text, ""),
    phone: optionalPhone,
    email: optionalEmail,
  }),
  location: v.object({
    latitude: coordinate(90, "latitude"),
    longitude: coordinate(180, "longitude"),
  }),
} satisfies Record<QrContentType, v.GenericSchema>;

export function qrContentFieldIssues(
  type: QrContentType,
  draft: unknown,
): Partial<Record<string, QrContentIssueCode>> {
  const result = v.safeParse(qrContentSchemas[type], draft);
  if (result.success) return {};
  const errors: Partial<Record<string, QrContentIssueCode>> = {};
  for (const issue of result.issues) {
    const field = issue.path?.[0]?.key;
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message as QrContentIssueCode;
    }
  }
  return errors;
}
