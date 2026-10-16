export { encodeQr } from "./encoder.js";
export { QrError, QrEncodingError } from "./errors.js";
export type {
  QrErrorCode,
  QrErrorParams,
  QrDiagnosticParams,
  QrColorTarget,
  QrForegroundTarget,
} from "./issues.js";
export type { QrEncodingErrorCode } from "./errors.js";
export { renderQrSvg } from "./renderer.js";
export { analyzeQrDesign } from "./diagnostics.js";
export type {
  AnalyzeQrDesignOptions,
  EncodeQrOptions,
  ErrorCorrectionLevel,
  QrArtworkShape,
  QrCaptionOptions,
  QrDesignAnalysis,
  QrDesignDiagnostic,
  QrDesignDiagnosticCode,
  QrFinderPattern,
  QrFinderOptions,
  QrFrameOptions,
  QrLinearGradient,
  QrLogoOptions,
  QrMatrix,
  QrModuleShape,
  RenderQrSvgOptions,
} from "./types.js";
