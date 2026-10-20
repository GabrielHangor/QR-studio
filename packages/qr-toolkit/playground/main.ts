import {
  analyzeQrDesign,
  encodeQr,
  renderQrSvg,
  type ErrorCorrectionLevel,
  type QrArtworkShape,
  type QrCaptionOptions,
  type QrLinearGradient,
  type QrModuleShape,
  type RenderQrSvgOptions,
} from "../src/engine/index.js";
import { formatQrError, formatQrDiagnostic } from "../src/i18n/index.js";
import { qrMessagesRu } from "../src/i18n/ru.js";
import { playgroundPresets, type PlaygroundPreset } from "./presets.js";

const LOGO_MAX_FILE_SIZE_BYTES = 700 * 1024;
const SVG_MIME_TYPE = "image/svg+xml;charset=utf-8";
const DEFAULT_SAMPLE = "url";

const samples = {
  url: "https://example.com/qr?source=playground",
  unicode: "QR Studio — пробная генерация\nРусский текст, 123 и emoji ✓",
  long: "QR Studio playground: проверьте размер матрицы и скорость рендеринга. ".repeat(10),
  capacity: "A".repeat(100),
} as const;

type SampleName = keyof typeof samples;
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<readonly { rawValue: string }[]>;
};
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing playground element: ${selector}`);
  return found;
}

const sample = element<HTMLSelectElement>("#sample");
const designPreset = element<HTMLSelectElement>("#design-preset");
const presetDescription = element("#preset-description");
const payload = element<HTMLTextAreaElement>("#payload");
const ecc = element<HTMLSelectElement>("#ecc");
const version = element<HTMLInputElement>("#version");
const size = element<HTMLSelectElement>("#size");
const quietZone = element<HTMLInputElement>("#quiet-zone");
const moduleShape = element<HTMLSelectElement>("#module-shape");
const finderShape = element<HTMLSelectElement>("#finder-shape");
const finderInnerShape = element<HTMLSelectElement>("#finder-inner-shape");
const finderOuterCustomColor = element<HTMLInputElement>("#finder-outer-custom-color");
const finderInnerCustomColor = element<HTMLInputElement>("#finder-inner-custom-color");
const finderOuterColor = element<HTMLInputElement>("#finder-outer-color");
const finderInnerColor = element<HTMLInputElement>("#finder-inner-color");
const finderOuterColorField = element("#finder-outer-color-field");
const finderInnerColorField = element("#finder-inner-color-field");
const foreground = element<HTMLInputElement>("#foreground");
const background = element<HTMLInputElement>("#background");
const separateArtworkBackground = element<HTMLInputElement>("#separate-artwork-background");
const artworkBackground = element<HTMLInputElement>("#artwork-background");
const artworkBackgroundField = element("#artwork-background-field");
const gradientDirection = element<HTMLSelectElement>("#gradient-direction");
const gradientEnd = element<HTMLInputElement>("#gradient-end");
const gradientEndField = element("#gradient-end-field");
const frame = element<HTMLSelectElement>("#frame");
const frameColor = element<HTMLInputElement>("#frame-color");
const frameWidth = element<HTMLInputElement>("#frame-width");
const frameFields = element("#frame-fields");
const artworkShape = element<HTMLSelectElement>("#artwork-shape");
const logoInput = element<HTMLInputElement>("#logo");
const logoWidth = element<HTMLInputElement>("#logo-width");
const logoPadding = element<HTMLInputElement>("#logo-padding");
function bindCaption(id: string, position: "top" | "bottom") {
  return {
    position,
    text: element<HTMLInputElement>(`#${id}`),
    style: element<HTMLSelectElement>(`#${id}-style`),
    fontSize: element<HTMLInputElement>(`#${id}-font-size`),
    fontWeight: element<HTMLSelectElement>(`#${id}-font-weight`),
    letterSpacing: element<HTMLInputElement>(`#${id}-letter-spacing`),
    color: element<HTMLInputElement>(`#${id}-color`),
    background: element<HTMLInputElement>(`#${id}-background`),
    backgroundField: element(`#${id}-background-field`),
    arcOption: element<HTMLOptionElement>(`#${id}-arc-option`),
  };
}
const captionControls = [bindCaption("caption-top", "top"), bindCaption("caption", "bottom")];
let availablePresets: readonly PlaygroundPreset[] = [];
const preview = element<HTMLImageElement>("#qr-preview");
const placeholder = element("#placeholder");
const status = element("#status");
const metrics = element("#metrics");
const diagnosticList = element<HTMLUListElement>("#diagnostic-list");
const error = element("#error");
const downloadSvg = element<HTMLButtonElement>("#download-svg");
const downloadPng = element<HTMLButtonElement>("#download-png");
const scanCurrent = element<HTMLButtonElement>("#scan-current");
const scanResult = element("#scan-result");
const openSvg = element<HTMLAnchorElement>("#open-svg");

let svgUrl: string | undefined;
let svgMarkup: string | undefined;
let generatedPayload: string | undefined;
let logoDataUri: string | undefined;
let logoReadSequence = 0;

function getRenderOptions(): RenderQrSvgOptions {
  const direction = gradientDirection.value;
  const fill: string | QrLinearGradient =
    direction === "solid"
      ? foreground.value
      : {
          type: "linear",
          direction: direction as QrLinearGradient["direction"],
          startColor: foreground.value,
          endColor: gradientEnd.value,
        };
  const logo = logoDataUri
    ? {
        dataUri: logoDataUri,
        widthModules: Number(logoWidth.value),
        paddingModules: Number(logoPadding.value),
      }
    : undefined;
  const captionOptions: QrCaptionOptions[] = [];
  for (const control of captionControls) {
    if (!control.text.value.trim()) continue;
    captionOptions.push({
      text: control.text.value,
      position: control.position,
      style: control.style.value as QrCaptionOptions["style"],
      fontSize: Number(control.fontSize.value),
      fontWeight: Number(control.fontWeight.value) as QrCaptionOptions["fontWeight"],
      letterSpacing: Number(control.letterSpacing.value),
      color: control.color.value,
      background: control.background.value,
    });
  }

  return {
    size: Number(size.value),
    quietZone: Number(quietZone.value),
    foreground: fill,
    background: background.value,
    artworkBackground: separateArtworkBackground.checked
      ? artworkBackground.value
      : background.value,
    moduleShape: moduleShape.value as QrModuleShape,
    finder: {
      outerShape: finderShape.value as QrModuleShape,
      innerShape: finderInnerShape.value as QrModuleShape,
      ...(finderOuterCustomColor.checked ? { outerColor: finderOuterColor.value } : {}),
      ...(finderInnerCustomColor.checked ? { innerColor: finderInnerColor.value } : {}),
    },
    frame:
      frame.value === "outline"
        ? { style: "outline", color: frameColor.value, widthPx: Number(frameWidth.value) }
        : "none",
    shape: artworkShape.value as QrArtworkShape,
    ...(logo ? { logo } : {}),
    ...(captionOptions.length ? { caption: captionOptions } : {}),
  };
}

function resetOutput(previousUrl: string | undefined): void {
  svgUrl = undefined;
  svgMarkup = undefined;
  generatedPayload = undefined;
  downloadSvg.disabled = true;
  downloadPng.disabled = true;
  scanCurrent.disabled = true;
  preview.hidden = true;
  preview.removeAttribute("src");
  placeholder.hidden = false;
  openSvg.hidden = true;
  openSvg.removeAttribute("href");
  status.textContent = "";
  metrics.textContent = "";
  diagnosticList.replaceChildren();
  scanResult.textContent = "";
  error.hidden = true;
  error.textContent = "";
  if (previousUrl) URL.revokeObjectURL(previousUrl);
}

function update(): void {
  const previousUrl = svgUrl;
  resetOutput(previousUrl);
  gradientEndField.hidden = gradientDirection.value === "solid";
  finderOuterColorField.hidden = !finderOuterCustomColor.checked;
  finderInnerColorField.hidden = !finderInnerCustomColor.checked;
  artworkBackgroundField.hidden = !separateArtworkBackground.checked;
  frameFields.hidden = frame.value !== "outline";
  for (const control of captionControls) {
    control.arcOption.disabled = artworkShape.value !== "circle";
    if (control.arcOption.disabled && control.style.value === "arc") control.style.value = "plain";
    control.backgroundField.hidden = control.style.value !== "banner";
  }

  if (payload.value.length === 0) {
    payload.setAttribute("aria-invalid", "false");
    return;
  }

  try {
    const selectedVersion = version.value.trim();
    const matrix = encodeQr(payload.value, {
      errorCorrectionLevel: ecc.value as ErrorCorrectionLevel,
      ...(selectedVersion ? { version: Number(selectedVersion) } : {}),
    });
    const renderOptions = getRenderOptions();
    const svg = renderQrSvg(matrix, renderOptions);
    const analysis = analyzeQrDesign(matrix, renderOptions);
    const blob = new Blob([svg], { type: SVG_MIME_TYPE });

    svgMarkup = svg;
    generatedPayload = payload.value;
    svgUrl = URL.createObjectURL(blob);
    preview.src = svgUrl;
    preview.hidden = false;
    placeholder.hidden = true;
    openSvg.href = svgUrl;
    openSvg.hidden = false;
    downloadSvg.disabled = false;
    downloadPng.disabled = false;
    scanCurrent.disabled = false;
    payload.setAttribute("aria-invalid", "false");
    status.textContent = `Версия ${matrix.version} · ${matrix.size} × ${matrix.size} модулей · ECC ${matrix.errorCorrectionLevel}`;

    const contrast =
      analysis.contrastRatio === null
        ? "градиент — без одного значения"
        : `${analysis.contrastRatio.toFixed(2)}:1`;
    const logoCoverage =
      analysis.logoCoveragePercent === null
        ? "логотип не добавлен"
        : `логотип занимает ${analysis.logoCoveragePercent.toFixed(1)}% символа`;
    metrics.textContent = `Шаг модуля: ${analysis.modulePitchPx.toFixed(2)} px · контраст: ${contrast} · ${logoCoverage}`;

    if (analysis.diagnostics.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Предупреждений Renderer нет. Это не гарантирует сканирование.";
      diagnosticList.append(item);
    } else {
      for (const diagnostic of analysis.diagnostics) {
        const item = document.createElement("li");
        item.className = diagnostic.severity;
        item.textContent = formatQrDiagnostic(diagnostic, qrMessagesRu);
        diagnosticList.append(item);
      }
    }
  } catch (caught) {
    payload.setAttribute("aria-invalid", "true");
    error.textContent = formatQrError(
      caught,
      qrMessagesRu,
      "Не удалось создать QR. Попробуйте ещё раз.",
    );
    error.hidden = false;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: SVG_MIME_TYPE }));
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function renderSvgToCanvas(svg: string): Promise<HTMLCanvasElement> {
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не смог создать canvas для PNG.");
  context.drawImage(image, 0, 0);
  return canvas;
}

function selectSample(name: string): void {
  sample.value = name;
  if (name === "custom") return;

  const chosen = name as SampleName;
  payload.value = samples[chosen];
  version.value = name === "capacity" ? "1" : "";
  sample.focus();
  update();
}

sample.add(new Option("Свой текст", "custom"));
sample.value = DEFAULT_SAMPLE;
payload.value = samples[DEFAULT_SAMPLE];
sample.addEventListener("change", () => selectSample(sample.value));
payload.addEventListener("input", () => {
  sample.value = "custom";
  if (version.value === "1" && payload.value !== samples.capacity) version.value = "";
  update();
});

for (const control of [
  ecc,
  version,
  size,
  quietZone,
  moduleShape,
  finderShape,
  finderInnerShape,
  finderOuterCustomColor,
  finderInnerCustomColor,
  finderOuterColor,
  finderInnerColor,
  foreground,
  background,
  separateArtworkBackground,
  artworkBackground,
  gradientDirection,
  gradientEnd,
  frame,
  frameColor,
  frameWidth,
  artworkShape,
  logoWidth,
  logoPadding,
  ...captionControls.flatMap((captionControl) => [
    captionControl.text,
    captionControl.style,
    captionControl.fontSize,
    captionControl.fontWeight,
    captionControl.letterSpacing,
    captionControl.color,
    captionControl.background,
  ]),
]) {
  control.addEventListener("input", () => {
    if (![ecc, version, size, quietZone, logoWidth, logoPadding].includes(control)) {
      designPreset.value = "custom";
      presetDescription.textContent =
        "Своё оформление. Содержимое QR и параметры кодирования независимы от пресетов.";
    }
    update();
  });
}

/** Replace the demo catalog with any caller-supplied catalog, without changing the design. */
export function setPlaygroundPresets(presets: readonly PlaygroundPreset[]): void {
  if (
    new Set(presets.map(({ id }) => id)).size !== presets.length ||
    presets.some(({ id }) => !id || id === "custom")
  ) {
    throw new TypeError("Preset IDs must be unique, non-empty, and different from custom.");
  }
  availablePresets = [...presets];
  designPreset.replaceChildren(
    new Option("Своё оформление", "custom"),
    ...presets.map((preset) => new Option(preset.title, preset.id)),
  );
  designPreset.value = "custom";
  presetDescription.textContent = "Выберите оформление или настройте его вручную.";
}

/** Apply external renderer design data to UI; content, ECC, size, quiet zone and logo stay independent. */
export function applyPlaygroundDesign(design: PlaygroundPreset["design"]): void {
  const fill = design.foreground ?? "#202833";
  foreground.value = typeof fill === "string" ? fill : fill.startColor;
  gradientDirection.value = typeof fill === "string" ? "solid" : fill.direction;
  gradientEnd.value = typeof fill === "string" ? "#536dfe" : fill.endColor;
  background.value = design.background ?? "#ffffff";
  separateArtworkBackground.checked =
    design.artworkBackground !== undefined && design.artworkBackground !== background.value;
  artworkBackground.value = design.artworkBackground ?? background.value;
  artworkShape.value = design.shape ?? "square";
  moduleShape.value = design.moduleShape ?? "square";
  finderShape.value = design.finder?.outerShape ?? design.finderShape ?? "square";
  finderInnerShape.value = design.finder?.innerShape ?? finderShape.value;
  finderOuterCustomColor.checked = design.finder?.outerColor !== undefined;
  finderInnerCustomColor.checked = design.finder?.innerColor !== undefined;
  finderOuterColor.value = design.finder?.outerColor ?? foreground.value;
  finderInnerColor.value = design.finder?.innerColor ?? foreground.value;
  const frameOptions = typeof design.frame === "object" ? design.frame : undefined;
  frame.value = frameOptions
    ? (frameOptions.style ?? "outline")
    : typeof design.frame === "string"
      ? design.frame
      : "none";
  frameColor.value = frameOptions?.color ?? foreground.value;
  frameWidth.value = String(frameOptions?.widthPx ?? 2);
  const captions: readonly QrCaptionOptions[] =
    design.caption === undefined
      ? []
      : Array.isArray(design.caption)
        ? design.caption
        : [design.caption as QrCaptionOptions];
  for (const control of captionControls) {
    const options = captions.find((caption) => (caption.position ?? "bottom") === control.position);
    control.text.value = options?.text ?? "";
    control.style.value = options?.style ?? "plain";
    control.fontSize.value = String(options?.fontSize ?? 18);
    control.fontWeight.value = String(options?.fontWeight ?? 400);
    control.letterSpacing.value = String(options?.letterSpacing ?? 0);
    control.color.value = options?.color ?? foreground.value;
    control.background.value = options?.background ?? background.value;
  }
  designPreset.value = "custom";
  presetDescription.textContent =
    "Своё оформление. Содержимое QR и параметры кодирования независимы от пресетов.";
  update();
}

designPreset.addEventListener("change", () => {
  const preset = availablePresets.find(({ id }) => id === designPreset.value);
  if (!preset) {
    presetDescription.textContent = "Своё оформление. Настройки можно менять независимо.";
    return;
  }
  applyPlaygroundDesign(preset.design);
  designPreset.value = preset.id;
  presetDescription.textContent = preset.description;
});

logoInput.addEventListener("change", () => {
  const sequence = ++logoReadSequence;
  const file = logoInput.files?.[0];
  logoDataUri = undefined;
  update();

  if (!file) {
    return;
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    error.textContent = "Выберите PNG, JPEG или WebP. SVG-файлы не поддерживаются.";
    error.hidden = false;
    return;
  }
  if (file.size > LOGO_MAX_FILE_SIZE_BYTES) {
    error.textContent = "Файл логотипа должен быть не больше 700 КБ.";
    error.hidden = false;
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (sequence !== logoReadSequence || typeof reader.result !== "string") return;
    logoDataUri = reader.result;
    update();
  });
  reader.addEventListener("error", () => {
    if (sequence !== logoReadSequence) return;
    update();
    error.textContent = "Не удалось прочитать файл логотипа.";
    error.hidden = false;
  });
  reader.readAsDataURL(file);
});

downloadSvg.addEventListener("click", () => {
  if (!svgMarkup) return;
  downloadBlob(new Blob([svgMarkup], { type: SVG_MIME_TYPE }), "qr-studio.svg");
});

downloadPng.addEventListener("click", async () => {
  if (!svgMarkup) return;
  downloadPng.disabled = true;
  error.hidden = true;
  try {
    const canvas = await renderSvgToCanvas(svgMarkup);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Браузер не смог создать PNG."));
      }, "image/png");
    });
    downloadBlob(png, "qr-studio.png");
  } catch (caught) {
    error.textContent = formatQrError(
      caught,
      qrMessagesRu,
      "Не удалось экспортировать PNG. Попробуйте ещё раз.",
    );
    error.hidden = false;
  } finally {
    downloadPng.disabled = !svgMarkup;
  }
});

scanCurrent.addEventListener("click", async () => {
  if (!svgMarkup || !generatedPayload) return;
  const detectorType = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  if (!detectorType) {
    scanResult.textContent =
      "BarcodeDetector недоступен в этом браузере. Откройте QR на другом экране и проверьте камерой телефона.";
    return;
  }

  scanCurrent.disabled = true;
  scanResult.textContent = "Растеризуем SVG в canvas и ищем QR…";
  try {
    const canvas = await renderSvgToCanvas(svgMarkup);
    const detector = new detectorType({ formats: ["qr_code"] });
    const codes = await detector.detect(canvas);
    const matchingCode = codes.find((code) => code.rawValue === generatedPayload);
    if (matchingCode) {
      scanResult.textContent = "Декодировано из растеризованного SVG; текст полностью совпадает.";
    } else if (codes.length > 0) {
      scanResult.textContent = `Декодер распознал QR, но содержимое не совпало. Получено: ${codes[0]?.rawValue ?? "пустое значение"}`;
    } else {
      scanResult.textContent =
        "Браузер не распознал QR в текущем SVG. Попробуйте квадратные модули, тёмный foreground и более крупный экспорт.";
    }
  } catch (caught) {
    scanResult.textContent = formatQrError(
      caught,
      qrMessagesRu,
      "Не удалось проверить QR декодером браузера. Попробуйте ещё раз или проверьте QR камерой телефона.",
    );
  } finally {
    scanCurrent.disabled = !svgMarkup;
  }
});

window.addEventListener("pagehide", () => {
  if (svgUrl) URL.revokeObjectURL(svgUrl);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) update();
});

setPlaygroundPresets(playgroundPresets);
applyPlaygroundDesign(playgroundPresets[0]!.design);
designPreset.value = playgroundPresets[0]!.id;
presetDescription.textContent = playgroundPresets[0]!.description;
