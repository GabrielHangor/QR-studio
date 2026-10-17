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
  engine: qrMessagesEn,
};
