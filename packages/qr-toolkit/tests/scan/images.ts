import type { ScanCase } from "./cases.js";

export function canvas(width: number, height = width): CanvasRenderingContext2D {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  return context;
}

/** Load actual SVG/PNG/JPEG bytes through the browser's image implementation. */
export async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function rasterizeSvg(svg: string): Promise<HTMLCanvasElement> {
  const image = await loadImage(new Blob([svg], { type: "image/svg+xml" }));
  const context = canvas(image.naturalWidth, image.naturalHeight);
  context.drawImage(image, 0, 0);
  return context.canvas;
}

export function encodeImage(
  source: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    source.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}.`))),
      type,
      quality,
    );
  });
}

/** Decode the exported PNG first, then put the full artwork on white paper, without cropping. */
export async function scanImage(png: Blob, effect: ScanCase["effect"]): Promise<Blob> {
  const image = await loadImage(png);
  // Moderate, fixed synthetic degradation; these values are test fixtures, not safe limits.
  const scale = effect === "reduce" ? 0.6 : 1;
  const context = canvas(
    Math.round(image.naturalWidth * scale),
    Math.round(image.naturalHeight * scale),
  );
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  if (effect === "blur") context.filter = "blur(0.6px)";
  context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
  return encodeImage(context.canvas, effect === "jpeg" ? "image/jpeg" : "image/png", 0.72);
}

/** A local synthetic PNG without font or network dependencies. */
export function logoDataUri(): string {
  const context = canvas(32);
  context.fillStyle = "#173d51";
  context.fillRect(0, 0, 32, 32);
  context.fillStyle = "#ffffff";
  context.fillRect(8, 8, 16, 16);
  return context.canvas.toDataURL("image/png");
}

export async function base64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Avoid argument limits when serializing large failure images.
  let result = "";
  for (const byte of bytes) result += String.fromCharCode(byte);
  return btoa(result);
}
