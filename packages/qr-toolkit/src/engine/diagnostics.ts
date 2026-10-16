import { QrError } from "./errors.js";
import {
  QR_QUIET_ZONE_DEFAULT_MODULES,
  QR_QUIET_ZONE_MIN_MODULES,
  QR_SVG_DEFAULT_SIZE_PX,
} from "./constants.js";
import { getQrArtworkLayout } from "./artwork.js";
import { normalizeQrFinder } from "./finders.js";
import { inspectQrLogoOverlay, isValidQrMatrix } from "./renderer.js";
import type {
  AnalyzeQrDesignOptions,
  QrDesignAnalysis,
  QrDesignDiagnostic,
  QrLinearGradient,
  QrMatrix,
  RenderQrSvgOptions,
} from "./types.js";

/** Accept only the same opaque colors supported by the SVG renderer. */
const OPAQUE_HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

/** WCAG's sRGB conversion breakpoint, used only to report a contrast metric. */
const SRGB_LINEAR_BREAKPOINT = 0.04045;

/** WCAG's sRGB linearization scale below the breakpoint. */
const SRGB_LINEAR_SCALE = 12.92;

/** WCAG's sRGB linearization offset above the breakpoint. */
const SRGB_OFFSET = 0.055;

/** WCAG's sRGB linearization divisor above the breakpoint. */
const SRGB_SCALE = 1.055;

/** WCAG's sRGB linearization exponent above the breakpoint. */
const SRGB_EXPONENT = 2.4;

/** Relative luminance coefficients for red, green, and blue. */
const RED_LUMINANCE_WEIGHT = 0.2126;
const GREEN_LUMINANCE_WEIGHT = 0.7152;
const BLUE_LUMINANCE_WEIGHT = 0.0722;

/** WCAG contrast calculations add this reference luminance to both colors. */
const CONTRAST_LUMINANCE_OFFSET = 0.05;

/**
 * Report measurable design risks without claiming that a design will scan.
 * The engine returns a contrast ratio, but applies no default threshold because
 * QR-specific limits still need validation on target scanners and devices.
 */
export function analyzeQrDesign(
  matrix: QrMatrix,
  renderOptions: RenderQrSvgOptions = {},
  options: AnalyzeQrDesignOptions = {},
): QrDesignAnalysis {
  if (!isValidQrMatrix(matrix)) throw new QrError("INVALID_MATRIX", {});

  const diagnostics: QrDesignDiagnostic[] = [];
  const quietZone = renderOptions.quietZone ?? QR_QUIET_ZONE_DEFAULT_MODULES;
  const background = renderOptions.background ?? "#ffffff";
  const foreground = renderOptions.foreground ?? "#000000";
  const minimumContrastRatio = options.minimumContrastRatio;
  const minimumModulePitchPx = options.minimumModulePitchPx;

  if (
    minimumContrastRatio !== undefined &&
    (!Number.isFinite(minimumContrastRatio) || minimumContrastRatio < 1)
  ) {
    throw new QrError("INVALID_CONTRAST_THRESHOLD", { minimum: 1 });
  }
  if (
    minimumModulePitchPx !== undefined &&
    (!Number.isFinite(minimumModulePitchPx) || minimumModulePitchPx <= 0)
  ) {
    throw new QrError("INVALID_MODULE_PITCH_THRESHOLD", {});
  }

  if (!Number.isSafeInteger(quietZone) || quietZone < 0) {
    throw new QrError("INVALID_QUIET_ZONE", { minimum: 0 });
  }

  if (quietZone < QR_QUIET_ZONE_MIN_MODULES) {
    diagnostics.push({
      code: "QUIET_ZONE_TOO_SMALL",
      severity: "error",
      params: { minimum: QR_QUIET_ZONE_MIN_MODULES },
    });
  }

  if (!isOpaqueHexColor(background)) {
    throw new QrError("INVALID_COLOR", { target: "background" });
  }
  if (
    renderOptions.artworkBackground !== undefined &&
    !isOpaqueHexColor(renderOptions.artworkBackground)
  ) {
    throw new QrError("INVALID_COLOR", { target: "artworkBackground" });
  }

  const outputSize = renderOptions.size ?? QR_SVG_DEFAULT_SIZE_PX;
  if (!Number.isSafeInteger(outputSize) || outputSize < 1) {
    throw new QrError("INVALID_OUTPUT_SIZE", { minimum: 1 });
  }
  const { modulePitchPx } = getQrArtworkLayout(matrix.size, renderOptions);
  if (
    renderOptions.moduleShape !== undefined &&
    !["square", "rounded", "circle"].includes(renderOptions.moduleShape)
  ) {
    throw new QrError("INVALID_MODULE_SHAPE", { target: "modules" });
  }
  if (
    renderOptions.finderShape !== undefined &&
    !["square", "rounded", "circle"].includes(renderOptions.finderShape)
  ) {
    throw new QrError("INVALID_MODULE_SHAPE", { target: "finderCells" });
  }

  if (minimumModulePitchPx !== undefined && modulePitchPx < minimumModulePitchPx) {
    diagnostics.push({
      code: "MODULE_PITCH_BELOW_THRESHOLD",
      severity: "warning",
      params: { actual: modulePitchPx, minimum: minimumModulePitchPx },
    });
  }

  if (renderOptions.moduleShape !== undefined && renderOptions.moduleShape !== "square") {
    diagnostics.push({
      code: "MODULE_SHAPE_REQUIRES_DEVICE_TEST",
      severity: "warning",
      params: {},
    });
  }

  const finder = normalizeQrFinder(renderOptions.finder);
  if (
    finder
      ? finder.outerShape !== "square" || finder.innerShape !== "square"
      : renderOptions.finderShape !== undefined && renderOptions.finderShape !== "square"
  ) {
    diagnostics.push({
      code: "FINDER_SHAPE_REQUIRES_DEVICE_TEST",
      severity: "warning",
      params: {},
    });
  }

  for (const [part, color] of [
    ["finderRing", finder?.outerColor],
    ["finderPupil", finder?.innerColor],
  ] as const) {
    if (color === undefined) continue;
    const luminance = relativeLuminance(color);
    const backgroundLuminance = relativeLuminance(background);
    if (luminance >= backgroundLuminance) {
      diagnostics.push({
        code: "FOREGROUND_NOT_DARKER",
        severity: "warning",
        params: { target: part },
      });
    }
    if (
      minimumContrastRatio !== undefined &&
      getContrastRatio(luminance, backgroundLuminance) < minimumContrastRatio
    ) {
      diagnostics.push({
        code: "CONTRAST_BELOW_THRESHOLD",
        severity: "warning",
        params: {
          target: part,
          actual: getContrastRatio(luminance, backgroundLuminance),
          minimum: minimumContrastRatio,
        },
      });
    }
  }

  let contrastRatio: number | null = null;
  if (typeof foreground === "string") {
    if (!isOpaqueHexColor(foreground)) {
      throw new QrError("INVALID_COLOR", { target: "foreground" });
    }

    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    contrastRatio = getContrastRatio(foregroundLuminance, backgroundLuminance);

    if (foregroundLuminance >= backgroundLuminance) {
      diagnostics.push({
        code: "FOREGROUND_NOT_DARKER",
        severity: "warning",
        params: { target: "foreground" },
      });
    }

    if (minimumContrastRatio !== undefined && contrastRatio < minimumContrastRatio) {
      diagnostics.push({
        code: "CONTRAST_BELOW_THRESHOLD",
        severity: "warning",
        params: { target: "foreground", actual: contrastRatio, minimum: minimumContrastRatio },
      });
    }
  } else {
    validateGradient(foreground);
    diagnostics.push({
      code: "GRADIENT_REQUIRES_DEVICE_TEST",
      severity: "warning",
      params: {},
    });
  }

  let logoCoveragePercent: number | null = null;
  if (renderOptions.logo !== undefined) {
    const logo = inspectQrLogoOverlay(matrix, renderOptions.logo);
    logoCoveragePercent = logo.coveragePercent;
    diagnostics.push({
      code: "LOGO_REDUCES_ERROR_CORRECTION",
      severity: "warning",
      params: { coveragePercent: logoCoveragePercent },
    });

    if (logo.overlapsFunctionModules) {
      diagnostics.push({
        code: "LOGO_OVERLAPS_FUNCTION_MODULES",
        severity: "error",
        params: {},
      });
    }
  }

  return { contrastRatio, modulePitchPx, logoCoveragePercent, diagnostics };
}

function validateGradient(gradient: QrLinearGradient): void {
  if (
    !gradient ||
    typeof gradient !== "object" ||
    gradient.type !== "linear" ||
    !["horizontal", "vertical", "diagonal"].includes(gradient.direction) ||
    !isOpaqueHexColor(gradient.startColor) ||
    !isOpaqueHexColor(gradient.endColor)
  ) {
    throw new QrError("INVALID_GRADIENT", {});
  }
}

function isOpaqueHexColor(color: unknown): color is string {
  return typeof color === "string" && OPAQUE_HEX_COLOR.test(color);
}

function relativeLuminance(color: string): number {
  const [red, green, blue] = parseHexColor(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= SRGB_LINEAR_BREAKPOINT
      ? normalized / SRGB_LINEAR_SCALE
      : ((normalized + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_EXPONENT;
  });

  return (
    RED_LUMINANCE_WEIGHT * red! + GREEN_LUMINANCE_WEIGHT * green! + BLUE_LUMINANCE_WEIGHT * blue!
  );
}

function parseHexColor(color: string): [number, number, number] {
  const hex = color.slice(1);
  const expanded =
    hex.length === 3 ? [...hex].map((channel) => `${channel}${channel}`).join("") : hex;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function getContrastRatio(firstLuminance: number, secondLuminance: number): number {
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + CONTRAST_LUMINANCE_OFFSET) / (darker + CONTRAST_LUMINANCE_OFFSET);
}
