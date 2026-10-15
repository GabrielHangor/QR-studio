/** QR Model 2 supports versions 1–40 with a dimension of 17 + 4 × version. */
export const QR_VERSION_MIN = 1;
export const QR_VERSION_MAX = 40;
export const QR_VERSION_DIMENSION_BASE = 17;
export const QR_VERSION_DIMENSION_STEP = 4;

/** Each finder pattern is a 7 × 7 block inside the QR symbol. */
export const QR_FINDER_PATTERN_SIZE = 7;

/** Default SVG output width when a caller does not choose a size. */
export const QR_SVG_DEFAULT_SIZE_PX = 512;

/** Space between an optional outline and the required QR quiet zone. */
export const QR_FRAME_PADDING_MODULES = 1;

/** The standard clear border; the renderer uses the minimum as its default. */
export const QR_QUIET_ZONE_MIN_MODULES = 4;
export const QR_QUIET_ZONE_DEFAULT_MODULES = QR_QUIET_ZONE_MIN_MODULES;

/** Accepted ECC labels; this list also defines the type and runtime validation. */
export const ERROR_CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;
