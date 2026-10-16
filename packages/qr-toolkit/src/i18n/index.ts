import { QrError } from "../engine/errors.js";
import type { QrErrorCode, QrErrorParams, QrDiagnosticParams } from "../engine/issues.js";
import type { QrDesignDiagnostic } from "../engine/types.js";

/** A host supplies its own language; engine code never imports a dictionary. */
export interface QrMessageCatalog {
  readonly errors: { readonly [C in QrErrorCode]: (params: Readonly<QrErrorParams[C]>) => string };
  readonly diagnostics: {
    readonly [C in keyof QrDiagnosticParams]: (params: Readonly<QrDiagnosticParams[C]>) => string;
  };
  readonly unknownError: string;
}

function translate<P, C extends keyof P>(
  messages: { readonly [K in keyof P]: (params: Readonly<P[K]>) => string },
  code: C,
  params: Readonly<P[C]>,
): string {
  return messages[code](params);
}

/** Unknown browser/library failures never expose arbitrary Error.message or cause to the UI. */
export function formatQrError(
  error: unknown,
  messages: QrMessageCatalog,
  fallback = messages.unknownError,
): string {
  return error instanceof QrError
    ? translate<QrErrorParams, QrErrorCode>(messages.errors, error.code, error.params)
    : fallback;
}

export function formatQrDiagnostic(
  diagnostic: QrDesignDiagnostic,
  messages: QrMessageCatalog,
): string {
  return translate<QrDiagnosticParams, keyof QrDiagnosticParams>(
    messages.diagnostics,
    diagnostic.code,
    diagnostic.params,
  );
}
