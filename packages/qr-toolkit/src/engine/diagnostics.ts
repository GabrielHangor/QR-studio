import {
  QR_FRAME_PADDING_MODULES,
  QR_QUIET_ZONE_DEFAULT_MODULES,
  QR_QUIET_ZONE_MIN_MODULES,
  QR_SVG_DEFAULT_SIZE_PX,
} from "./constants.js";
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
  if (!isValidQrMatrix(matrix)) throw new TypeError("Invalid QR matrix.");

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
    throw new RangeError("Minimum contrast ratio must be a finite number of at least 1.");
  }
  if (
    minimumModulePitchPx !== undefined &&
    (!Number.isFinite(minimumModulePitchPx) || minimumModulePitchPx <= 0)
  ) {
    throw new RangeError("Minimum module pitch must be a finite positive number of pixels.");
  }

  if (!Number.isSafeInteger(quietZone) || quietZone < 0) {
    throw new RangeError("Quiet zone must be a non-negative safe integer.");
  }

  if (quietZone < QR_QUIET_ZONE_MIN_MODULES) {
    diagnostics.push({
      code: "QUIET_ZONE_TOO_SMALL",
      severity: "error",
      message: `Quiet zone must be at least ${QR_QUIET_ZONE_MIN_MODULES} modules.`,
    });
  }

  if (!isOpaqueHexColor(background)) {
    throw new TypeError("SVG background must use opaque #RGB or #RRGGBB notation.");
  }

  const outputSize = renderOptions.size ?? QR_SVG_DEFAULT_SIZE_PX;
  if (!Number.isSafeInteger(outputSize) || outputSize < 1) {
    throw new RangeError("SVG size must be a positive safe integer.");
  }
  const quietExtent = matrix.size + quietZone * 2;
  const framePadding = renderOptions.frame === "outline" ? QR_FRAME_PADDING_MODULES : 0;
  const viewBoxExtent = quietExtent + framePadding * 2;
  if (!Number.isSafeInteger(viewBoxExtent)) {
    throw new RangeError("SVG viewBox exceeds safe integer dimensions.");
  }
  const modulePitchPx = outputSize / viewBoxExtent;

  if (
    renderOptions.frame !== undefined &&
    renderOptions.frame !== "none" &&
    renderOptions.frame !== "outline"
  ) {
    throw new TypeError("QR frame must be none or outline.");
  }
  if (
    renderOptions.moduleShape !== undefined &&
    !["square", "rounded", "circle"].includes(renderOptions.moduleShape)
  ) {
    throw new TypeError("QR module shape must be square, rounded, or circle.");
  }
  if (
    renderOptions.finderShape !== undefined &&
    !["square", "rounded", "circle"].includes(renderOptions.finderShape)
  ) {
    throw new TypeError("QR module shape must be square, rounded, or circle.");
  }

  if (minimumModulePitchPx !== undefined && modulePitchPx < minimumModulePitchPx) {
    diagnostics.push({
      code: "MODULE_PITCH_BELOW_THRESHOLD",
      severity: "warning",
      message: `Each module is ${modulePitchPx.toFixed(2)} px wide, below the supplied ${minimumModulePitchPx.toFixed(2)} px threshold.`,
    });
  }

  if (renderOptions.moduleShape !== undefined && renderOptions.moduleShape !== "square") {
    diagnostics.push({
      code: "MODULE_SHAPE_REQUIRES_DEVICE_TEST",
      severity: "warning",
      message:
        "Non-square data modules can change scanner tolerance; test the rendered QR on target devices.",
    });
  }

  if (renderOptions.finderShape !== undefined && renderOptions.finderShape !== "square") {
    diagnostics.push({
      code: "FINDER_SHAPE_REQUIRES_DEVICE_TEST",
      severity: "warning",
      message:
        "Custom finder shapes can affect QR detection; test the rendered QR on target devices.",
    });
  }

  let contrastRatio: number | null = null;
  if (typeof foreground === "string") {
    if (!isOpaqueHexColor(foreground)) {
      throw new TypeError("SVG foreground must use opaque #RGB or #RRGGBB notation.");
    }

    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    contrastRatio = getContrastRatio(foregroundLuminance, backgroundLuminance);

    if (foregroundLuminance >= backgroundLuminance) {
      diagnostics.push({
        code: "FOREGROUND_NOT_DARKER",
        severity: "warning",
        message:
          "Foreground is not darker than the background; scanner support for inverted QR varies.",
      });
    }

    if (minimumContrastRatio !== undefined && contrastRatio < minimumContrastRatio) {
      diagnostics.push({
        code: "CONTRAST_BELOW_THRESHOLD",
        severity: "warning",
        message: `Contrast is ${contrastRatio.toFixed(2)}:1, below the supplied ${minimumContrastRatio.toFixed(2)}:1 threshold.`,
      });
    }
  } else {
    validateGradient(foreground);
    diagnostics.push({
      code: "GRADIENT_REQUIRES_DEVICE_TEST",
      severity: "warning",
      message:
        "A gradient can vary in contrast across the symbol; test the rendered QR with target devices.",
    });
  }

  let logoCoveragePercent: number | null = null;
  if (renderOptions.logo !== undefined) {
    const logo = inspectQrLogoOverlay(matrix, renderOptions.logo);
    logoCoveragePercent = logo.coveragePercent;
    diagnostics.push({
      code: "LOGO_REDUCES_ERROR_CORRECTION",
      severity: "warning",
      message: `Logo and its clear backing cover about ${logoCoveragePercent.toFixed(1)}% of the symbol. Error correction does not guarantee this area is safe; test the result on target devices.`,
    });

    if (logo.overlapsFunctionModules) {
      diagnostics.push({
        code: "LOGO_OVERLAPS_FUNCTION_MODULES",
        severity: "error",
        message: "Logo backing overlaps finder, timing, alignment, or other QR function modules.",
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
    throw new TypeError("Linear gradient requires a supported direction and opaque hex colors.");
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
