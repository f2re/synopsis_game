# Architecture Decision Records (ADR)

ADR фиксируют решения, которые влияют на несколько модулей или которые дорого отменять после реализации.

## Когда нужен ADR

- выбор authoritative server модели;
- изменение границ пакетов;
- смена формата replay;
- новый принцип versioning;
- изменение method-profile semantics;
- выбор стратегии map renderer;
- изменение правил хранения published content;
- смена рейтинговой модели;
- существенное изменение privacy/security модели.

## Формат файла

`ADR-XXXX-short-title.md`

```markdown
# ADR-XXXX — Название

Status: proposed | accepted | superseded | rejected
Date: YYYY-MM-DD

## Context
...

## Decision
...

## Consequences
### Positive
- ...
### Negative
- ...

## Alternatives considered
- ...

## Links
- issue/PR/docs
```

## Правило

ADR описывает **почему** принято решение. Текущая спецификация описывает **что** теперь считается правильным.

Если ADR заменён новым, старый не удаляется: статус меняется на `superseded`, а новый ADR ссылается на него.
