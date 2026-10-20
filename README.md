# QR Studio

Веб-редактор оформленных QR-кодов. Работают headless engine, общий Vue editor
и приложение для ручной проверки с переключателем полной и компактной конфигураций.
Публичный лендинг, аккаунты, динамические ссылки и аналитика ещё не реализованы.

## Запуск

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Версия Node закреплена в `.nvmrc`, pnpm — в `packageManager` корневого `package.json`.
`pnpm dev` запускает `apps/frontend`; изменения toolkit подхватываются через HMR.

## Проверки

| Команда из корня                    | Назначение                                                      |
| ----------------------------------- | --------------------------------------------------------------- |
| `pnpm lint`                         | Oxlint, предупреждения считаются ошибками                       |
| `pnpm format:check` / `pnpm format` | Проверить / применить форматирование                            |
| `pnpm typecheck`                    | TypeScript и Vue-шаблоны                                        |
| `pnpm test`                         | Модульные тесты engine/editor                                   |
| `pnpm test:scan`                    | SVG → PNG в Chromium → независимый ZXing WASM decoder           |
| `pnpm test:ui`                      | Действия в редакторе на desktop/mobile, экспорт и декодирование |
| `pnpm build`                        | Сборка пакета и frontend                                        |

Для браузерных тестов один раз установите Chromium:
`pnpm --filter @qr-studio/toolkit test:scan:install`.
На Linux CI: `pnpm --filter @qr-studio/toolkit exec playwright install --with-deps chromium`.
UI-тесты поднимают собственный локальный сервер; dev-сервер им не нужен.
Отчёты и файлы неудачных scan-сценариев находятся в
`packages/qr-toolkit/test-results/scan/`; каталог очищается перед прогоном.
В CI сохраняйте его как artifact даже при ошибке.

## Документация

- [Продукт](docs/product.md) — границы релизов, требования и приёмка.
- [Архитектура](docs/architecture.md) — пакеты, интеграция UI и технические решения.
- [Toolkit](packages/qr-toolkit/README.md) — API и подключение редактора.
- [Тема](packages/theme/README.md) — токены Iris и адаптер Nuxt UI.
- [Правила работы](AGENTS.md).

Исторические исследования: [редакторы и UX](docs/archive/qr-studio-competitive-ux-research-2026-10-14.md),
[рынок](docs/archive/micro-saas-qr-market-research-ru-2026-10-14.md).
Это датированные наблюдения, а не текущие требования или актуальные цены.
