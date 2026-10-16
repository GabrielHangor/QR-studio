/** Stable field identifiers; translations belong to the calling interface. */
export type QrColorTarget =
  | "foreground"
  | "background"
  | "artworkBackground"
  | "finderRing"
  | "finderPupil"
  | "caption"
  | "captionBackground"
  | "frame";
export type QrForegroundTarget = "foreground" | "finderRing" | "finderPupil";

/** Parameters contain only context and constraints, never the encoded content or logo data. */
export interface QrErrorParams {
  INVALID_PAYLOAD: {};
  EMPTY_PAYLOAD: {};
  INVALID_ERROR_CORRECTION_LEVEL: {};
  INVALID_VERSION: { minimum: number; maximum: number };
  CAPACITY_EXCEEDED: { version?: number; errorCorrectionLevel: string };
  ENCODER_FAILURE: {};
  INVALID_MATRIX: {};
  INVALID_OUTPUT_SIZE: { minimum: number };
  INVALID_QUIET_ZONE: { minimum: number };
  SVG_DIMENSIONS_TOO_LARGE: {};
  INVALID_COLOR: { target: QrColorTarget };
  INVALID_MODULE_SHAPE: { target: "modules" | "finderCells" };
  INVALID_GRADIENT: {};
  INVALID_LOGO_OPTIONS: {};
  INVALID_LOGO_DATA: {};
  INVALID_LOGO_SIZE: { matrixSize: number };
  LOGO_OVERLAPS_FUNCTION_MODULES: {};
  INVALID_ARTWORK_SHAPE: {};
  INVALID_CAPTION_TEXT: {};
  INVALID_CAPTION_POSITION: {};
  DUPLICATE_CAPTION_POSITION: { position: "top" | "bottom" };
  INVALID_CAPTION_STYLE: {};
  ARC_CAPTION_REQUIRES_CIRCLE: {};
  INVALID_CAPTION_FONT_SIZE: {};
  INVALID_CAPTION_FONT_WEIGHT: {};
  INVALID_CAPTION_LETTER_SPACING: { minimum: number; maximum: number };
  INVALID_FRAME: {};
  INVALID_FRAME_STYLE: {};
  INVALID_FRAME_WIDTH: { maximumExclusive: number };
  INVALID_FINDER_OPTIONS: {};
  INVALID_FINDER_SHAPE: {};
  INVALID_CONTRAST_THRESHOLD: { minimum: number };
  INVALID_MODULE_PITCH_THRESHOLD: {};
}

export type QrErrorCode = keyof QrErrorParams;

/** Machine-readable diagnostics use the same convention as thrown errors. */
export interface QrDiagnosticParams {
  QUIET_ZONE_TOO_SMALL: { minimum: number };
  CONTRAST_BELOW_THRESHOLD: { target: QrForegroundTarget; actual: number; minimum: number };
  MODULE_PITCH_BELOW_THRESHOLD: { actual: number; minimum: number };
  FOREGROUND_NOT_DARKER: { target: QrForegroundTarget };
  GRADIENT_REQUIRES_DEVICE_TEST: {};
  MODULE_SHAPE_REQUIRES_DEVICE_TEST: {};
  FINDER_SHAPE_REQUIRES_DEVICE_TEST: {};
  LOGO_REDUCES_ERROR_CORRECTION: { coveragePercent: number };
  LOGO_OVERLAPS_FUNCTION_MODULES: {};
}
