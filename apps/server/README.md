# apps/server

Авторитетный TypeScript-монолит первого рабочего среза. Модули `identity`, `live-ingest`, `realtime`, `broadcast`, `replay` и `rewards` остаются внутренними модулями сервера до отдельного ADR.

## Identity MVP

Первый реализованный внутренний модуль: `src/modules/identity/`.

Он обеспечивает:

- закрытый список пользователей без публичной саморегистрации;
- создание пользователей администратором;
- вход по персональному коду;
- `scrypt`-verifier вместо хранения кода открытым текстом;
- временную блокировку после повторных ошибок;
- непрозрачные сессионные токены;
- серверную проверку роли `admin`;
- включение/отключение профиля и сброс кода;
- сохранение модульного профиля внешности персонажа.

Данные первого локального прототипа сохраняются в `apps/server/.local/identity.json` и не коммитятся.

## Первый запуск

```bash
corepack enable
pnpm -C apps/server install --ignore-workspace --no-frozen-lockfile
SYNOPSIS_SECURITY_PROFILE=trusted \
SYNOPSIS_BOOTSTRAP_ADMIN_NAME="Администратор" \
SYNOPSIS_BOOTSTRAP_ADMIN_CODE="1234" \
pnpm -C apps/server dev
```

Bootstrap создаёт администратора только если в хранилище ещё нет роли `admin`. После первого запуска переменную `SYNOPSIS_BOOTSTRAP_ADMIN_CODE` следует удалить.

Профиль `trusted` предназначен для контролируемой аудитории. По умолчанию используется `public`, где код должен быть длиннее.
