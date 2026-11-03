# Тема QR Studio

Тема = пресет Nuxt UI: primary `rose`, success `teal`, neutral `stone`, шрифт Inter,
радиус `0.5rem`, карточки outline с мягкой тенью. Поверх пресета одна правка контраста
(WCAG 2.1 AA) и иконки Remix Icons.
primary rose-500 по выбору владельца: белый текст на нём ниже WCAG AA 4.5:1.

- `@qr-studio/theme/nuxt-ui` — `studioTheme`: палитра, иконки Remix, варианты компонентов
  (поля и кнопки outline по умолчанию, выбранный пункт select, карточки).
- `@qr-studio/theme/nuxt-ui.css` — `@theme` со шрифтом, радиус, переопределения
  `--ui-border-accented` для светлой и тёмной темы.
- `@qr-studio/theme/tokens.css` — переносимые `--studio-font-sans` и `--studio-radius`
  для будущего приложения без Vue/Tailwind. Цвета следуют пресету Nuxt UI.

Host импортирует `tailwindcss`, `@nuxt/ui`, затем `nuxt-ui.css` один раз.
Host подключает Inter ссылкой Google Fonts (пример — `apps/frontend/index.html`).
Тёмная тема определена Nuxt UI через `.dark`; переключение режима принадлежит host.
Цвета QR и каталог его дизайнов независимы от темы интерфейса.

Светлая тема: карточки белые (`--ui-bg: white`), фон страницы neutral-50.
