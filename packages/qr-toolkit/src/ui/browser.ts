/** Local logo upload limit; never upload logos to a server. */
export const LOGO_MAX_FILE_SIZE_BYTES = 700 * 1024;
/** Bound canvas memory for programmatic hosts as well as the standard size selector. */
const MAX_CANVAS_PIXELS = 16_777_216;
export const SVG_MIME_TYPE = "image/svg+xml;charset=utf-8";

type BrowserIssueCode =
  | "logoFormat"
  | "logoTooLarge"
  | "logoInvalid"
  | "exportTooLarge"
  | "exportFailed"
  | "scanUnavailable";
export class QrBrowserError extends Error {
  constructor(readonly code: BrowserIssueCode) {
    super(code);
  }
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

export async function readQrLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new QrBrowserError("logoFormat");
  }
  if (file.size > LOGO_MAX_FILE_SIZE_BYTES) throw new QrBrowserError("logoTooLarge");
  try {
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new QrBrowserError("logoInvalid")),
        { once: true },
      );
      reader.addEventListener("error", () => reject(new QrBrowserError("logoInvalid")), {
        once: true,
      });
      reader.readAsDataURL(file);
    });
    await loadImage(dataUri);
    return dataUri;
  } catch {
    throw new QrBrowserError("logoInvalid");
  }
}

export async function rasterizeQrSvg(svg: string): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: SVG_MIME_TYPE }));
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS) {
      throw new QrBrowserError("exportTooLarge");
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new QrBrowserError("exportFailed");
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function qrPngBlob(svg: string): Promise<Blob> {
  const canvas = await rasterizeQrSvg(svg);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new QrBrowserError("exportFailed"))),
      "image/png",
    );
  });
}

export function downloadQrBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the browser begin the download before releasing the backing blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): {
    detect(source: CanvasImageSource): Promise<readonly { rawValue: string }[]>;
  };
  getSupportedFormats?: () => Promise<string[]>;
};
export async function scanQrSvg(
  svg: string,
  payload: string,
): Promise<"scanMatched" | "scanMismatch" | "scanMissing"> {
  const Detector = (
    globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (
    !Detector ||
    (Detector.getSupportedFormats && !(await Detector.getSupportedFormats()).includes("qr_code"))
  ) {
    throw new QrBrowserError("scanUnavailable");
  }
  const canvas = await rasterizeQrSvg(svg);
  const codes = await new Detector({ formats: ["qr_code"] }).detect(canvas);
  if (codes.some((code) => code.rawValue === payload)) return "scanMatched";
  return codes.length ? "scanMismatch" : "scanMissing";
}
