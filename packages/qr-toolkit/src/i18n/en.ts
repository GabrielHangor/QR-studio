import type { QrColorTarget, QrForegroundTarget } from "../engine/issues.js";
import type { QrMessageCatalog } from "./index.js";

const number = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const n = (value: number) => number.format(value);
const colors: Record<QrColorTarget, string> = {
  foreground: "module color",
  background: "QR background color",
  artworkBackground: "outer background color",
  finderRing: "finder ring color",
  finderPupil: "finder center color",
  caption: "caption color",
  captionBackground: "caption banner color",
  frame: "frame color",
};
const foregrounds: Record<QrForegroundTarget, string> = {
  foreground: "modules",
  finderRing: "finder rings",
  finderPupil: "finder centers",
};

/** Optional English catalog; the host chooses which language to use. */
export const qrMessagesEn: QrMessageCatalog = {
  unknownError: "The operation could not be completed. Please try again.",
  errors: {
    INVALID_PAYLOAD: () => "QR content must be text.",
    EMPTY_PAYLOAD: () => "Enter a URL or text for the QR code.",
    INVALID_ERROR_CORRECTION_LEVEL: () => "Choose an error correction level: L, M, Q or H.",
    INVALID_VERSION: ({ minimum, maximum }) =>
      `QR version must be an integer from ${n(minimum)} to ${n(maximum)}.`,
    CAPACITY_EXCEEDED: ({ version, errorCorrectionLevel }) =>
      version === undefined
        ? `The content does not fit in a QR code at error correction level ${errorCorrectionLevel}. Shorten the text or choose another error correction level.`
        : `The content does not fit in QR version ${n(version)} at error correction level ${errorCorrectionLevel}. Enable automatic version selection, increase the version or shorten the text.`,
    ENCODER_FAILURE: () =>
      "The content could not be encoded. Try changing it and generating again.",
    INVALID_MATRIX: () => "The QR data could not be read. Generate the code again.",
    INVALID_OUTPUT_SIZE: ({ minimum }) =>
      `Image width must be an integer of at least ${n(minimum)} px.`,
    INVALID_QUIET_ZONE: ({ minimum }) =>
      `The quiet zone around the QR code must be an integer of at least ${n(minimum)} modules.`,
    SVG_DIMENSIONS_TOO_LARGE: () => "The image dimensions or margins are too large. Reduce them.",
    INVALID_COLOR: ({ target }) =>
      `Set the ${colors[target]} in #RGB or #RRGGBB format, without transparency.`,
    INVALID_MODULE_SHAPE: ({ target }) =>
      target === "modules"
        ? "Choose one of the available QR dot shapes."
        : "Choose one of the available finder cell shapes.",
    INVALID_GRADIENT: () =>
      "Choose two opaque colors and a horizontal, vertical or diagonal direction for the gradient.",
    INVALID_LOGO_OPTIONS: () => "The logo settings could not be read. Select the logo again.",
    INVALID_LOGO_DATA: () =>
      "The logo is too large or uses an unsupported format. Use PNG, JPEG or WebP; SVG is not supported.",
    INVALID_LOGO_SIZE: () =>
      "The logo and its padding do not fit inside the QR code. Reduce the logo size or padding.",
    LOGO_OVERLAPS_FUNCTION_MODULES: () =>
      "The logo covers QR function patterns. Reduce the logo size or padding.",
    INVALID_CODE_SCALE: () => "QR scale must be a finite number greater than zero.",
    INVALID_ARTWORK_SHAPE: () => "Choose a square or circular overall shape.",
    INVALID_CAPTION_TEXT: () => "Enter caption text or remove the caption from the design.",
    INVALID_CAPTION_POSITION: () => "Place the caption above or below the QR code.",
    DUPLICATE_CAPTION_POSITION: ({ position }) =>
      `Only one caption is allowed at the ${position === "top" ? "top" : "bottom"}.`,
    INVALID_CAPTION_STYLE: () => "Choose plain text, a background banner or curved text.",
    ARC_CAPTION_REQUIRES_CIRCLE: () => "Choose a circular overall shape for curved text.",
    INVALID_CAPTION_FONT_SIZE: () => "Font size must be a positive number.",
    INVALID_CAPTION_FONT_WEIGHT: () => "Choose a regular, medium, semibold or bold font weight.",
    INVALID_CAPTION_LETTER_SPACING: ({ minimum, maximum }) =>
      `Letter spacing must be between ${n(minimum)} and ${n(maximum)} px.`,
    INVALID_FRAME: () => "The frame settings could not be read. Choose the frame settings again.",
    INVALID_FRAME_STYLE: () => "Choose a solid outline, dashed outline or no frame.",
    INVALID_FRAME_WIDTH: ({ maximumExclusive }) =>
      `Frame width must be greater than zero and less than ${n(maximumExclusive)} px.`,
    INVALID_FINDER_OPTIONS: () => "The finder settings could not be read. Set them again.",
    INVALID_FINDER_SHAPE: () =>
      "Choose one of the available shapes for the finder rings and centers.",
    INVALID_CONTRAST_THRESHOLD: ({ minimum }) =>
      `The contrast threshold must be a number of at least ${n(minimum)}.`,
    INVALID_MODULE_PITCH_THRESHOLD: () =>
      "Minimum module size must be a positive number in pixels.",
  },
  diagnostics: {
    QUIET_ZONE_TOO_SMALL: ({ minimum }) =>
      `Keep a quiet zone of at least ${n(minimum)} modules around the QR code.`,
    QUIET_ZONE_CLIPPED: () =>
      "Scaling above 100% reduces the QR quiet zone. Reduce the scale or test scanning on the target devices.",
    CONTRAST_BELOW_THRESHOLD: ({ target, actual, minimum }) =>
      `Contrast for the ${foregrounds[target]} is ${n(actual)}:1, below the specified threshold of ${n(minimum)}:1. Use a darker color or a lighter background.`,
    MODULE_PITCH_BELOW_THRESHOLD: ({ actual, minimum }) =>
      `Module size is ${n(actual)} px, below the specified minimum of ${n(minimum)} px. Increase the export size.`,
    FOREGROUND_NOT_DARKER: ({ target }) =>
      `The ${foregrounds[target]} are not darker than the background. Support for light QR patterns on a dark background depends on the scanner.`,
    GRADIENT_REQUIRES_DEVICE_TEST: () =>
      "Gradient contrast varies across the QR code. Test scanning on the target devices.",
    MODULE_SHAPE_REQUIRES_DEVICE_TEST: () =>
      "Custom module shapes may affect scanning. Test the QR code on the target devices.",
    FINDER_SHAPE_REQUIRES_DEVICE_TEST: () =>
      "Custom finder shapes may affect QR recognition. Test the code on the target devices.",
    LOGO_REDUCES_ERROR_CORRECTION: ({ coveragePercent }) =>
      `The logo and its background cover about ${n(coveragePercent)}% of the QR area. Error correction does not guarantee scanning with a logo. Test the result on the target devices.`,
    LOGO_OVERLAPS_FUNCTION_MODULES: () =>
      "The logo background overlaps QR function patterns. Reduce the logo size or padding.",
  },
};
