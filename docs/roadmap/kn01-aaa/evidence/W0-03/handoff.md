# W0-03 — Детерминированный тестовый ростер и сид для e2e

Исполнитель (роль): identity-avatar-engineer
Изменённые файлы:
- `apps/server/src/modules/identity/testRoster.ts`
- `apps/server/src/modules/identity/testRoster.test.ts`
- `apps/server/src/modules/identity/identityService.ts`
- `apps/server/src/index.ts`
- `config/test-roster.example.json`

Что сделано по каждому критерию приёмки:
1. **Тестовый ростер создаётся только при SYNOPSIS_SECURITY_PROFILE=trusted и явном флаге тестового режима**:
   Реализована строгая проверка в `seedTestRoster`: при `securityProfile !== 'trusted'` возвращается отказ `{ seeded: false, reason: 'profile_not_trusted' }`. При отсутствии флага `SYNOPSIS_ENABLE_TEST_ROSTER` возвращается отказ `{ seeded: false, reason: 'test_mode_not_enabled' }`.
2. **Тестовые коды берутся из файла примера, не из исходного кода, и не логируются**:
   Создан файл примера `config/test-roster.example.json`. Модуль `testRoster.ts` считывает данные из внешнего файла, преобразует коды в криптографический scrypt-хэш с солью, исходный код не содержит строковых литералов паролей/кодов. Коды в консоль и журналы не выводятся.
3. **e2e может войти, начать смену и выйти; в профиле public ростер не создаётся (тест)**:
   Написаны и успешно пройдены тесты в `apps/server/src/modules/identity/testRoster.test.ts`, подтверждающие блокировку в `public`-профиле, корректный вход тестового курсанта, запуск первой смены в `ShiftService`, отправку ответов и завершение сессии.

Доказательства (пути):
- `docs/roadmap/kn01-aaa/evidence/W0-03/test-log.txt`

Допущения:
- В проде по умолчанию `SYNOPSIS_SECURITY_PROFILE=public`, поэтому тестовый ростер не активируется даже при ошибочном указании флага, пока профиль не переключен в `trusted`.

Нерешённые риски:
- Отсутствуют.

Требуемые проверяющие:
- `security-privacy-reviewer`
