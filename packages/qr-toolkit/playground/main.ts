import { encodeQr, renderQrSvg } from "../src/engine/index.js";

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing playground element: ${selector}`);
  return found;
}

const payload = element<HTMLTextAreaElement>("#payload");
const preview = element<HTMLImageElement>("#qr-preview");
const placeholder = element("#placeholder");
const error = element("#error");
const status = element("#status");
const download = element<HTMLButtonElement>("#download");
let imageUrl: string | undefined;

function update() {
  const previousUrl = imageUrl;
  imageUrl = undefined;
  download.disabled = true;
  preview.hidden = true;
  preview.removeAttribute("src");
  placeholder.hidden = false;
  status.textContent = "";
  error.hidden = true;
  error.textContent = "";

  if (payload.value.length > 0) {
    try {
      const matrix = encodeQr(payload.value);
      const svg = renderQrSvg(matrix);
      imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      preview.src = imageUrl;
      preview.hidden = false;
      placeholder.hidden = true;
      download.disabled = false;
      status.textContent = `Версия ${matrix.version} · ${matrix.size} × ${matrix.size} модулей · поля 4 модуля`;
      payload.setAttribute("aria-invalid", "false");
    } catch {
      error.textContent = "Не удалось создать QR. Попробуйте сократить содержимое.";
      error.hidden = false;
      payload.setAttribute("aria-invalid", "true");
    }
  } else {
    payload.setAttribute("aria-invalid", "false");
  }

  if (previousUrl) URL.revokeObjectURL(previousUrl);
}

payload.addEventListener("input", update);
download.addEventListener("click", () => {
  if (!imageUrl) return;
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = "qr-studio.svg";
  document.body.append(link);
  link.click();
  link.remove();
});
window.addEventListener("pagehide", () => {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) update();
});
update();
