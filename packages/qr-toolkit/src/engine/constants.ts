/** QR Model 2 supports versions 1–40 with a dimension of 17 + 4 × version. */
export const QR_VERSION_MIN = 1;
export const QR_VERSION_MAX = 40;
export const QR_VERSION_DIMENSION_BASE = 17;
export const QR_VERSION_DIMENSION_STEP = 4;

/** The standard clear border; the renderer uses the minimum as its default. */
export const QR_QUIET_ZONE_MIN_MODULES = 4;
export const QR_QUIET_ZONE_DEFAULT_MODULES = QR_QUIET_ZONE_MIN_MODULES;

/** Accepted ECC labels; this list also defines the type and runtime validation. */
export const ERROR_CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;
