# @qr-studio/toolkit

Headless QR Engine: `qr@0.7.2` от Paul Miller → собственная матрица → собственный SVG Renderer.
Без Vue/DOM и каталога пресетов внутри engine. Единственная runtime-зависимость — `qr`.
Engine и `/editor` собираются в ESM и `.d.ts`; Vue editor доступен через `/ui`. Корневого entrypoint нет.
Контекст продукта и статус проекта — в [документации](../../docs/README.md).

## Запуск из корня

```sh
nvm use
pnpm install
pnpm --filter @qr-studio/toolkit playground
```

Node закреплён в `.nvmrc`, pnpm — в корневом `packageManager`.
Инструменты локальны пакету: TypeScript, Vite, Vitest, Oxlint и Oxfmt. Vite+ не используется.

| Команда после `pnpm --filter @qr-studio/toolkit` | Результат                                                      |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `build` / `dev`                                  | ESM + декларации в `dist` / пересборка при изменении           |
| `check`                                          | Линтер, типы библиотеки/playground/scan-тестов, форматирование |
| `test`                                           | Быстрые Node-тесты Vitest                                      |
| `format`                                         | Oxfmt                                                          |
| `playground` / `build:playground`                | Vite dev server / страница в `dist-playground`                 |

## API engine

```ts
import {
  encodeQr,
  renderQrSvg,
  analyzeQrDesign,
  type RenderQrSvgOptions,
} from "@qr-studio/toolkit/engine";

const matrix = encodeQr("https://example.com", { errorCorrectionLevel: "M" });
const design: RenderQrSvgOptions = {
  size: 512,
  foreground: "#173d51",
  moduleShape: "rounded",
  finder: { outerShape: "rounded", innerShape: "circle" },
};
const svg = renderQrSvg(matrix, design);
const analysis = analyzeQrDesign(matrix, design);
```

`encodeQr` принимает строку без нормализации; ECC по умолчанию M, версия автоматически
или вручную 1–40. `QrMatrix` содержит `modules[row][column]` без полей, размер, версию,
ECC, `functionModules` и координаты трёх finder patterns. Маска служебных зон строится
в toolkit. Техническая рамка encoder в один модуль удаляется адаптером.

`renderQrSvg` синхронно возвращает детерминированную SVG-строку. Повторное оформление
матрицы не требует кодирования. Полный тип опций — [types.ts](./src/engine/types.ts).

| Опция                        | Контракт                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`, `quietZone`          | Ширина композиции в px (512 по умолчанию); поле в модулях (минимум и default 4)                                                                                                              |
| `foreground`, `background`   | Непрозрачные `#RGB`/`#RRGGBB`; foreground также принимает `{ type: "linear", direction, startColor, endColor }`, direction: horizontal/vertical/diagonal                                     |
| `moduleShape`                | square/rounded/circle; timing/alignment и прочие служебные зоны остаются квадратными, кроме отдельно оформленных finder patterns                                                             |
| `finder`                     | Цельные кольцо/центр: outerShape/innerShape и независимые outerColor/innerColor. Без своих цветов наследуют foreground                                                                       |
| `finderShape`                | Прежняя стилизация клеток маркеров; `finder` имеет приоритет                                                                                                                                 |
| `shape`, `artworkBackground` | Внешняя square/circle форма и её фон; полная квадратная QR-подложка с quiet zone сохраняет `background`                                                                                      |
| `frame`                      | none/outline или `{ style?, color?, widthPx? }`; у объекта default 2 px, толщина меньше четверти ширины. Прежний строковый outline сохраняет толщину в модулях                               |
| `logo`                       | Центрированный base64 PNG/JPEG/WebP: dataUri, widthModules, paddingModules. SVG-ассет и перекрытие служебных зон запрещены                                                                   |
| `caption`                    | Одна подпись или две, по одной top/bottom. style: plain/banner/arc; дуга только у circle. Цвет, фон полосы, fontSize (max px, default 18), fontWeight 400/500/600/700, letterSpacing 0–10 px |

Градиент един для всей матрицы и наследующих его маркеров (`userSpaceOnUse`). Круг
вмещает квадрат вместе с quiet zone, оставляет прозрачные углы и при той же ширине
уменьшает QR. Прямые подписи увеличивают высоту; дуги занимают свободные верх/низ,
не уменьшая код. Текст и межбуквенный интервал автоматически уменьшаются до доступного места.
Рамка и подписи находятся за quiet zone.

`analyzeQrDesign` возвращает `contrastRatio` (null для градиента), `modulePitchPx`,
`logoCoveragePercent` и `diagnostics`. Третий аргумент принимает проверенные потребителем
пороги `minimumContrastRatio` и `minimumModulePitchPx`; безопасные универсальные значения
не установлены. ECC не задаёт разрешённую площадь логотипа, диагностика не гарантирует сканирование.

## Ошибки и языки

```ts
import { formatQrError, formatQrDiagnostic } from "@qr-studio/toolkit/i18n";
import { qrMessagesRu } from "@qr-studio/toolkit/i18n/ru";
import { qrMessagesEn } from "@qr-studio/toolkit/i18n/en";

try {
  encodeQr("https://example.com", { version: 0 });
} catch (error) {
  const text = formatQrError(error, qrMessagesRu);
  // Версия QR должна быть целым числом от 1 до 40.
}
const warnings = analysis.diagnostics.map((item) => formatQrDiagnostic(item, qrMessagesEn));
```

`QrError` содержит `code + params`; `QrEncodingError` наследует контракт и сохраняет
`cause`/`originalError` для отладки. Диагностика: `code + severity + params`.
`Error.message` — технический код, не пользовательский текст; у диагностик `message` нет.
Валидация renderer/analyzer бросает `QrError`, а не `TypeError`/`RangeError`.
Конструктор: `new QrEncodingError(code, params, originalError?)`.

Приложение выбирает словарь RU/EN либо реализует `QrMessageCatalog`: обработчик параметров
каждого кода в `errors`/`diagnostics` и `unknownError`. TypeScript проверяет полноту;
числа форматирует словарь. Engine не импортирует переводы и не хранит текущий язык.
Для неизвестного исключения `formatQrError` возвращает `unknownError` или третий аргумент;
произвольные технические сообщения и исходная причина не показываются пользователю.

## Пресеты и playground

Engine принимает обычный `RenderQrSvgOptions`, не ID: дизайн может приходить из конфигурации,
API или внешнего каталога. Демо-каталоги принадлежат playground и frontend, а не библиотеке.
`setPlaygroundPresets(catalog)` и `applyPlaygroundDesign(design)` из `playground/main.ts`
позволяют подставить свой каталог/дизайн. Это API тестовой страницы, не engine.
Выбор пресета сохраняет payload, ECC, версию, размер, quiet zone и загруженный логотип.

Playground — HTML/CSS/TypeScript без UI-зависимостей: примеры содержимого, ручные параметры,
шесть дизайнов, диагностика на русском, SVG/PNG-скачивание. `<img src="blob:…">` показывает
именно SVG Renderer; SVG-файл берётся из той же строки, PNG растеризуется через canvas.
Ошибка генерации скрывает старый preview и отключает экспорт. Логотип и payload обрабатываются локально.
`BarcodeDetector` проверяет изображение только при наличии API; его отсутствие — не результат проверки QR.

## Функциональные тесты экспорта

Быстрые `test` проверяют матрицы/служебные зоны версий 1–40, геометрию, ограничения,
диагностику и RU/EN. Отдельный `test:scan` запускает [Vitest Browser Mode](https://vitest.dev/guide/browser/)
с Chromium: настоящий SVG → браузерная растеризация → PNG → независимый [ZXing WASM](https://github.com/Sec-ant/zxing-wasm).
Это функциональные интеграционные тесты pipeline экспорта, без моков; клики по UI они не проверяют.

Из корня, для первого запуска или после смены версии Playwright:

```sh
nvm use
pnpm install --frozen-lockfile
pnpm --filter @qr-studio/toolkit test:scan:install
pnpm --filter @qr-studio/toolkit test:scan
```

На Linux CI системные зависимости браузера ставятся через
`pnpm --filter @qr-studio/toolkit exec playwright install --with-deps chromium`.
Для полной проверки запускайте `check`, `test` и `test:scan`; обычный `test` браузер не запускает.
Один сценарий: `pnpm --filter @qr-studio/toolkit test:scan -t atelier-url-256`.

Набор в `tests/scan/cases.ts` фиксирован: все шесть пресетов × четыре payload × два размера;
уменьшение до 60%, blur 0.6 px и JPEG quality 0.72 для пресетов при 512 px; версии
1/7/10/27/40 × ECC L/M/Q/H; комбинации форм маркеров; длинный Unicode; растровый логотип.
Отдельный отрицательный контроль проверяет отсутствие QR на пустом изображении.
Проверяются точный payload, ширина SVG и прозрачные углы круглой композиции.
Эти размеры и искажения — условия теста, не универсальные безопасные пределы.

Для воспроизводимости зависимости и Chromium закреплены lockfile/Playwright;
WASM локальный, без CDN; locale, timezone, viewport и device scale заданы явно.
QR декодируется целиком на белой подложке, без обрезки декора или подмены матрицей.
ОС/системные шрифты могут менять растеризацию подписей: это не пиксельные snapshot-тесты;
для сравнения байтов нужен одинаковый образ ОС. Измерения времени справочные, без нестабильных порогов.

В `packages/qr-toolkit/test-results/scan/` создаются `vitest.json`, `summary.json`
(результаты, декодированные строки, размеры, диагностика, время/объём SVG) и `environment.json`
(Node/ОС/архитектура/версии пакетов). При сбое в `failures/` сохраняются параметры,
исходный SVG, экспортированный PNG и изображение после искажения, если они были созданы.
Каталог исключён из Git и очищается перед каждым прогоном; в CI сохраняйте его как artifact даже при ошибке.

## Ограничения

Прохождение тестов подтверждает только выбранные сочетания и синтетические искажения,
не универсальное считывание или физическую печать. Телефоны, пороги читаемости и мобильная
производительность пока требуют проверки; текущий статус — в [документации](../../docs/README.md).
Обычные квадратные модули объединяются в path; сложная стилизация создаёт больше элементов.
Encoder использует один сегмент: смешанное содержимое может кодироваться менее плотно,
чем при оптимизированной сегментации. Сохранение проектов ещё не реализовано.

## Vue editor

`@qr-studio/toolkit/ui` экспортирует `QrEditor`, `useQrEditor`, фабрику
`createQrEditorState` и словари `qrEditorMessagesRu` / `qrEditorMessagesEn`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { QrEditor, createQrEditorState } from "@qr-studio/toolkit/ui";
const state = ref(createQrEditorState());
</script>

<template>
  <QrEditor v-model="state" locale="ru" />
</template>
```

Внутренние панели находятся в `src/ui/components`: `QrContentForm` отвечает за поля
и blur-состояние, `QrDesignControls` — за оформление, `QrPreview` — за SVG,
пустое состояние, ошибки и диагностику. `QrEditor` владеет общим состоянием,
выбором словаря и компоновкой; панели сообщают об изменениях через типизированные
события и не создают копий состояния. Эти панели не входят в публичные exports.

`v-model` необязателен; без него состояние локально компоненту. URL и текст хранятся
отдельными черновиками. URL требует HTTP(S) и полного адреса; обрезаются только крайние
пробелы. Текст кодируется дословно, включая пробелы и переносы. Изменение оформления
переиспользует матрицу. Неверный ввод, переполнение и ошибки renderer убирают старый preview.
Preview — SVG renderer в изолированном `img` с data URI: без вставки пользовательского HTML
и без lifecycle object URL.

Доступны все настройки playground: формы модулей и маркеров, независимые цвета,
градиенты, квадратная/круглая композиция, внешний фон, рамка, две подписи
(прямые, полосы, дуги), растровый логотип, ECC, версия, размер и quiet zone.
Есть SVG/PNG-экспорт, исходный SVG, измерения, диагностика и проверка через
`BarcodeDetector`, если API доступен. При ошибке экспорт блокируется.

`presets` принимает внешний `readonly QrDesignPreset[]`, `examples` — внешний
`readonly QrEditorExample[]`; оба необязательны. Пресет меняет оформление, сохраняя
содержимое, encoding, размер, quiet zone и логотип. Пример меняет содержимое и версию QR.
Типы экспортируются через `/ui` и `/editor`; готового каталога в пакете нет.
Пустые черновики подписей сохраняют настройки, но не передаются renderer.
Логотипы PNG/JPEG/WebP до 700 КиБ читаются локально; SVG не принимается.
PNG сохраняет прозрачность SVG; растеризация ограничена 16 777 216 пикселями.
Сохранение проектов ещё не подключено.
`messages` принимает полный `QrEditorMessages` для своего языка, включая словарь engine.
`locale="en"` выбирает встроенный английский; локаль внутренних Nuxt UI-компонентов
задаёт host через `UApp`.

`/editor` — отдельный ESM + `.d.ts` entrypoint с типами состояния, фабрикой и подготовкой
содержимого, без Vue/DOM. `/ui` — source-first entrypoint: host компилирует `src` через Vite.
Vue/Nuxt UI остаются optional peers для headless-потребителей; UI-host устанавливает их явно.
Host владеет Nuxt UI plugin, одним `UApp` и глобальным CSS; пример — `apps/frontend`.
Playground остаётся независимым от Vue.

Для IDE используется `src/ui/tsconfig.json` и локальный контекст `#build/ui/*`.
`prepare:ui` генерирует его в `node_modules/.nuxt-ui`; команда включена в `typecheck`
и запуск frontend. `/engine` продолжает собираться отдельно.

Проверки из корня: `pnpm test` — unit, `pnpm test:ui` — реальные действия в Chromium
(1280 и 390 px, включая скачивание и независимое декодирование PNG), `pnpm test:scan` — независимое декодирование SVG/PNG engine.
Для UI-тестов используется установленный Playwright Chromium; команда установки —
`pnpm --filter @qr-studio/toolkit test:scan:install`.
