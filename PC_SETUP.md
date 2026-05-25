# Как работать с Hush на ноутбуке и ПК без флешки

Проект уже лежит в GitHub:

```bash
https://github.com/m1trond/twinline.git
```

## 1. Первый запуск на ПК

Открой PowerShell в папке, где хочешь держать проект, например на рабочем столе:

```powershell
cd $env:USERPROFILE\Desktop
git clone https://github.com/m1trond/twinline.git Hush
cd Hush
npm install
```

## 2. Настрой `.env.local`

В проекте есть файл `.env.example`. На ПК создай рядом файл `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Потом открой `.env.local` и вставь значения из `.env.local` на ноутбуке.

Нужны эти строки:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Важно: `.env.local` нельзя пушить в GitHub. Там ключи проекта.

## 3. Запуск сайта на ПК

```powershell
npm run dev
```

Обычно сайт откроется здесь:

```text
http://localhost:3000
```

Если порт занят, Next.js сам предложит другой порт.

## 4. Как работать с двух устройств

Перед началом работы на любом устройстве всегда подтягивай свежую версию:

```powershell
git pull
```

После изменений:

```powershell
git status
git add .
git commit -m "Коротко что изменил"
git push
```

## 5. Правильная схема

Ноутбук:

```powershell
git pull
# работаешь
git add .
git commit -m "Изменения с ноутбука"
git push
```

ПК:

```powershell
git pull
# продолжаешь работу
git add .
git commit -m "Изменения с ПК"
git push
```

Главное правило: перед работой всегда `git pull`, после нормальной правки всегда `git push`.

## 6. Что будет общим между устройствами

Код сайта будет общий через GitHub.

Данные сайта будут общими через Supabase:

- аккаунты;
- сообщения;
- профили;
- папки чатов;
- архив;
- настройки, которые мы вынесли в синхронизацию.

То есть проект не надо переносить вручную. ПК просто скачивает код из GitHub и подключается к той же базе Supabase.

