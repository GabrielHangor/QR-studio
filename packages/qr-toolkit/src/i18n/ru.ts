import type { QrColorTarget, QrForegroundTarget } from "../engine/issues.js";
import type { QrMessageCatalog } from "./index.js";

const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const n = (value: number) => number.format(value);
const colors: Record<QrColorTarget, string> = {
  foreground: "цвет модулей",
  background: "цвет фона QR",
  artworkBackground: "цвет внешнего фона",
  finderRing: "цвет колец маркеров",
  finderPupil: "цвет центров маркеров",
  caption: "цвет надписи",
  captionBackground: "цвет полосы надписи",
  frame: "цвет рамки",
};
const foregrounds: Record<QrForegroundTarget, string> = {
  foreground: "модулей",
  finderRing: "колец маркеров",
  finderPupil: "центров маркеров",
};

/** Optional Russian catalog. Other languages implement the same typed contract. */
export const qrMessagesRu: QrMessageCatalog = {
  unknownError: "Не удалось выполнить операцию. Попробуйте ещё раз.",
  errors: {
    INVALID_PAYLOAD: () => "Содержимое QR должно быть текстом.",
    EMPTY_PAYLOAD: () => "Введите ссылку или текст для QR-кода.",
    INVALID_ERROR_CORRECTION_LEVEL: () => "Выберите уровень коррекции ошибок: L, M, Q или H.",
    INVALID_VERSION: ({ minimum, maximum }) =>
      `Версия QR должна быть целым числом от ${n(minimum)} до ${n(maximum)}.`,
    CAPACITY_EXCEEDED: ({ version, errorCorrectionLevel }) =>
      version === undefined
        ? `Содержимое не помещается в QR при коррекции ошибок ${errorCorrectionLevel}. Сократите текст или выберите другой уровень коррекции.`
        : `Содержимое не помещается в QR версии ${n(version)} при коррекции ошибок ${errorCorrectionLevel}. Включите автоматический выбор версии, увеличьте версию или сократите текст.`,
    ENCODER_FAILURE: () =>
      "Не удалось закодировать содержимое. Попробуйте изменить его и повторить генерацию.",
    INVALID_MATRIX: () => "Не удалось прочитать данные QR. Создайте код заново.",
    INVALID_OUTPUT_SIZE: ({ minimum }) =>
      `Ширина изображения должна быть целым числом не меньше ${n(minimum)} px.`,
    INVALID_QUIET_ZONE: ({ minimum }) =>
      `Свободное поле вокруг QR должно быть целым числом не меньше ${n(minimum)} модулей.`,
    SVG_DIMENSIONS_TOO_LARGE: () => "Размер изображения или отступы слишком велики. Уменьшите их.",
    INVALID_COLOR: ({ target }) =>
      `Укажите ${colors[target]} в формате #RGB или #RRGGBB, без прозрачности.`,
    INVALID_MODULE_SHAPE: ({ target }) =>
      target === "modules"
        ? "Выберите одну из доступных форм точек QR."
        : "Выберите одну из доступных форм клеток маркеров.",
    INVALID_GRADIENT: () =>
      "Для градиента выберите два непрозрачных цвета и направление: горизонтальное, вертикальное или диагональное.",
    INVALID_LOGO_OPTIONS: () => "Не удалось прочитать настройки логотипа. Выберите логотип заново.",
    INVALID_LOGO_DATA: () =>
      "Логотип слишком большой или имеет неподдерживаемый формат. Используйте PNG, JPEG или WebP; SVG не поддерживается.",
    INVALID_LOGO_SIZE: () =>
      "Логотип с отступами не помещается внутри QR. Уменьшите его размер или отступы.",
    LOGO_OVERLAPS_FUNCTION_MODULES: () =>
      "Логотип закрывает служебные элементы QR. Уменьшите логотип или отступы вокруг него.",
    INVALID_ARTWORK_SHAPE: () => "Выберите квадратную или круглую общую форму.",
    INVALID_CAPTION_TEXT: () => "Введите текст надписи или удалите её из оформления.",
    INVALID_CAPTION_POSITION: () => "Надпись можно разместить сверху или снизу QR.",
    DUPLICATE_CAPTION_POSITION: ({ position }) =>
      `Для ${position === "top" ? "верхней" : "нижней"} стороны можно задать только одну надпись.`,
    INVALID_CAPTION_STYLE: () => "Выберите обычный текст, полосу с фоном или надпись по дуге.",
    ARC_CAPTION_REQUIRES_CIRCLE: () => "Для надписи по дуге выберите круглую общую форму.",
    INVALID_CAPTION_FONT_SIZE: () => "Размер текста должен быть положительным числом.",
    INVALID_CAPTION_FONT_WEIGHT: () =>
      "Выберите насыщенность текста: обычную, среднюю, полужирную или жирную.",
    INVALID_CAPTION_LETTER_SPACING: ({ minimum, maximum }) =>
      `Межбуквенный интервал должен быть от ${n(minimum)} до ${n(maximum)} px.`,
    INVALID_FRAME: () => "Не удалось прочитать настройки рамки. Выберите оформление рамки заново.",
    INVALID_FRAME_STYLE: () => "Выберите сплошную, пунктирную рамку или оформление без рамки.",
    INVALID_FRAME_WIDTH: ({ maximumExclusive }) =>
      `Толщина рамки должна быть больше нуля и меньше ${n(maximumExclusive)} px.`,
    INVALID_FINDER_OPTIONS: () =>
      "Не удалось прочитать настройки угловых маркеров. Задайте их заново.",
    INVALID_FINDER_SHAPE: () => "Выберите одну из доступных форм кольца и центра маркеров.",
    INVALID_CONTRAST_THRESHOLD: ({ minimum }) =>
      `Порог контраста должен быть числом не меньше ${n(minimum)}.`,
    INVALID_MODULE_PITCH_THRESHOLD: () =>
      "Минимальный размер модуля должен быть положительным числом в пикселях.",
  },
  diagnostics: {
    QUIET_ZONE_TOO_SMALL: ({ minimum }) =>
      `Свободное поле вокруг QR должно быть не меньше ${n(minimum)} модулей.`,
    CONTRAST_BELOW_THRESHOLD: ({ target, actual, minimum }) =>
      `Контраст ${foregrounds[target]} — ${n(actual)}:1, ниже заданного порога ${n(minimum)}:1. Сделайте цвет темнее или фон светлее.`,
    MODULE_PITCH_BELOW_THRESHOLD: ({ actual, minimum }) =>
      `Размер модуля — ${n(actual)} px, меньше заданного минимума ${n(minimum)} px. Увеличьте размер экспорта.`,
    FOREGROUND_NOT_DARKER: ({ target }) =>
      `Цвет ${foregrounds[target]} не темнее фона. Считывание QR со светлым рисунком на тёмном фоне зависит от сканера.`,
    GRADIENT_REQUIRES_DEVICE_TEST: () =>
      "Контраст градиента меняется по площади QR. Проверьте считывание на целевых устройствах.",
    MODULE_SHAPE_REQUIRES_DEVICE_TEST: () =>
      "Изменённая форма модулей может влиять на считывание. Проверьте QR на целевых устройствах.",
    FINDER_SHAPE_REQUIRES_DEVICE_TEST: () =>
      "Изменённая форма угловых маркеров может влиять на распознавание QR. Проверьте его на целевых устройствах.",
    LOGO_REDUCES_ERROR_CORRECTION: ({ coveragePercent }) =>
      `Логотип с подложкой занимает около ${n(coveragePercent)}% площади QR. Коррекция ошибок не гарантирует считывание с логотипом — проверьте результат на целевых устройствах.`,
    LOGO_OVERLAPS_FUNCTION_MODULES: () =>
      "Подложка логотипа перекрывает служебные элементы QR. Уменьшите логотип или отступы вокруг него.",
  },
};
