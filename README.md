# Hush

Hush - сайт-мессенджер на Next.js и Supabase.

## Как перенести на другой компьютер

1. Установи Node.js LTS с сайта https://nodejs.org.
2. Распакуй папку проекта.
3. Открой эту папку в VS Code.
4. Открой терминал VS Code и выполни:

```bash
npm install
npm run dev
```

5. Открой сайт в браузере:

```text
http://localhost:3000
```

## Что важно

- Папки `node_modules` и `.next` не нужны для переноса. Они создаются заново командами `npm install` и `npm run dev`.
- Файл `.env.local` нужен для подключения к Supabase.
- Если нужно выложить обновления на сайт, после правок сделай `git add .`, `git commit -m "update"` и `git push`.

## Полезные команды

```bash
npm run dev
npm run build
npm run lint
```
