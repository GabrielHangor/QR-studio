# @qr-studio/toolkit

QR engine, состояние/конфигурация редактора и Vue UI. Корневого entrypoint нет.
Запуск и проверки — в [README проекта](../../README.md), границы слоёв — в [архитектуре](../../docs/architecture.md).

| Entrypoint                      | Назначение                                                        |
| ------------------------------- | ----------------------------------------------------------------- |
| `/engine`                       | `encodeQr`, `renderQrSvg`, `analyzeQrDesign`, типы и ошибки       |
| `/editor`                       | Состояние, фабрика, payload builders, схемы Valibot, конфигурации |
| `/ui`                           | `QrEditor`, composables, конфигурации, словари UI и типы          |
| `/i18n`, `/i18n/ru`, `/i18n/en` | Форматирование ошибок/диагностики и словари                       |

## Engine

```ts
import { encodeQr, renderQrSvg, analyzeQrDesign } from "@qr-studio/toolkit/engine";

const matrix = encodeQr("https://example.com", { errorCorrectionLevel: "M" });
const design = { size: 512, foreground: "#173d51" };
const svg = renderQrSvg(matrix, design);
const analysis = analyzeQrDesign(matrix, design);
```

`encodeQr` передаёт строку без нормализации; версия подбирается автоматически или задаётся 1–40.
Renderer детерминированно возвращает SVG; квадратная матрица сохраняется целиком,
в том числе при круглой композиции. Формы, градиенты, finder patterns, рамка, подписи и логотип задаются
через [RenderQrSvgOptions](src/engine/types.ts), варианты форм — в [shapes.ts](src/engine/shapes.ts).
Ограничения проверяются engine независимо от доступных контролов UI.
`codeScale` — положительный процент масштаба: при 100 свободное поле целиком помещается
в круге/квадрате. Выше 100 подложка обрезается по композиции и свободное поле сокращается;
диагностика рекомендует проверить считывание. Сам QR не обрезается: эффективный масштаб
ограничен геометрией матрицы и рамки, предел возвращается в `analysis.maximumCodeScale`.
При смене содержимого или оформления сохранённый масштаб ограничивается новым пределом.
`size` по-прежнему задаёт ширину файла.
Без `codeScale` сохраняются прежние пропорции. Масштаб относится к оформлению и может
задаваться шаблоном; видимость ползунка и диапазон задаёт конфигурация редактора.

`analyzeQrDesign` возвращает измерения и диагностику. Потребитель может передать
`minimumContrastRatio` / `minimumModulePitchPx` после собственных испытаний;
универсальные безопасные пороги не установлены. ECC не определяет допустимую площадь логотипа.
Encoder использует один сегмент, поэтому смешанное содержимое иногда кодируется менее плотно.

## Ошибки и локализация

```ts
import { formatQrError, formatQrDiagnostic } from "@qr-studio/toolkit/i18n";
import { qrMessagesRu } from "@qr-studio/toolkit/i18n/ru";

try {
  encodeQr("https://example.com", { version: 0 });
} catch (error) {
  console.log(formatQrError(error, qrMessagesRu));
}
const warnings = analysis.diagnostics.map((item) => formatQrDiagnostic(item, qrMessagesRu));
```

`QrError` и `QrEncodingError` содержат `code + params`; исходная причина доступна для отладки.
`Error.message` — технический код. Для пользователя нужен форматтер со словарём RU/EN
или собственным [QrMessageCatalog](src/i18n/index.ts); неизвестные ошибки получают безопасный текст.

## Vue editor

Host устанавливает Vue/Nuxt UI, подключает плагины и оборачивает редактор в `UApp`;
[рабочий пример](../../apps/frontend/src/main.ts).

```vue
<script setup lang="ts">
import { ref } from "vue";
import { QrEditor, createQrEditorState, fullEditorConfig } from "@qr-studio/toolkit/ui";

const state = ref(createQrEditorState());
</script>

<template>
  <QrEditor v-model="state" :config="fullEditorConfig" locale="ru" />
</template>
```

`config` обязателен. Без `v-model` редактор хранит состояние локально.
Фабрика даёт независимые демонстрационные черновики всех поддерживаемых типов и готовый QR.
URL требует HTTP(S); удаляются только крайние пробелы. Текст кодируется дословно.
Схемы валидации и сериализация — в [editor](src/editor/index.ts).
Ошибки содержимого/генерации скрывают устаревший preview и блокируют экспорт.
`presets?: readonly QrDesignPreset[]` — внешний каталог: применение пресета сохраняет
содержимое, кодирование, размер, quiet zone и логотип. Каталога внутри библиотеки нет.
`logoPresets?: readonly QrLogoPreset[]` — внешний каталог готовых логотипов с категориями;
контракт — [QrLogoPreset](src/editor/index.ts). PNG/JPEG/WebP встраиваются в результат,
SVG и удалённые URL не принимаются. Контрол `logo.presets` включает галерею
независимо от загрузки файла. Выбор сохраняет размер, отступы и очистку подложки; смена
каталога/config сохраняет текущую картинку. [Каталог frontend](../../apps/frontend/src/logo-presets.ts)
генерируется из установленного Remix Icon командой `pnpm --filter @qr-studio/frontend logos:generate`;
источник и лицензия сохранены [в приложении](../../apps/frontend/public/licenses/remix-icon.txt).
`locale` выбирает RU/EN; `messages` заменяет полный UI-словарь, включая словарь engine.
Локаль компонентов Nuxt UI задаёт host через `UApp`.

### Конфигурация

`fullEditorConfig` и `compactEditorConfig` экспортируются из `/ui` и `/editor`.
Приложение выбирает профиль и может создавать свой:

```ts
import { compactEditorConfig, type QrEditorConfig } from "@qr-studio/toolkit/editor";

const config = {
  ...compactEditorConfig,
  contentTypes: ["url"],
  sections: [{ id: "content", controls: ["sampleHint"] }],
} as const satisfies QrEditorConfig;
```

[QrEditorConfig](src/editor/config.ts) определяет типы содержимого, порядок секций,
видимые контролы, варианты выбора, диапазоны, палитры, экспорт и рекомендации.
Списки типов/вариантов выбора/разрешений непустые; порядок controls не меняет порядок полей.
Секция пресетов требует каталога; секции с пустыми controls скрыты, кроме обязательных полей content.
Поиск на карте требует одновременно `locationMap` и `locationSearch`.

Реактивная смена config сохраняет скрытые значения и черновики, не подгоняет их под новые
диапазоны или списки. Если текущий тип исключён, выбирается первый разрешённый.
Удалённая открытая секция заменяется `initialSection` или первой доступной; закрытый
аккордеон остаётся закрытым. Начальные значения задаются через состояние, внешние сервисы — отдельными props.

### Браузерные ограничения

Логотипы PNG/JPEG/WebP до 700 КиБ читаются локально; SVG не принимается.
При `clearBackground: true` под логотипом удаляются целые ячейки с округлением наружу;
при false прозрачные области показывают QR и padding не применяется. Логотип размещается
в центре, а при пересечении со служебными элементами сдвигается на ближайшее свободное место
с шагом в одну ячейку. Размер и отступы сохраняются; если подходящего места нет, renderer
возвращает ошибку. Проверка считывания всё равно необходима.
PNG растеризуется из того же SVG с сохранением прозрачности, максимум — 16 777 216 пикселей.
`BarcodeDetector` доступен не во всех браузерах; его отсутствие не означает провал считывания.

Карту и поиск можно скрыть конфигурацией; провайдер поиска заменяется через
[locationSearch: QrLocationSearch](src/ui/geocoding.ts). Сетевые зависимости и патч карты описаны
в [архитектуре](../../docs/architecture.md#карта-и-внешние-запросы).

## Проверка экспорта

Scan-тесты растеризуют настоящий SVG в Chromium и декодируют PNG независимым ZXing WASM.
Фиксированные сценарии: [cases.ts](tests/scan/cases.ts), данные дизайнов — [fixtures](tests/fixtures/design-presets.ts).
Проверяются точный payload, размеры и прозрачность, включая стилизацию, логотип и искажения.
Тесты не являются пиксельными snapshots; растеризация текста зависит от ОС/шрифтов.
Они подтверждают выбранные сочетания, но не универсальное считывание и не физическую печать.
Команды, установка браузера и отчёты — в [README проекта](../../README.md#проверки).
