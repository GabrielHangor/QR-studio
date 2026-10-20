import { describe, expect, it } from "vitest";

import {
  QrError,
  QrEncodingError,
  encodeQr,
  renderQrSvg,
  analyzeQrDesign,
  type RenderQrSvgOptions,
  type QrErrorCode,
  type QrErrorParams,
  type QrDiagnosticParams,
  type QrDesignDiagnostic,
} from "../src/engine/index.js";
import { qrMessagesEn } from "../src/i18n/en.js";
import { formatQrError, formatQrDiagnostic, type QrMessageCatalog } from "../src/i18n/index.js";
import { qrMessagesRu } from "../src/i18n/ru.js";

function catchError(action: () => unknown): QrError {
  let actualError: unknown;
  try {
    action();
  } catch (error) {
    actualError = error;
  }
  expect(actualError).toBeInstanceOf(QrError);
  return actualError as QrError;
}

describe("structured errors", () => {
  it("keeps encoder errors in the common contract", () => {
    const error = catchError(() => encodeQr("x", { version: 41 }));
    expect(error).toBeInstanceOf(QrEncodingError);
    expect(error.code).toBe("INVALID_VERSION");
    expect(error.params).toEqual({ minimum: 1, maximum: 40 });
    expect(error.message).toBe("INVALID_VERSION");
    expect(formatQrError(error, qrMessagesRu)).toBe(
      "Версия QR должна быть целым числом от 1 до 40.",
    );
  });

  it("reports capacity constraints without returning the payload", () => {
    const content = "private-content-".repeat(100);
    const error = catchError(() => encodeQr(content, { version: 1, errorCorrectionLevel: "H" }));
    expect(error.code).toBe("CAPACITY_EXCEEDED");
    expect(error.params).toEqual({ version: 1, errorCorrectionLevel: "H" });
    const message = formatQrError(error, qrMessagesRu);
    expect(message).toContain("версии 1");
    expect(message).toContain("автоматический выбор версии");
    expect(message).not.toContain(content);
  });

  it.each([
    [{ size: 0 }, "INVALID_OUTPUT_SIZE", { minimum: 1 }],
    [{ quietZone: 3 }, "INVALID_QUIET_ZONE", { minimum: 4 }],
    [{ foreground: "red" }, "INVALID_COLOR", { target: "foreground" }],
    [{ background: "red" }, "INVALID_COLOR", { target: "background" }],
    [{ finder: { outerColor: "red" } }, "INVALID_COLOR", { target: "finderRing" }],
    [{ finder: { innerColor: "red" } }, "INVALID_COLOR", { target: "finderPupil" }],
    [{ frame: { color: "red" } }, "INVALID_COLOR", { target: "frame" }],
    [{ frame: { widthPx: 128 } }, "INVALID_FRAME_WIDTH", { maximumExclusive: 128 }],
    [{ caption: { text: "Hello", color: "red" } }, "INVALID_COLOR", { target: "caption" }],
    [
      { caption: { text: "Hello", background: "red" } },
      "INVALID_COLOR",
      { target: "captionBackground" },
    ],
    [
      { caption: { text: "Hello", letterSpacing: 11 } },
      "INVALID_CAPTION_LETTER_SPACING",
      { minimum: 0, maximum: 10 },
    ],
    [
      {
        caption: [
          { text: "A", position: "top" },
          { text: "B", position: "top" },
        ],
      },
      "DUPLICATE_CAPTION_POSITION",
      { position: "top" },
    ],
  ] as const)("returns actionable context for %j", (options, code, params) => {
    const error = catchError(() =>
      renderQrSvg(encodeQr("QR"), options as unknown as RenderQrSvgOptions),
    );
    expect(error.code).toBe(code);
    expect(error.params).toEqual(params);
    expect(formatQrError(error, qrMessagesRu)).toMatch(/[А-Яа-яЁё]/);
  });

  it("retains the original cause for logging and keeps params immutable", () => {
    const cause = new Error("private encoder details");
    const error = new QrEncodingError("ENCODER_FAILURE", {}, cause);
    expect(error.cause).toBe(cause);
    expect(error.originalError).toBe(cause);
    expect(Object.isFrozen(error.params)).toBe(true);
    expect(formatQrError(error, qrMessagesRu)).not.toContain(cause.message);
  });
});

describe("localized diagnostics", () => {
  it("returns raw numeric parameters and formats them using the chosen language", () => {
    const { diagnostics } = analyzeQrDesign(
      encodeQr("QR"),
      { foreground: "#777777", quietZone: 3 },
      { minimumContrastRatio: 4.5 },
    );
    expect(diagnostics[0]).toEqual({
      code: "QUIET_ZONE_TOO_SMALL",
      severity: "error",
      params: { minimum: 4 },
    });
    const contrast = diagnostics.find((item) => item.code === "CONTRAST_BELOW_THRESHOLD")!;
    expect(contrast.params).toEqual({
      target: "foreground",
      actual: expect.any(Number),
      minimum: 4.5,
    });
    expect(contrast).not.toHaveProperty("message");
    expect(formatQrDiagnostic(contrast, qrMessagesRu)).toContain("4,5:1");
  });

  it("distinguishes ring and pupil warnings without reading text", () => {
    const { diagnostics } = analyzeQrDesign(
      encodeQr("QR"),
      { finder: { outerColor: "#fff", innerColor: "#eee" } },
      { minimumContrastRatio: 4.5 },
    );
    const warnings = diagnostics.filter((item) => item.code === "CONTRAST_BELOW_THRESHOLD");
    expect(warnings.map((item) => item.params.target)).toEqual(["finderRing", "finderPupil"]);
    expect(formatQrDiagnostic(warnings[0]!, qrMessagesRu)).toContain("колец маркеров");
    expect(formatQrDiagnostic(warnings[1]!, qrMessagesRu)).toContain("центров маркеров");
  });
});

describe("language boundary", () => {
  it("uses a caller-supplied dictionary without changing the engine", () => {
    const messages: QrMessageCatalog = {
      ...qrMessagesRu,
      unknownError: "Something went wrong.",
      errors: { ...qrMessagesRu.errors, EMPTY_PAYLOAD: () => "Enter text or a URL." },
      diagnostics: {
        ...qrMessagesRu.diagnostics,
        QUIET_ZONE_TOO_SMALL: ({ minimum }) => `Keep at least ${minimum} modules clear.`,
      },
    };
    const error = catchError(() => encodeQr(""));
    expect(formatQrError(error, messages)).toBe("Enter text or a URL.");
    expect(formatQrError(error, qrMessagesRu)).toBe("Введите ссылку или текст для QR-кода.");
    expect(
      formatQrDiagnostic(
        { code: "QUIET_ZONE_TOO_SMALL", severity: "error", params: { minimum: 4 } },
        messages,
      ),
    ).toBe("Keep at least 4 modules clear.");
  });

  it.each([
    new Error("private error details"),
    "secret",
    null,
    { code: "EMPTY_PAYLOAD", params: {} },
  ])("hides unknown error details %j", (error) => {
    expect(formatQrError(error, qrMessagesRu)).toBe(qrMessagesRu.unknownError);
    expect(formatQrError(error, qrMessagesRu, "Не удалось экспортировать PNG.")).toBe(
      "Не удалось экспортировать PNG.",
    );
  });

  it.each([
    ["Russian", qrMessagesRu, /[А-Яа-яЁё]/],
    ["English", qrMessagesEn, /^[\x20-\x7E]+$/],
  ] as const)("provides a %s formatter for every declared error code", (_, messages, language) => {
    const examples: { [C in QrErrorCode]: QrErrorParams[C] } = {
      INVALID_PAYLOAD: {},
      EMPTY_PAYLOAD: {},
      INVALID_ERROR_CORRECTION_LEVEL: {},
      INVALID_VERSION: { minimum: 1, maximum: 40 },
      CAPACITY_EXCEEDED: { errorCorrectionLevel: "M" },
      ENCODER_FAILURE: {},
      INVALID_MATRIX: {},
      INVALID_OUTPUT_SIZE: { minimum: 1 },
      INVALID_QUIET_ZONE: { minimum: 4 },
      SVG_DIMENSIONS_TOO_LARGE: {},
      INVALID_COLOR: { target: "background" },
      INVALID_MODULE_SHAPE: { target: "modules" },
      INVALID_GRADIENT: {},
      INVALID_LOGO_OPTIONS: {},
      INVALID_LOGO_DATA: {},
      INVALID_LOGO_SIZE: { matrixSize: 21 },
      LOGO_OVERLAPS_FUNCTION_MODULES: {},
      INVALID_ARTWORK_SHAPE: {},
      INVALID_CAPTION_TEXT: {},
      INVALID_CAPTION_POSITION: {},
      DUPLICATE_CAPTION_POSITION: { position: "top" },
      INVALID_CAPTION_STYLE: {},
      ARC_CAPTION_REQUIRES_CIRCLE: {},
      INVALID_CAPTION_FONT_SIZE: {},
      INVALID_CAPTION_FONT_WEIGHT: {},
      INVALID_CAPTION_LETTER_SPACING: { minimum: 0, maximum: 10 },
      INVALID_FRAME: {},
      INVALID_FRAME_STYLE: {},
      INVALID_FRAME_WIDTH: { maximumExclusive: 128 },
      INVALID_FINDER_OPTIONS: {},
      INVALID_FINDER_SHAPE: {},
      INVALID_CONTRAST_THRESHOLD: { minimum: 1 },
      INVALID_MODULE_PITCH_THRESHOLD: {},
    };
    for (const code of Object.keys(examples) as QrErrorCode[]) {
      const message = formatQrError(new QrError(code, examples[code]), messages);
      expect(message).toMatch(language);
      expect(message).not.toMatch(/undefined|NaN/);
    }
  });

  it.each([
    ["Russian", qrMessagesRu, /[А-Яа-яЁё]/],
    ["English", qrMessagesEn, /^[\x20-\x7E]+$/],
  ] as const)("formats every diagnostic code in %s", (_, messages, language) => {
    const examples: {
      [C in keyof QrDiagnosticParams]: Extract<QrDesignDiagnostic, { code: C }>;
    } = {
      QUIET_ZONE_TOO_SMALL: {
        code: "QUIET_ZONE_TOO_SMALL",
        severity: "error",
        params: { minimum: 4 },
      },
      CONTRAST_BELOW_THRESHOLD: {
        code: "CONTRAST_BELOW_THRESHOLD",
        severity: "warning",
        params: { target: "finderRing", actual: 2.15, minimum: 4.5 },
      },
      MODULE_PITCH_BELOW_THRESHOLD: {
        code: "MODULE_PITCH_BELOW_THRESHOLD",
        severity: "warning",
        params: { actual: 1.25, minimum: 2 },
      },
      FOREGROUND_NOT_DARKER: {
        code: "FOREGROUND_NOT_DARKER",
        severity: "warning",
        params: { target: "finderPupil" },
      },
      GRADIENT_REQUIRES_DEVICE_TEST: {
        code: "GRADIENT_REQUIRES_DEVICE_TEST",
        severity: "warning",
        params: {},
      },
      MODULE_SHAPE_REQUIRES_DEVICE_TEST: {
        code: "MODULE_SHAPE_REQUIRES_DEVICE_TEST",
        severity: "warning",
        params: {},
      },
      FINDER_SHAPE_REQUIRES_DEVICE_TEST: {
        code: "FINDER_SHAPE_REQUIRES_DEVICE_TEST",
        severity: "warning",
        params: {},
      },
      LOGO_REDUCES_ERROR_CORRECTION: {
        code: "LOGO_REDUCES_ERROR_CORRECTION",
        severity: "warning",
        params: { coveragePercent: 6.25 },
      },
      LOGO_OVERLAPS_FUNCTION_MODULES: {
        code: "LOGO_OVERLAPS_FUNCTION_MODULES",
        severity: "error",
        params: {},
      },
    };
    for (const diagnostic of Object.values(examples)) {
      const message = formatQrDiagnostic(diagnostic, messages);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/undefined|NaN/);
      expect(message).toMatch(language);
    }
  });

  it("uses English numeric formatting without changing diagnostic parameters", () => {
    const diagnostic: QrDesignDiagnostic = {
      code: "CONTRAST_BELOW_THRESHOLD",
      severity: "warning",
      params: { target: "finderPupil", actual: 2.125, minimum: 4.5 },
    };
    expect(formatQrDiagnostic(diagnostic, qrMessagesEn)).toContain("finder centers is 2.13:1");
    expect(formatQrDiagnostic(diagnostic, qrMessagesEn)).toContain("4.5:1");
    expect(formatQrDiagnostic(diagnostic, qrMessagesRu)).toContain("4,5:1");
    expect(diagnostic.params.actual).toBe(2.125);
  });

  it("formats English capacity errors with automatic and explicit versions", () => {
    const explicit = catchError(() => encodeQr("A".repeat(100), { version: 1 }));
    expect(formatQrError(explicit, qrMessagesEn)).toContain("QR version 1");
    expect(formatQrError(explicit, qrMessagesEn)).toContain("automatic version selection");
    const automatic = new QrEncodingError("CAPACITY_EXCEEDED", { errorCorrectionLevel: "H" });
    expect(formatQrError(automatic, qrMessagesEn)).toContain("error correction level H");
    expect(formatQrError(automatic, qrMessagesEn)).not.toContain("version");
    expect(formatQrError(new Error("private details"), qrMessagesEn)).toBe(
      qrMessagesEn.unknownError,
    );
  });
});
