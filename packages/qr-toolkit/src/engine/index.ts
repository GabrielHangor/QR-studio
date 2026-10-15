export { encodeQr } from "./encoder.js";
export { QrEncodingError } from "./errors.js";
export type { QrEncodingErrorCode } from "./errors.js";
export { renderQrSvg } from "./renderer.js";
export { analyzeQrDesign } from "./diagnostics.js";
export type {
  AnalyzeQrDesignOptions,
  EncodeQrOptions,
  ErrorCorrectionLevel,
  QrCaptionOptions,
  QrDesignAnalysis,
  QrDesignDiagnostic,
  QrDesignDiagnosticCode,
  QrFinderPattern,
  QrLinearGradient,
  QrLogoOptions,
  QrMatrix,
  QrModuleShape,
  RenderQrSvgOptions,
} from "./types.js";
