import encode from "qr";

import {
  QR_VERSION_DIMENSION_BASE,
  QR_VERSION_DIMENSION_STEP,
  QR_VERSION_MAX,
  QR_VERSION_MIN,
} from "./constants.js";
import { QrEncodingError } from "./errors.js";
import { createQrFinderPatterns, createQrFunctionModules } from "./layout.js";
import type { EncodeQrOptions, ErrorCorrectionLevel, QrMatrix } from "./types.js";

/** Used when a caller does not choose an error-correction level. */
const DEFAULT_ERROR_CORRECTION_LEVEL: ErrorCorrectionLevel = "M";

/** `qr` requires a positive border for raw output; this ring is removed below. */
const ENCODER_BORDER_MODULES = 1;

/** Keep one encoder output cell per QR module. */
const ENCODER_SCALE = 1;

/** Map our public ECC labels to the names accepted by `qr`. */
const ERROR_CORRECTION = {
  L: "low",
  M: "medium",
  Q: "quartile",
  H: "high",
} as const satisfies Record<ErrorCorrectionLevel, string>;

/** Encode text verbatim, without URL normalization, a border, or any rendering. */
export function encodeQr(payload: string, options: EncodeQrOptions = {}): QrMatrix {
  if (typeof payload !== "string") {
    throw new QrEncodingError("INVALID_PAYLOAD", "QR payload must be a string.");
  }
  if (payload.length === 0) {
    throw new QrEncodingError("EMPTY_PAYLOAD", "QR payload must not be empty.");
  }

  const errorCorrectionLevel: ErrorCorrectionLevel =
    options.errorCorrectionLevel ?? DEFAULT_ERROR_CORRECTION_LEVEL;
  if (!Object.hasOwn(ERROR_CORRECTION, errorCorrectionLevel)) {
    throw new QrEncodingError(
      "INVALID_ERROR_CORRECTION_LEVEL",
      "Error correction level must be L, M, Q, or H.",
    );
  }

  if (
    options.version !== undefined &&
    (!Number.isInteger(options.version) ||
      options.version < QR_VERSION_MIN ||
      options.version > QR_VERSION_MAX)
  ) {
    throw new QrEncodingError(
      "INVALID_VERSION",
      `QR version must be an integer between ${QR_VERSION_MIN} and ${QR_VERSION_MAX}.`,
    );
  }

  let paddedModules: boolean[][];
  try {
    paddedModules = encode(payload, "raw", {
      ecc: ERROR_CORRECTION[errorCorrectionLevel],
      ...(options.version === undefined ? {} : { version: options.version }),
      border: ENCODER_BORDER_MODULES,
      scale: ENCODER_SCALE,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Capacity overflow")) {
      throw new QrEncodingError(
        "CAPACITY_EXCEEDED",
        "QR payload does not fit the selected version and error-correction level.",
        error,
      );
    }
    throw new QrEncodingError("ENCODER_FAILURE", "QR payload could not be encoded.", error);
  }
  const modules = paddedModules
    .slice(ENCODER_BORDER_MODULES, -ENCODER_BORDER_MODULES)
    .map((row) => row.slice(ENCODER_BORDER_MODULES, -ENCODER_BORDER_MODULES));
  const version = (modules.length - QR_VERSION_DIMENSION_BASE) / QR_VERSION_DIMENSION_STEP;

  return {
    size: modules.length,
    version,
    errorCorrectionLevel,
    modules,
    functionModules: createQrFunctionModules(version),
    finderPatterns: createQrFinderPatterns(modules.length),
  };
}
