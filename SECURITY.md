# Security policy

Проект предполагает realtime-матчи, учебные группы и хранение результатов студентов, поэтому безопасность рассматривается как часть архитектуры, а не как завершающий этап.

## Supported versions

До появления первого релиза поддерживается только актуальная ветка `main`.

## Сообщение об уязвимости

Не публикуйте exploit details в публичном issue, если проблема позволяет:

- получить чужие ответы/данные;
- подменить результат матча;
- повысить привилегии;
- обойти авторизацию;
- получить административный доступ;
- раскрыть персональные данные;
- выполнить код на сервере/клиенте другого пользователя.

До настройки отдельного security contact используйте приватные механизмы GitHub Security Advisories, если они доступны для репозитория.

## Security principles

- server-authoritative match state;
- правильные ответы не отправляются клиенту до проверки/закрытия задачи;
- серверная authorization для instructor/content/admin функций;
- input validation на REST/WebSocket boundaries;
- rate limiting и abuse protection;
- secrets не попадают во frontend bundle или репозиторий;
- минимизация собираемых персональных данных;
- audit trail для административных действий;
- immutable/versioned published content;
- replay/event logs не должны раскрывать лишние персональные данные.

## Privacy baseline

Базовый продукт не требует камеры, микрофона, геолокации или биометрии.

Если такие функции когда-либо появятся, они должны быть отдельными opt-in возможностями с собственным privacy review.

## Threat areas for MVP

1. подмена answer payload;
2. client-side timer manipulation;
3. replay/event injection;
4. WebSocket impersonation;
5. unauthorized spectator/instructor access;
6. brute force join codes;
7. content pack tampering;
8. injection/XSS через authored content;
9. excessive data export;
10. denial-of-service на tournament rooms.

## Security release gate

Перед публичным пилотом обязательны:

- dependency review;
- auth/authz tests;
- WebSocket permission tests;
- rate-limit smoke test;
- client payload inspection;
- CSP/XSS review;
- secret scanning;
- backup/restore test для ключевых данных.
