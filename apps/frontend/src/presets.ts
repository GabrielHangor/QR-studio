import type { QrDesignPreset } from "@qr-studio/toolkit/editor";
import type { RenderQrSvgOptions } from "@qr-studio/toolkit/engine";

// The host owns this catalog. Designs contain no brand text or embedded assets.
const designs: readonly RenderQrSvgOptions[] = [
  { foreground: "#202833", finder: { outerShape: "square" } },
  {
    foreground: "#173d51",
    moduleShape: "soft",
    finder: { outerShape: "rounded", innerShape: "circle" },
  },
  {
    foreground: "#166534",
    background: "#f0fdf4",
    moduleShape: "rounded",
    shape: "circle",
    finder: { outerShape: "rounded" },
    frame: { color: "#166534", widthPx: 2 },
  },
  {
    foreground: "#881337",
    moduleShape: "leaf",
    finder: { outerShape: "leaf", innerShape: "rounded" },
  },
  {
    foreground: "#5b21b6",
    moduleShape: "circle",
    finder: { outerShape: "soft", innerShape: "circle" },
  },
  {
    foreground: "#202833",
    background: "#f1f5f9",
    moduleShape: "soft",
    finder: { outerShape: "circle", innerShape: "circle" },
    frame: { widthPx: 3 },
  },
  {
    foreground: {
      type: "linear",
      direction: "diagonal",
      startColor: "#173d51",
      endColor: "#115e59",
    },
    background: "#faf6ed",
    moduleShape: "rounded",
    finder: { outerShape: "rounded", innerShape: "circle" },
  },
  {
    foreground: "#202833",
    shape: "circle",
    moduleShape: "leaf-reverse",
    finder: { outerShape: "soft" },
    frame: { style: "dashed", widthPx: 2 },
  },
  {
    foreground: "#14532d",
    background: "#f0fdf4",
    moduleShape: "leaf-reverse",
    finder: { outerShape: "leaf-reverse" },
  },
  {
    foreground: "#78350f",
    background: "#fff7ed",
    moduleShape: "square",
    finder: { outerShape: "rounded", innerShape: "square" },
    frame: { color: "#78350f", widthPx: 2 },
  },
  {
    foreground: "#172554",
    shape: "circle",
    finder: { outerShape: "square", innerShape: "circle" },
    frame: { color: "#172554", widthPx: 3 },
  },
  {
    foreground: "#3730a3",
    background: "#f5f3ff",
    moduleShape: "soft",
    finder: { outerShape: "soft", innerShape: "square" },
  },
  {
    foreground: {
      type: "linear",
      direction: "horizontal",
      startColor: "#1e3a8a",
      endColor: "#115e59",
    },
    moduleShape: "circle",
    finder: { outerShape: "rounded", innerShape: "circle" },
  },
  {
    foreground: "#9f1239",
    background: "#fff1f2",
    moduleShape: "leaf",
    shape: "circle",
    finder: { outerShape: "rounded", innerShape: "leaf" },
    frame: { widthPx: 2, color: "#9f1239" },
  },
  {
    foreground: "#44403c",
    background: "#faf6ed",
    moduleShape: "rounded",
    finder: { outerShape: "leaf-reverse", innerShape: "circle" },
  },
  {
    foreground: "#202833",
    moduleShape: "soft",
    finder: { outerShape: "rounded", innerShape: "circle" },
    frame: { style: "dashed", widthPx: 2 },
  },
];

export const editorPresets: readonly QrDesignPreset[] = designs.map((design, index) => ({
  id: `preset-${index + 1}`,
  title: `Вариант ${index + 1}`,
  description: "",
  design,
}));
