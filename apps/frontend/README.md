# QR Studio frontend

Vue SPA на Vite и Nuxt UI. Сейчас это только каркас приложения без бизнес-логики.

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
