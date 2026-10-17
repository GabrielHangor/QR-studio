# Общая тема QR Studio

Основа — Iris из [Nuxt UI Theme](https://ui.nuxt.com/theme): Violet, Fuchsia,
Mauve, Manrope и Remix Icons. Новых вариантов дизайна здесь нет.

- `@qr-studio/theme/tokens.css` — обычный CSS с токенами `--studio-*` для
  поверхности, текста, акцентов, шрифта и радиуса. Не зависит от Vue/Nuxt UI/Tailwind;
  импортирует локальные файлы Manrope. Доступен будущему Astro-приложению.
- `@qr-studio/theme/nuxt-ui.css` — адаптер токенов к Nuxt UI и Tailwind.
- `@qr-studio/theme/nuxt-ui` — экспорт `irisTheme` для Nuxt UI Vite plugin:
  палитры, иконки и варианты компонентов из Iris.

Host импортирует `tailwindcss`, `@nuxt/ui`, затем `nuxt-ui.css` один раз.
Тёмные значения заданы через `.dark`; переключение режима принадлежит host.
Полные шкалы цветов предоставляет Tailwind, компоненты используют семантические
токены Nuxt UI. При смене палитры нужно согласованно обновить конфигурацию и CSS-акценты.
