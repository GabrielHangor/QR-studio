import type { RenderQrSvgOptions } from "../../src/engine/index.js";

/** UI catalog metadata stays outside the headless engine; design is ordinary renderer data. */
interface DesignPresetFixture {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly design: Omit<RenderQrSvgOptions, "size" | "quietZone" | "logo">;
}

/** Fixed external designs shared by geometry and browser decoding tests. */
export const designPresets: readonly DesignPresetFixture[] = [
  {
    id: "minimal",
    title: "Минимализм",
    description: "Чёткая графика, тёмный цвет и свободное белое поле.",
    design: { foreground: "#202833", finder: { outerShape: "square" } },
  },
  {
    id: "atelier",
    title: "ATELIER — кофе",
    description: "Кремовый фон, глубокий зелёный и две надписи по дуге.",
    design: {
      shape: "circle",
      background: "#faf6ed",
      moduleShape: "rounded",
      foreground: {
        type: "linear",
        direction: "diagonal",
        startColor: "#173d51",
        endColor: "#32746a",
      },
      finder: {
        outerShape: "rounded",
        innerShape: "circle",
        outerColor: "#173d51",
        innerColor: "#32746a",
      },
      frame: { color: "#173d51", widthPx: 3 },
      caption: [
        {
          text: "ATELIER • COFFEE",
          position: "top",
          style: "arc",
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: 1,
          color: "#173d51",
        },
        {
          text: "МАЛЕНЬКИЕ РИТУАЛЫ",
          position: "bottom",
          style: "arc",
          fontSize: 20,
          letterSpacing: 0.5,
          color: "#32746a",
        },
      ],
    },
  },
  {
    id: "tech",
    title: "Технологичный",
    description: "Единый сине-фиолетовый градиент и цельные скруглённые маркеры.",
    design: {
      moduleShape: "rounded",
      foreground: {
        type: "linear",
        direction: "diagonal",
        startColor: "#12376b",
        endColor: "#5932a0",
      },
      finder: { outerShape: "rounded", innerShape: "rounded" },
      frame: { color: "#c5c8e7", widthPx: 2 },
      caption: { text: "EXPLORE MORE", fontWeight: 600, letterSpacing: 2, color: "#343b78" },
    },
  },
  {
    id: "bright",
    title: "Яркий",
    description: "Тёмная малиновая графика, круглые модули и контрастная подпись.",
    design: {
      background: "#fff8ed",
      moduleShape: "circle",
      foreground: "#932341",
      finder: {
        outerShape: "rounded",
        innerShape: "circle",
        outerColor: "#6a203d",
        innerColor: "#932341",
      },
      frame: { color: "#932341", widthPx: 4 },
      caption: {
        text: "НАЧНИТЕ ЗДЕСЬ",
        style: "banner",
        color: "#ffffff",
        background: "#932341",
        fontWeight: 700,
        letterSpacing: 1,
      },
    },
  },
  {
    id: "strict",
    title: "Строгий",
    description: "Монохромное оформление с разной иерархией верхней и нижней строк.",
    design: {
      foreground: "#171717",
      finder: { outerShape: "square" },
      frame: { color: "#171717", widthPx: 2 },
      caption: [
        { text: "QR STUDIO", position: "top", fontSize: 24, fontWeight: 700, letterSpacing: 2 },
        {
          text: "ОТКРЫТЬ ССЫЛКУ",
          position: "bottom",
          fontSize: 14,
          letterSpacing: 1,
          color: "#525252",
        },
      ],
    },
  },
  {
    id: "badge",
    title: "Брендовый знак",
    description: "Тёмный внешний фон, светлая QR-подложка и светлые надписи.",
    design: {
      shape: "circle",
      background: "#ffffff",
      artworkBackground: "#183d45",
      foreground: "#183d45",
      moduleShape: "rounded",
      finder: { outerShape: "rounded", innerShape: "circle" },
      frame: { color: "#d9b879", widthPx: 3 },
      caption: [
        {
          text: "MADE WITH CARE",
          position: "top",
          style: "arc",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: 1,
          color: "#fff5df",
        },
        {
          text: "ОТКРОЙТЕ ИСТОРИЮ",
          position: "bottom",
          style: "arc",
          fontSize: 18,
          letterSpacing: 0.5,
          color: "#d9b879",
        },
      ],
    },
  },
];
