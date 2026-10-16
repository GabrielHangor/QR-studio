import type { QrErrorCode, QrErrorParams } from "./issues.js";

export type QrEncodingErrorCode =
  | "INVALID_PAYLOAD"
  | "EMPTY_PAYLOAD"
  | "INVALID_ERROR_CORRECTION_LEVEL"
  | "INVALID_VERSION"
  | "CAPACITY_EXCEEDED"
  | "ENCODER_FAILURE";

/** A locale-neutral error. Its message is a code; interfaces format code + params. */
export class QrError<C extends QrErrorCode = QrErrorCode> extends Error {
  readonly params: Readonly<QrErrorParams[C]>;

  constructor(
    readonly code: C,
    params: QrErrorParams[C],
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "QrError";
    this.params = Object.freeze({ ...params });
  }
}

/** Keep encoder failures distinguishable while sharing the public error contract. */
export class QrEncodingError<
  C extends QrEncodingErrorCode = QrEncodingErrorCode,
> extends QrError<C> {
  readonly originalError?: unknown;

  constructor(code: C, params: QrErrorParams[C], originalError?: unknown) {
    super(code, params, originalError === undefined ? undefined : { cause: originalError });
    this.name = "QrEncodingError";
    this.originalError = originalError;
  }
}
