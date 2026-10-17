import type { QrMessageCatalog } from "../i18n/index.js";
import { qrMessagesRu } from "../i18n/ru.js";
import { qrMessagesEn } from "../i18n/en.js";

export interface QrEditorMessages {
  title: string;
  introduction: string;
  content: string;
  url: string;
  text: string;
  urlHint: string;
  textHint: string;
  textPlaceholder: string;
  invalidUrl: string;
  design: string;
  moduleShape: string;
  square: string;
  rounded: string;
  circle: string;
  foreground: string;
  background: string;
  preview: string;
  emptyPreview: string;
  emptyHint: string;
  previewAlt: string;
  generationError: string;
  privacy: string;
  staticHint: string;
  presets: string;
  custom: string;
  examples: string;
  paint: string;
  fill: string;
  solid: string;
  horizontal: string;
  vertical: string;
  diagonal: string;
  gradientEnd: string;
  finders: string;
  finderOuter: string;
  finderInner: string;
  customOuter: string;
  customInner: string;
  outerColor: string;
  innerColor: string;
  artwork: string;
  artworkShape: string;
  separateBackground: string;
  artworkBackground: string;
  frame: string;
  frameColor: string;
  frameWidth: string;
  captions: string;
  topCaption: string;
  bottomCaption: string;
  captionText: string;
  captionStyle: string;
  plain: string;
  banner: string;
  arc: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  captionColor: string;
  captionBackground: string;
  logo: string;
  logoFile: string;
  logoHelp: string;
  loadingLogo: string;
  logoWidth: string;
  logoPadding: string;
  removeLogo: string;
  logoTooLarge: string;
  logoFormat: string;
  logoInvalid: string;
  technical: string;
  ecc: string;
  version: string;
  autoVersion: string;
  versionHint: string;
  size: string;
  quietZone: string;
  downloadSvg: string;
  downloadPng: string;
  openSvg: string;
  svgSource: string;
  exportFailed: string;
  exportTooLarge: string;
  scan: string;
  scanUnavailable: string;
  scanMatched: string;
  scanMissing: string;
  scanMismatch: string;
  scanFailed: string;
  metrics: string;
  matrixSize: string;
  modulePitch: string;
  contrast: string;
  logoCoverage: string;
  notMeasured: string;
  engine: QrMessageCatalog;
}

export const qrEditorMessagesRu: QrEditorMessages = {
  title: "Создайте свой QR-код",
  introduction: "Добавьте ссылку или текст — результат появится сразу.",
  content: "Содержимое",
  url: "Ссылка",
  text: "Текст",
  urlHint: "Полный адрес с https:// или http://.",
  textHint: "Сохраняем текст, пробелы и переносы строк без изменений.",
  textPlaceholder: "Напишите то, чем хотите поделиться",
  invalidUrl: "Укажите полный адрес сайта, начиная с https:// или http://.",
  design: "Оформление",
  moduleShape: "Форма модулей",
  square: "Квадраты",
  rounded: "Скруглённые",
  circle: "Круги",
  foreground: "Цвет QR",
  background: "Фон QR",
  preview: "Предпросмотр",
  emptyPreview: "Здесь появится ваш QR-код",
  emptyHint: "Введите ссылку или текст в поле содержимого.",
  previewAlt: "Предпросмотр QR-кода",
  generationError: "Не удалось создать QR-код",
  privacy: "Содержимое обрабатывается в вашем браузере.",
  staticHint: "Это статический QR-код. После печати его содержимое изменить нельзя.",
  presets: "Готовый дизайн",
  custom: "Своё оформление",
  examples: "Пример содержимого",
  paint: "Заливка и фон",
  fill: "Заливка модулей",
  solid: "Сплошной цвет",
  horizontal: "Слева направо",
  vertical: "Сверху вниз",
  diagonal: "По диагонали",
  gradientEnd: "Второй цвет градиента",
  finders: "Угловые маркеры",
  finderOuter: "Внешняя форма маркеров",
  finderInner: "Форма центра маркеров",
  customOuter: "Свой цвет кольца",
  customInner: "Свой цвет центра",
  outerColor: "Цвет кольца маркеров",
  innerColor: "Цвет центра маркеров",
  artwork: "Общая форма и рамка",
  artworkShape: "Общая форма",
  separateBackground: "Отдельный внешний фон",
  artworkBackground: "Цвет внешнего фона",
  frame: "Обводка",
  frameColor: "Цвет рамки",
  frameWidth: "Толщина рамки, px",
  captions: "Надписи вокруг QR",
  topCaption: "Верхняя надпись",
  bottomCaption: "Нижняя надпись",
  captionText: "Текст надписи",
  captionStyle: "Стиль надписи",
  plain: "Обычный текст",
  banner: "Полоса с фоном",
  arc: "По дуге круга",
  fontSize: "Макс. размер, px",
  fontWeight: "Насыщенность",
  letterSpacing: "Интервал, px",
  captionColor: "Цвет надписи",
  captionBackground: "Цвет полосы",
  logo: "Логотип",
  logoFile: "Логотип PNG, JPEG или WebP",
  loadingLogo: "Загрузка изображения…",
  logoHelp: "До 700 КБ. Файл остаётся в браузере.",
  logoWidth: "Ширина логотипа, модули",
  logoPadding: "Отступ под логотипом, модули",
  removeLogo: "Убрать логотип",
  logoTooLarge: "Файл логотипа должен быть не больше 700 КБ.",
  logoFormat: "Выберите PNG, JPEG или WebP. SVG не поддерживается.",
  logoInvalid: "Не удалось прочитать изображение. Выберите другой файл.",
  technical: "Параметры QR и экспорта",
  ecc: "Коррекция ошибок",
  version: "Версия QR",
  autoVersion: "Авто",
  versionHint: "Пустое поле — автоматический выбор версии.",
  size: "Ширина экспорта",
  quietZone: "Свободное поле, модули",
  downloadSvg: "Скачать SVG",
  downloadPng: "Скачать PNG",
  openSvg: "Открыть SVG",
  svgSource: "Исходный SVG",
  exportFailed: "Не удалось экспортировать изображение. Попробуйте ещё раз.",
  exportTooLarge: "PNG слишком большой. Уменьшите размер экспорта.",
  scan: "Проверить считывание",
  scanUnavailable: "Проверка браузером недоступна. Проверьте QR камерой телефона.",
  scanMatched: "Браузер распознал исходное содержимое. Проверьте также на целевых устройствах.",
  scanMissing: "QR не распознан. Попробуйте более простой дизайн или больший размер.",
  scanMismatch: "Распознанное содержимое не совпадает. Измените дизайн и проверьте снова.",
  scanFailed: "Проверка не удалась. Попробуйте ещё раз или используйте камеру телефона.",
  metrics: "Показатели QR",
  matrixSize: "Матрица",
  modulePitch: "Размер модуля, px",
  contrast: "Контраст",
  logoCoverage: "Перекрытие логотипом, %",
  notMeasured: "Не рассчитан",
  engine: qrMessagesRu,
};

export const qrEditorMessagesEn: QrEditorMessages = {
  title: "Create your QR code",
  introduction: "Add a link or text to see the result instantly.",
  content: "Content",
  url: "Link",
  text: "Text",
  urlHint: "A full address starting with https:// or http://.",
  textHint: "Text, spaces and line breaks are preserved exactly.",
  textPlaceholder: "Write something you would like to share",
  invalidUrl: "Enter a full website address starting with https:// or http://.",
  design: "Design",
  moduleShape: "Module shape",
  square: "Squares",
  rounded: "Rounded",
  circle: "Circles",
  foreground: "QR color",
  background: "QR background",
  preview: "Preview",
  emptyPreview: "Your QR code will appear here",
  emptyHint: "Enter a link or text in the content field.",
  previewAlt: "QR code preview",
  generationError: "Could not create the QR code",
  privacy: "Content is processed in your browser.",
  staticHint: "This is a static QR code. Its content cannot be changed after printing.",
  presets: "Design preset",
  custom: "Custom design",
  examples: "Content example",
  paint: "Fill and background",
  fill: "Module fill",
  solid: "Solid color",
  horizontal: "Left to right",
  vertical: "Top to bottom",
  diagonal: "Diagonal",
  gradientEnd: "Gradient end color",
  finders: "Finder markers",
  finderOuter: "Outer marker shape",
  finderInner: "Inner marker shape",
  customOuter: "Custom ring color",
  customInner: "Custom center color",
  outerColor: "Marker ring color",
  innerColor: "Marker center color",
  artwork: "Artwork and frame",
  artworkShape: "Artwork shape",
  separateBackground: "Separate artwork background",
  artworkBackground: "Artwork background color",
  frame: "Outline",
  frameColor: "Frame color",
  frameWidth: "Frame width, px",
  captions: "Captions around the QR",
  topCaption: "Top caption",
  bottomCaption: "Bottom caption",
  captionText: "Caption text",
  captionStyle: "Caption style",
  plain: "Plain text",
  banner: "Background band",
  arc: "Along the circle",
  fontSize: "Maximum font size, px",
  fontWeight: "Font weight",
  letterSpacing: "Letter spacing, px",
  captionColor: "Caption color",
  captionBackground: "Band color",
  logo: "Logo",
  logoFile: "PNG, JPEG or WebP logo",
  loadingLogo: "Loading image…",
  logoHelp: "Up to 700 KB. The file stays in your browser.",
  logoWidth: "Logo width, modules",
  logoPadding: "Logo padding, modules",
  removeLogo: "Remove logo",
  logoTooLarge: "The logo must not exceed 700 KB.",
  logoFormat: "Choose PNG, JPEG or WebP. SVG is not supported.",
  logoInvalid: "Could not read the image. Choose another file.",
  technical: "QR and export settings",
  ecc: "Error correction",
  version: "QR version",
  autoVersion: "Auto",
  versionHint: "Leave blank to select the version automatically.",
  size: "Export width",
  quietZone: "Quiet zone, modules",
  downloadSvg: "Download SVG",
  downloadPng: "Download PNG",
  openSvg: "Open SVG",
  svgSource: "SVG source",
  exportFailed: "Could not export the image. Please try again.",
  exportTooLarge: "The PNG is too large. Reduce the export size.",
  scan: "Check readability",
  scanUnavailable: "Browser scanning is unavailable. Check the QR with a phone camera.",
  scanMatched: "The browser decoded the original content. Also test on target devices.",
  scanMissing: "No matching QR was found. Try a simpler design or larger size.",
  scanMismatch: "The decoded content does not match. Adjust the design and test again.",
  scanFailed: "Scanning failed. Try again or use a phone camera.",
  metrics: "QR metrics",
  matrixSize: "Matrix",
  modulePitch: "Module pitch, px",
  contrast: "Contrast",
  logoCoverage: "Logo coverage, %",
  notMeasured: "Not measured",
  engine: qrMessagesEn,
};
