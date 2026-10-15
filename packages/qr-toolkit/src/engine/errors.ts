export type QrEncodingErrorCode =
  | "INVALID_PAYLOAD"
  | "EMPTY_PAYLOAD"
  | "INVALID_ERROR_CORRECTION_LEVEL"
  | "INVALID_VERSION"
  | "CAPACITY_EXCEEDED"
  | "ENCODER_FAILURE";

/** Stable error shape for UI consumers, without exposing encoder-specific text. */
export class QrEncodingError extends Error {
  readonly originalError?: unknown;

  constructor(
    readonly code: QrEncodingErrorCode,
    message: string,
    originalError?: unknown,
  ) {
    super(message);
    this.name = "QrEncodingError";
    this.originalError = originalError;
  }
}
