import type { QrDesignPreset } from "@qr-studio/toolkit/editor";

// Caller-owned styles: no payload, captions or embedded assets are imposed on the user.
export const editorPresets = [
  {
    id: "classic",
    title: "Классика",
    description: "Чистая геометрия для документов, инструкций и повседневных задач.",
    design: { foreground: "#202833", finder: { outerShape: "square" } },
  },
  {
    id: "business",
    title: "Деловой",
    description: "Глубокий синий и строгие маркеры для визиток и деловых материалов.",
    design: {
      foreground: "#16345b",
      moduleShape: "rounded",
      finder: { outerShape: "rounded-top", innerShape: "square" },
      frame: { color: "#a7b6c9", widthPx: 2 },
    },
  },
  {
    id: "nordic",
    title: "Сканди",
    description: "Воздушная сетка на холодном светлом фоне для портфолио и цифровых продуктов.",
    design: {
      foreground: "#33485d",
      background: "#f1f5f8",
      moduleShape: "circle",
      finder: { outerShape: "soft", innerShape: "circle" },
    },
  },
  {
    id: "precision",
    title: "Точность",
    description: "Контрастный кобальт и квадратная сетка для навигации, табличек и инструкций.",
    design: {
      foreground: "#17449a",
      moduleShape: "square",
      finder: { outerShape: "square", innerShape: "rounded" },
      frame: { color: "#17449a", widthPx: 3 },
    },
  },
  {
    id: "sapphire",
    title: "Сапфир",
    description: "Сине-фиолетовый переход и выразительные маркеры для презентаций и афиш.",
    design: {
      foreground: {
        type: "linear",
        direction: "diagonal",
        startColor: "#143f83",
        endColor: "#503778",
      },
      moduleShape: "soft",
      finder: { outerShape: "rounded", innerShape: "rounded" },
    },
  },
  {
    id: "coffee",
    title: "Кофейня",
    description: "Шоколадная графика на сливочном фоне для меню, упаковки и небольших заведений.",
    design: {
      foreground: "#4e3428",
      background: "#fcf4e6",
      moduleShape: "rounded",
      finder: { outerShape: "rounded", innerShape: "circle" },
      frame: { color: "#a58b6d", widthPx: 2 },
    },
  },
  {
    id: "workshop",
    title: "Мастерская",
    description: "Терракота и скошенные формы для изделий ручной работы и авторских проектов.",
    design: {
      foreground: "#873d2c",
      background: "#fff6ed",
      moduleShape: "classy",
      finder: { outerShape: "classy-reverse", innerShape: "square" },
    },
  },
  {
    id: "botanical",
    title: "Ботаника",
    description: "Листовые формы и хвойный зелёный для цветов, косметики и природных коллекций.",
    design: {
      foreground: "#1e513d",
      background: "#f4f8ef",
      moduleShape: "leaf",
      finder: { outerShape: "leaf", innerShape: "leaf-reverse" },
    },
  },
  {
    id: "matcha",
    title: "Матча",
    description: "Мягкие точки на фисташковом фоне для кафе, студий и заботы о себе.",
    design: {
      foreground: "#36533a",
      background: "#edf3df",
      moduleShape: "circle",
      finder: { outerShape: "rounded", innerShape: "soft" },
    },
  },
  {
    id: "sandstone",
    title: "Песчаник",
    description: "Тёплый каменный оттенок и лаконичные формы для интерьеров и предметного дизайна.",
    design: {
      foreground: "#575045",
      background: "#f8f2e8",
      moduleShape: "rounded-bottom",
      finder: { outerShape: "rounded", innerShape: "square" },
      frame: { color: "#b7a58e", widthPx: 2 },
    },
  },
  {
    id: "ocean",
    title: "Океан",
    description: "Переход от морского синего к бирюзовому для путешествий и творческих проектов.",
    design: {
      foreground: {
        type: "linear",
        direction: "horizontal",
        startColor: "#123c69",
        endColor: "#17645e",
      },
      moduleShape: "circle",
      finder: { outerShape: "circle", innerShape: "circle" },
    },
  },
  {
    id: "north",
    title: "Север",
    description:
      "Ледяной фон и чёткие синие акценты для технологий, выставок и городской навигации.",
    design: {
      foreground: "#184b64",
      background: "#edf8fa",
      moduleShape: "soft",
      finder: { outerShape: "rounded", innerShape: "square", innerColor: "#1c6b73" },
      frame: { style: "dashed", color: "#638993", widthPx: 2 },
    },
  },
  {
    id: "iris",
    title: "Ирис",
    description:
      "Глубокий сливовый на лавандовом фоне для приглашений, студий и культурных событий.",
    design: {
      foreground: "#573565",
      background: "#f7f0fa",
      moduleShape: "leaf-reverse",
      finder: { outerShape: "soft", innerShape: "circle" },
    },
  },
  {
    id: "cherry",
    title: "Вишня",
    description:
      "Винная графика и мягкая геометрия для кондитерских, подарков и праздничной полиграфии.",
    design: {
      foreground: "#8a2946",
      background: "#fff2f3",
      moduleShape: "soft",
      finder: { outerShape: "rounded", innerShape: "rounded" },
      frame: { color: "#b76c7c", widthPx: 3 },
    },
  },
  {
    id: "graphite",
    title: "Графит",
    description: "Сдержанная монохромная композиция для архитектуры, галерей и печатных каталогов.",
    design: {
      foreground: "#252b34",
      background: "#eef0f2",
      moduleShape: "square",
      finder: { outerShape: "rounded", innerShape: "square" },
    },
  },
  {
    id: "seal",
    title: "Печать",
    description:
      "Тёмный круг с тонкой золотистой обводкой для этикеток, сертификатов и подарочной упаковки.",
    design: {
      foreground: "#1b3045",
      background: "#ffffff",
      artworkBackground: "#1b3045",
      shape: "circle",
      moduleShape: "rounded",
      finder: { outerShape: "rounded", innerShape: "square" },
      frame: { color: "#b99758", widthPx: 4 },
    },
  },
  {
    id: "olive",
    title: "Олива",
    description:
      "Природный медальон с белой подложкой для фермерских продуктов и натуральной косметики.",
    design: {
      foreground: "#344b35",
      background: "#ffffff",
      artworkBackground: "#e3e9d5",
      shape: "circle",
      moduleShape: "leaf",
      finder: { outerShape: "leaf", innerShape: "rounded" },
      frame: { color: "#7d8d65", widthPx: 3 },
    },
  },
  {
    id: "celebration",
    title: "Праздник",
    description:
      "Ягодный круг и контрастная светлая подложка для свадеб, приглашений и памятных событий.",
    design: {
      foreground: {
        type: "linear",
        direction: "vertical",
        startColor: "#70213c",
        endColor: "#923a57",
      },
      background: "#fff8f7",
      artworkBackground: "#f7dfe6",
      shape: "circle",
      moduleShape: "circle",
      finder: { outerShape: "soft", innerShape: "circle" },
      frame: { color: "#a85b71", widthPx: 2 },
    },
  },
  {
    id: "gallery",
    title: "Галерея",
    description:
      "Светлая квадратная композиция с графичной рамкой для выставок, портфолио и музейных табличек.",
    design: {
      foreground: "#292b35",
      background: "#ffffff",
      artworkBackground: "#f0e9df",
      moduleShape: "classy-reverse",
      finder: { outerShape: "rounded", innerShape: "circle" },
      frame: { color: "#292b35", widthPx: 4 },
    },
  },
  {
    id: "contour",
    title: "Контур",
    description: "Пунктирный круг и тонкая графика для наклеек, бейджей и упаковки.",
    design: {
      foreground: "#24455a",
      background: "#ffffff",
      artworkBackground: "#edf4f7",
      shape: "circle",
      moduleShape: "soft",
      finder: { outerShape: "circle", innerShape: "rounded" },
      frame: { style: "dashed", color: "#527f93", widthPx: 2 },
    },
  },
] as const satisfies readonly QrDesignPreset[];
