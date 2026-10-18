# QR Studio frontend

Vue SPA на Vite и Nuxt UI. Подключён общий редактор URL/Text с live preview, всеми настройками playground и SVG/PNG-экспортом.
Демонстрационные пресеты и примеры передаются редактору из `src/presets.ts`.

Из корня репозитория:

```sh
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

Frontend владеет Nuxt UI Vite/runtime plugin, единственным `UApp` и глобальным CSS.
Тема Iris импортируется из `@qr-studio/theme`; Remix Icons собираются локально,
Manrope поставляется с приложением без Google Fonts.

`@qr-studio/toolkit/ui` подключается из исходников: изменения Vue-компонента
подхватываются HMR без отдельной сборки toolkit. `resolve.dedupe` объединяет Vue
и Nuxt UI из приложения и пакета. Глобальные стили импортируются только в `main.ts`.
Tailwind явно сканирует UI toolkit; Nuxt UI `scanPackages` обнаруживает используемые компоненты.
Router, хранилище и API появятся вместе с соответствующими сценариями.

Для IntelliSense оба TypeScript aliases (`#build/ui` и `#build/ui/*`) направлены
в локальный `node_modules/.nuxt-ui/ui`. `prepare:ui` генерирует тему через config hooks
Vite без запуска сервера. `typecheck` вызывает подготовку сам, `build` проверяет типы
после Vite. `dev` также подготавливает контекст типов toolkit. Генерируемые файлы
находятся в игнорируемом `node_modules`, вручную их создавать не нужно.
Компоненты и composables импортируются явно: auto-import и его `.d.ts` отключены намеренно.

Проверка UI: `pnpm test:ui` из корня запускает собственный Vite-сервер на свободном
локальном порту и Chromium. Сценарии проверяют ввод,
переключение черновиков, все группы оформления, логотип, размеры и скачивание SVG/PNG,
точное содержимое PNG через локальный ZXing WASM, ошибки/восстановление, отсутствие внешних запросов
и горизонтальной прокрутки. Требуется Playwright Chromium, установленный командой
`pnpm --filter @qr-studio/toolkit test:scan:install`. Тесты не используют уже открытый dev-сервер.

Адаптивная компоновка и подсказки проверяются на 1920/1440/768/390 px,
включая клавиатуру и касания. На широком экране редактор занимает три колонки;
основные группы настроек раскрыты сразу. Снимки desktop/mobile сохраняются в `test-results/`.
