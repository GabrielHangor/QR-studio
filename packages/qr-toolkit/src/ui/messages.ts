import { qrMessagesEn } from "../i18n/en.js";
import type { QrMessageCatalog } from "../i18n/index.js";
import { qrMessagesRu } from "../i18n/ru.js";

export interface QrEditorMessages {
  settings: string;
  contentType: string;
  contentLabels: Record<import("../editor/content.js").QrContentType, string>;
  contentFields: Record<import("../editor/content.js").QrContentField, string>;
  invalidContent: string;
  validation: Record<import("../editor/validation.js").QrContentIssueCode, string>;
  mapLabel: string;
  mapSearch: string;
  mapSearchPlaceholder: string;
  mapSearchButton: string;
  mapSearchResults: string;
  mapSearchInvalid: string;
  mapSearchEmpty: string;
  mapSearchFailed: string;
  mapMarker: string;
  mapUnavailable: string;
  mapHint: string;
  mapZoomIn: string;
  mapZoomOut: string;
  mapSelectCenter: string;
  mapRetry: string;
  staticContentHint: string;
  noPassword: string;
  visibleNetwork: string;
  hiddenNetwork: string;
  showPassword: string;
  hidePassword: string;
  shapeLabels: Record<import("../engine/types.js").QrModuleShape, string>;
  clearLogo: string;
  noFrame: string;
  solidFrame: string;
  dashedFrame: string;
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
  paint: string;
  shapes: string;
  recommendations: string;
  criticalRecommendations: string;
  warningRecommendations: string;
  stylingRecommendations: string;
  stylingNotice: string;
  advanced: string;
  cornerColors: string;
  moreColors: string;
  logoSize: string;
  smaller: string;
  larger: string;
  resolution: string;
  resolutionHint: string;
  smallerFile: string;
  moreDetail: string;
  vectorHint: string;
  exportDimensions: string;
  pixelUnit: string;
  sampleHint: string;
  noLogo: string;
  logoPresets: string;
  logoPresetGroups: string;
  customLogo: string;
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
  codeScale: string;
  codeScaleHint: string;
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
  scanResult: string;
  closeFeedback: string;
  scanUnavailable: string;
  scanMatched: string;
  scanSuccess: string;
  scanDeviceHint: string;
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
  settings: "Настройки QR",
  scanResult: "Результат проверки QR",
  closeFeedback: "Закрыть результат",
  validation: {
    required: "Заполните это поле.",
    url: "Укажите полный адрес с https:// или http://.",
    email: "Введите корректный email.",
    phone: "Введите номер телефона, например +7 999 123-45-67.",
    subject: "Тема письма должна быть в одну строку.",
    security: "Выберите допустимый вариант.",
    coordinate: "Введите координату числом.",
    latitude: "Широта должна быть от −90 до 90.",
    longitude: "Долгота должна быть от −180 до 180.",
  },
  mapLabel: "Выбор точки на карте",
  mapSearch: "Найти место",
  mapSearchPlaceholder: "Город, адрес или название места",
  mapSearchButton: "Найти",
  mapSearchResults: "Найденные места",
  mapSearchInvalid: "Введите от 2 до 200 символов.",
  mapSearchEmpty: "Ничего не найдено. Попробуйте уточнить название.",
  mapSearchFailed: "Поиск временно недоступен. Можно выбрать точку на карте или ввести координаты.",
  mapMarker: "Выбранная точка",
  mapUnavailable: "Карта недоступна. Местоположение можно указать вручную.",
  mapHint: "Нажмите на карту или перетащите маркер, чтобы выбрать точку.",
  mapZoomIn: "Приблизить карту",
  mapZoomOut: "Отдалить карту",
  mapSelectCenter: "Выбрать центр карты",
  mapRetry: "Загрузить карту ещё раз",
  contentType: "Тип содержимого",
  contentLabels: {
    url: "Ссылка",
    text: "Текст",
    email: "Почта",
    phone: "Телефон",
    sms: "СМС",
    wifi: "Wi-Fi",
    contact: "Визитка",
    location: "Местоположение",
  },
  contentFields: {
    email: "Почта",
    subject: "Тема письма",
    body: "Сообщение",
    phone: "Номер телефона",
    ssid: "Имя сети (SSID)",
    password: "Пароль сети",
    security: "Тип защиты",
    hidden: "Видимость сети",
    name: "Полное имя",
    organization: "Организация",
    latitude: "Широта",
    longitude: "Долгота",
  },
  invalidContent: "Проверьте введённые данные.",
  staticContentHint:
    "Данные сохраняются в QR-коде. Возможности их использования зависят от приложения для сканирования.",
  noPassword: "Без пароля",
  visibleNetwork: "Видимая сеть",
  hiddenNetwork: "Скрытая сеть",
  showPassword: "Показать пароль",
  hidePassword: "Скрыть пароль",
  shapeLabels: {
    "square": "Квадраты",
    "rounded": "Скруглённые",
    "circle": "Круги",
    "soft": "Сглаженные",
    "leaf": "Лепестки",
    "leaf-reverse": "Зеркальные лепестки",
    "classy": "Скошенные",
    "classy-reverse": "Зеркальный скос",
    "rounded-top": "Скругление сверху",
    "rounded-bottom": "Скругление снизу",
  },
  clearLogo: "Очистить область под логотипом",
  noFrame: "Без рамки",
  solidFrame: "Сплошная",
  dashedFrame: "Пунктирная",
  title: "Создайте QR-код",
  introduction: "Укажите данные, выберите оформление и скачайте готовый QR-код.",
  content: "Содержимое",
  url: "Ссылка",
  text: "Текст",
  urlHint: "Адрес страницы, начинающийся с https:// или http://.",
  textHint: "Текст, пробелы и переносы строк сохраняются без изменений.",
  textPlaceholder: "Введите текст для QR-кода",
  invalidUrl: "Укажите полный адрес сайта, начиная с https:// или http://.",
  design: "Оформление",
  moduleShape: "Форма элементов",
  square: "Квадраты",
  rounded: "Скруглённые",
  circle: "Круги",
  foreground: "Цвет элементов",
  background: "Фон кода",
  preview: "Предпросмотр",
  emptyPreview: "Здесь появится ваш QR-код",
  emptyHint: "Укажите данные для QR-кода.",
  previewAlt: "Предпросмотр QR-кода",
  generationError: "Не удалось создать QR-код",
  privacy: "QR-код создаётся в вашем браузере.",
  staticHint: "После скачивания содержимое QR-кода изменить нельзя.",
  presets: "Шаблоны",
  custom: "Собственное оформление",
  paint: "Цвета",
  shapes: "Форма и рамка",
  recommendations: "Рекомендации",
  criticalRecommendations: "Исправьте перед использованием",
  warningRecommendations: "Обратите внимание",
  stylingRecommendations: "Проверьте оформление",
  stylingNotice:
    "Перед печатью проверьте QR-код камерой телефона, особенно после изменения оформления.",
  advanced: "Дополнительно",
  cornerColors: "Цвета поисковых маркеров",
  moreColors: "Фон композиции",
  logoSize: "Размер логотипа",
  smaller: "Меньше",
  larger: "Больше",
  resolution: "Размер PNG",
  resolutionHint:
    "Ширина скачиваемого PNG в пикселях. Например, при 1024 пкс изображение вдвое шире, чем при 512 пкс.",
  smallerFile: "Меньший файл",
  moreDetail: "Больший размер",
  vectorHint: "Для печати и масштабирования используйте SVG.",
  exportDimensions: "Размер изображения",
  pixelUnit: "пкс",
  sampleHint: "Поля заполнены для примера. Перед скачиванием укажите свои данные.",
  noLogo: "Без логотипа",
  logoPresets: "Готовые логотипы",
  logoPresetGroups: "Категории логотипов",
  customLogo: "Свой логотип",
  fill: "Цвет или градиент",
  solid: "Сплошной цвет",
  horizontal: "Слева направо",
  vertical: "Сверху вниз",
  diagonal: "По диагонали",
  gradientEnd: "Второй цвет градиента",
  finders: "Поисковые маркеры",
  finderOuter: "Форма рамок маркеров",
  finderInner: "Форма центров маркеров",
  customOuter: "Отдельный цвет рамок",
  customInner: "Отдельный цвет центров",
  outerColor: "Цвет рамок маркеров",
  innerColor: "Цвет центров маркеров",
  artwork: "Форма и рамка",
  artworkShape: "Форма композиции",
  codeScale: "Размер кода в композиции",
  codeScaleHint:
    "При 100% свободное поле целиком помещается в композиции. Выше 100% код увеличивается за счёт свободного поля. Предел зависит от содержимого и рамки. Размер файла в пикселях задаётся отдельно.",
  artworkSquare: "Квадрат",
  artworkCircle: "Круг",
  separateBackground: "Отдельный фон композиции",
  artworkBackground: "Цвет фона композиции",
  frame: "Рамка",
  frameColor: "Цвет рамки",
  frameWidth: "Толщина рамки, пкс",
  captions: "Подписи",
  topCaption: "Подпись сверху",
  bottomCaption: "Подпись снизу",
  captionText: "Текст подписи",
  captionStyle: "Оформление подписи",
  plain: "Без подложки",
  banner: "На цветной подложке",
  arc: "По дуге",
  fontSize: "Размер шрифта, пкс",
  fontWeight: "Насыщенность шрифта",
  letterSpacing: "Межбуквенный интервал, пкс",
  captionColor: "Цвет текста",
  captionBackground: "Цвет подложки",
  logo: "Логотип",
  logoFile: "Файл логотипа",
  loadingLogo: "Загрузка изображения…",
  logoHelp: "PNG, JPEG или WebP до 700 КиБ. Изображение обрабатывается локально.",
  logoWidth: "Ширина логотипа, модули",
  logoPadding: "Отступ от логотипа, модули",
  removeLogo: "Удалить логотип",
  logoTooLarge: "Размер файла не должен превышать 700 КиБ.",
  logoFormat: "Выберите PNG, JPEG или WebP. SVG не поддерживается.",
  logoInvalid: "Не удалось прочитать изображение. Выберите другой файл.",
  technical: "Параметры QR-кода",
  ecc: "Коррекция ошибок",
  version: "Плотность кода (версия)",
  autoVersion: "Авто",
  versionHint: "Оставьте пустым — подберём автоматически. Чем выше версия, тем больше модулей.",
  size: "Ширина изображения, пкс",
  quietZone: "Свободное поле, модули",
  downloadSvg: "Скачать SVG",
  downloadPng: "Скачать PNG",
  openSvg: "Открыть SVG",
  svgSource: "Исходный SVG",
  exportFailed: "Не удалось экспортировать изображение. Попробуйте ещё раз.",
  exportTooLarge: "PNG слишком большой. Уменьшите размер экспорта.",
  scan: "Проверить считывание",
  scanUnavailable: "Проверка браузером недоступна. Проверьте QR камерой телефона.",
  scanMatched:
    "Браузер распознал данные без изменений. Дополнительно проверьте QR-код на нескольких телефонах.",
  scanSuccess: "QR-код распознан",
  scanDeviceHint: "Дополнительно проверьте QR-код на нескольких телефонах.",
  scanMissing: "QR-код не распознан. Упростите оформление или увеличьте размер изображения.",
  scanMismatch: "Распознанное содержимое не совпадает. Измените дизайн и проверьте снова.",
  scanFailed: "Проверка не удалась. Попробуйте ещё раз или используйте камеру телефона.",
  metrics: "Показатели QR",
  matrixSize: "Сетка кода",
  modulePitch: "Размер модуля, пкс",
  contrast: "Контраст",
  logoCoverage: "Перекрытие логотипом, %",
  notMeasured: "Не рассчитан",
  help: "Пояснение",
  findersHint:
    "Поисковые маркеры — три крупных элемента по углам. Они помогают камере определить положение QR-кода.",
  artworkHint:
    "Внешняя форма композиции. Сам QR-код остаётся квадратным. Его размер внутри композиции задаётся отдельным ползунком.",
  eccHint:
    "Уровни L, M, Q и H увеличивают объём данных для восстановления и плотность кода. Обычно достаточно M. Даже уровень H не гарантирует считывание при большом логотипе.",
  quietZoneHint:
    "Свободное пространство вокруг QR-кода отделяет его от других элементов. Минимальная ширина — 4 модуля. Модуль — одна ячейка матрицы.",
  sizeHint:
    "Ширина всей композиции, включая рамку. Подписи сверху и снизу могут увеличить высоту. SVG сохраняет чёткость при масштабировании.",
  logoSizeHint:
    "Ширина и отступ задаются в модулях — ячейках матрицы QR-кода. Чем больше логотип, тем больше данных он перекрывает. После настройки проверьте считывание.",
  captionSizeHint:
    "Максимальный размер шрифта. Длинная подпись автоматически уменьшается, чтобы поместиться в композицию.",
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
  settings: "QR settings",
  scanResult: "QR scan result",
  closeFeedback: "Close result",
  validation: {
    required: "Fill in this field.",
    url: "Enter a full address starting with https:// or http://.",
    email: "Enter a valid email address.",
    phone: "Enter a phone number, for example +1 202 555 0123.",
    subject: "Use a single line for the subject.",
    security: "Select a valid option.",
    coordinate: "Enter a numeric coordinate.",
    latitude: "Latitude must be between −90 and 90.",
    longitude: "Longitude must be between −180 and 180.",
  },
  mapLabel: "Select a point on the map",
  mapSearch: "Find a place",
  mapSearchPlaceholder: "City, address or place name",
  mapSearchButton: "Search",
  mapSearchResults: "Search results",
  mapSearchInvalid: "Enter between 2 and 200 characters.",
  mapSearchEmpty: "No places found. Try a more specific name.",
  mapSearchFailed:
    "Search is temporarily unavailable. Select a point on the map or enter coordinates.",
  mapMarker: "Selected point",
  mapUnavailable: "The map is unavailable. You can enter coordinates manually.",
  mapHint: "Click the map or drag the marker to select a point.",
  mapZoomIn: "Zoom in",
  mapZoomOut: "Zoom out",
  mapSelectCenter: "Select map center",
  mapRetry: "Retry loading the map",
  contentType: "Content type",
  contentLabels: {
    url: "Link",
    text: "Text",
    email: "Email",
    phone: "Phone",
    sms: "SMS",
    wifi: "Wi-Fi",
    contact: "Contact",
    location: "Coordinates",
  },
  contentFields: {
    email: "Email",
    subject: "Subject",
    body: "Message",
    phone: "Phone number",
    ssid: "Network name (SSID)",
    password: "Network password",
    security: "Network security",
    hidden: "Network visibility",
    name: "Full name",
    organization: "Organization",
    latitude: "Latitude",
    longitude: "Longitude",
  },
  invalidContent: "Check the content fields.",
  staticContentHint:
    "Data is stored directly in the QR code. The action after scanning depends on the phone app.",
  noPassword: "No password",
  visibleNetwork: "Visible network",
  hiddenNetwork: "Hidden network",
  showPassword: "Show password",
  hidePassword: "Hide password",
  shapeLabels: {
    "square": "Squares",
    "rounded": "Rounded",
    "circle": "Circles",
    "soft": "Soft",
    "leaf": "Leaves",
    "leaf-reverse": "Leaves ↗",
    "classy": "Sharp corner ↖",
    "classy-reverse": "Sharp corner ↘",
    "rounded-top": "Rounded top",
    "rounded-bottom": "Rounded bottom",
  },
  clearLogo: "Clear QR behind the logo",
  noFrame: "No frame",
  solidFrame: "Solid",
  dashedFrame: "Dashed",
  title: "Create your QR code",
  introduction: "Choose a content type and customize your QR code to see the result instantly.",
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
  emptyHint: "Fill in the content fields.",
  previewAlt: "QR code preview",
  generationError: "Could not create the QR code",
  privacy: "Content is processed in your browser.",
  staticHint: "The content of a downloaded QR code cannot be changed.",
  presets: "Design preset",
  custom: "Custom design",
  paint: "Colors",
  shapes: "Shapes and frame",
  recommendations: "Recommendations",
  criticalRecommendations: "Fix before using",
  warningRecommendations: "Please note",
  stylingRecommendations: "Check your design",
  stylingNotice: "You changed the design — check the QR with a phone camera before printing.",
  advanced: "Advanced",
  cornerColors: "Customize corner colors",
  moreColors: "More colors",
  logoSize: "Logo size",
  smaller: "Smaller",
  larger: "Larger",
  pixelUnit: "px",
  resolution: "PNG resolution",
  resolutionHint:
    "Width of the downloaded PNG in pixels. For example, 1024 px is twice as wide as 512 px.",
  smallerFile: "Smaller file",
  moreDetail: "More detail",
  vectorHint: "Vector SVG stays sharp at any scale.",
  exportDimensions: "Export image dimensions",
  sampleHint: "This is sample content. Replace it with your own before downloading.",
  noLogo: "No logo",
  logoPresets: "Logo gallery",
  logoPresetGroups: "Logo categories",
  customLogo: "Custom logo",
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
  codeScale: "QR size within artwork",
  codeScaleHint:
    "At 100% the entire quiet zone fits the artwork. Higher values enlarge the code by reducing the quiet zone. The limit depends on content and frame. Export dimensions are set separately.",
  artworkShape: "Overall shape",
  artworkSquare: "Square",
  artworkCircle: "Circle",
  separateBackground: "Different background around the code",
  artworkBackground: "Background around the code",
  frame: "Frame",
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
  technical: "Advanced settings",
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
  scanSuccess: "QR code recognized",
  scanDeviceHint: "Also test on target devices.",
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
  artworkHint:
    "Changes the outer silhouette. The QR code remains square; a separate slider controls its size within the artwork.",
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
