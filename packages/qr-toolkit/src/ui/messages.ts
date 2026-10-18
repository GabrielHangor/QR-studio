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
  artworkSquare: string;
  artworkCircle: string;
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
  help: string;
  findersHint: string;
  artworkHint: string;
  eccHint: string;
  quietZoneHint: string;
  sizeHint: string;
  logoSizeHint: string;
  captionSizeHint: string;
  details: string;
  eccLow: string;
  eccMedium: string;
  eccQuartile: string;
  eccHigh: string;
  weightNormal: string;
  weightMedium: string;
  weightSemibold: string;
  weightBold: string;
  engine: QrMessageCatalog;
}

export const qrEditorMessagesRu: QrEditorMessages = {
  title: "Создайте свой QR-код",
  introduction: "Добавьте ссылку или текст — результат появится сразу.",
  content: "Что будет в QR-коде",
  url: "Ссылка",
  text: "Текст",
  urlHint: "Полный адрес с https:// или http://.",
  textHint: "Сохраняем текст, пробелы и переносы строк без изменений.",
  textPlaceholder: "Напишите то, чем хотите поделиться",
  invalidUrl: "Укажите полный адрес сайта, начиная с https:// или http://.",
  design: "Оформление",
  moduleShape: "Форма точек",
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
  fill: "Цвет или градиент",
  solid: "Сплошной цвет",
  horizontal: "Слева направо",
  vertical: "Сверху вниз",
  diagonal: "По диагонали",
  gradientEnd: "Второй цвет градиента",
  finders: "Квадраты по углам",
  finderOuter: "Форма контура",
  finderInner: "Форма центра",
  customOuter: "Свой цвет контура",
  customInner: "Свой цвет центра",
  outerColor: "Цвет контура",
  innerColor: "Цвет центра",
  artwork: "Форма и рамка",
  artworkShape: "Форма композиции",
  artworkSquare: "Квадрат",
  artworkCircle: "Круг",
  separateBackground: "Другой фон вокруг кода",
  artworkBackground: "Фон вокруг кода",
  frame: "Добавить рамку",
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
  fontSize: "Размер текста, px",
  fontWeight: "Толщина шрифта",
  letterSpacing: "Между буквами, px",
  captionColor: "Цвет надписи",
  captionBackground: "Цвет полосы",
  logo: "Логотип",
  logoFile: "Логотип PNG, JPEG или WebP",
  loadingLogo: "Загрузка изображения…",
  logoHelp: "До 700 КБ. Файл остаётся в браузере.",
  logoWidth: "Размер логотипа, ячейки",
  logoPadding: "Поля вокруг, ячейки",
  removeLogo: "Убрать логотип",
  logoTooLarge: "Файл логотипа должен быть не больше 700 КБ.",
  logoFormat: "Выберите PNG, JPEG или WebP. SVG не поддерживается.",
  logoInvalid: "Не удалось прочитать изображение. Выберите другой файл.",
  technical: "QR-код и файл",
  ecc: "Устойчивость к повреждениям",
  version: "Плотность кода (версия)",
  autoVersion: "Авто",
  versionHint: "Оставьте пустым — подберём автоматически. Больше версия — больше ячеек.",
  size: "Ширина файла, px",
  quietZone: "Поля вокруг QR, ячейки",
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
  matrixSize: "Сетка кода",
  modulePitch: "Размер ячейки, px",
  contrast: "Контраст",
  logoCoverage: "Перекрытие логотипом, %",
  notMeasured: "Не рассчитан",
  help: "Пояснение",
  findersHint: "Три крупных квадрата помогают камере найти QR-код.",
  artworkHint: "Меняет внешний силуэт. Сам код и поля для считывания сохраняются внутри.",
  eccHint:
    "Уровни L → M → Q → H добавляют больше данных для восстановления, но делают код плотнее. Для начала оставьте M. Уровень H не гарантирует считывание с любым логотипом.",
  quietZoneHint:
    "Пустое пространство отделяет код от надписей и рисунков. Минимум — 4 ячейки. Ячейка — одна маленькая точка сетки QR.",
  sizeHint:
    "Ширина всей картинки, включая рамку. Надписи сверху и снизу могут увеличить высоту. SVG остаётся векторным при любом размере.",
  logoSizeHint:
    "Размер и поля измеряются в ячейках QR. Чем больше логотип, тем больше данных он закрывает. После настройки проверьте считывание.",
  captionSizeHint:
    "Это максимальный размер текста. Длинная надпись автоматически уменьшается, чтобы поместиться и оставить место коду.",
  details: "Показатели и рекомендации",
  eccLow: "L — базовая",
  eccMedium: "M — стандартная",
  eccQuartile: "Q — повышенная",
  eccHigh: "H — высокая",
  weightNormal: "Обычная",
  weightMedium: "Средняя",
  weightSemibold: "Полужирная",
  weightBold: "Жирная",
  engine: qrMessagesRu,
};

export const qrEditorMessagesEn: QrEditorMessages = {
  title: "Create your QR code",
  introduction: "Add a link or text to see the result instantly.",
  content: "QR content",
  url: "Link",
  text: "Text",
  urlHint: "A full address starting with https:// or http://.",
  textHint: "Text, spaces and line breaks are preserved exactly.",
  textPlaceholder: "Write something you would like to share",
  invalidUrl: "Enter a full website address starting with https:// or http://.",
  design: "Design",
  moduleShape: "Dot shape",
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
  fill: "Color or gradient",
  solid: "Solid color",
  horizontal: "Left to right",
  vertical: "Top to bottom",
  diagonal: "Diagonal",
  gradientEnd: "Gradient end color",
  finders: "Corner squares",
  finderOuter: "Outline shape",
  finderInner: "Center shape",
  customOuter: "Custom outline color",
  customInner: "Custom center color",
  outerColor: "Outline color",
  innerColor: "Center color",
  artwork: "Shape and frame",
  artworkShape: "Overall shape",
  artworkSquare: "Square",
  artworkCircle: "Circle",
  separateBackground: "Different background around the code",
  artworkBackground: "Background around the code",
  frame: "Add a frame",
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
  fontSize: "Text size, px",
  fontWeight: "Font weight",
  letterSpacing: "Letter spacing, px",
  captionColor: "Caption color",
  captionBackground: "Band color",
  logo: "Logo",
  logoFile: "PNG, JPEG or WebP logo",
  loadingLogo: "Loading image…",
  logoHelp: "Up to 700 KB. The file stays in your browser.",
  logoWidth: "Logo size, cells",
  logoPadding: "Logo padding, cells",
  removeLogo: "Remove logo",
  logoTooLarge: "The logo must not exceed 700 KB.",
  logoFormat: "Choose PNG, JPEG or WebP. SVG is not supported.",
  logoInvalid: "Could not read the image. Choose another file.",
  technical: "QR code and file",
  ecc: "Damage recovery",
  version: "Code density (version)",
  autoVersion: "Auto",
  versionHint: "Leave blank for automatic selection. Higher versions have more cells.",
  size: "File width, px",
  quietZone: "Clear border, cells",
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
  matrixSize: "Code grid",
  modulePitch: "Cell size, px",
  contrast: "Contrast",
  logoCoverage: "Logo coverage, %",
  notMeasured: "Not measured",
  help: "Help",
  findersHint: "Three large corner squares help a camera locate the QR code.",
  artworkHint: "Changes the outer silhouette. The code and its clear border stay inside.",
  eccHint:
    "Levels L → M → Q → H add more recovery data but make the code denser. Start with M. H does not guarantee readability with every logo.",
  quietZoneHint:
    "Clear space separates the code from text and graphics. At least 4 cells are required. A cell is one small dot in the QR grid.",
  sizeHint:
    "Width of the entire image, including the frame. Top and bottom captions may increase its height. SVG stays vector at any size.",
  logoSizeHint:
    "Size and padding are measured in QR cells. Larger logos cover more data. Check readability after making changes.",
  captionSizeHint:
    "This is the maximum text size. Long captions shrink automatically to fit and leave room for the code.",
  details: "Metrics and recommendations",
  eccLow: "L — basic",
  eccMedium: "M — standard",
  eccQuartile: "Q — enhanced",
  eccHigh: "H — high",
  weightNormal: "Regular",
  weightMedium: "Medium",
  weightSemibold: "Semibold",
  weightBold: "Bold",
  engine: qrMessagesEn,
};
