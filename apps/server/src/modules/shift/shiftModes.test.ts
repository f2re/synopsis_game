import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ActiveShiftSession,
  assertModeAllowed,
  ShiftModeError,
  SHIFT_MODE_CONFIGS,
} from './shiftModes.js';

test('1. Проверка доступности режимов смены по пройденным этапам', () => {
  // «С наставником» доступен новому стажёру
  assert.doesNotThrow(() => {
    assertModeAllowed('mentor', []);
  });

  // «Самостоятельно» закрыт новому стажёру без сданных смен
  assert.throws(
    () => {
      assertModeAllowed('solo', []);
    },
    { code: 'MODE_LOCKED', status: 403 },
  );

  // «Самостоятельно» открывается после первой сданной смены
  assert.doesNotThrow(() => {
    assertModeAllowed('solo', ['shift_c1']);
  });

  // «Блиц 90 с» закрыт, если сдана только С1
  assert.throws(
    () => {
      assertModeAllowed('blitz', ['shift_c1']);
    },
    { code: 'MODE_LOCKED', status: 403 },
  );

  // «Блиц 90 с» открывается после успешной сдачи С2 (Термометр)
  assert.doesNotThrow(() => {
    assertModeAllowed('blitz', ['shift_c1', 'shift_c2']);
  });

  // Неизвестный режим вызывает ошибку
  assert.throws(
    () => {
      assertModeAllowed('unsupported_mode' as any, []);
    },
    { code: 'UNKNOWN_MODE', status: 400 },
  );
});

test('2. Серверный таймер в режиме «Блиц 90 с»', () => {
  const t0 = 1_000_000;
  const session = new ActiveShiftSession({
    id: 'blitz_session_1',
    userId: 'user_blitz',
    shiftId: 'shift_c2',
    mode: 'blitz',
    userCompletedShifts: ['shift_c1', 'shift_c2'],
    tasks: ['task_1', 'task_2', 'task_3'],
    startedAt: t0,
  });

  assert.equal(session.config.timeLimitMs, 90_000);
  assert.equal(session.isExpired(t0 + 10_000), false);
  assert.equal(session.getRemainingMs(t0 + 10_000), 82_500); // 90000 + 2500 - 10000

  // Успешный ответ на 30-й секунде
  const res1 = session.submitAnswer('task_1', t0 + 30_000);
  assert.equal(res1.effectiveMode, 'blitz');
  assert.equal(res1.masteryMultiplier, 0.8);
  assert.equal(res1.isLastTask, false);

  // Успешный ответ на 85-й секунде (в пределах 90 с)
  const res2 = session.submitAnswer('task_2', t0 + 85_000);
  assert.ok(res2.remainingMs! > 0);

  // Попытка ответить на 93-й секунде (после 90 с + 2.5 с grace)
  assert.throws(
    () => {
      session.submitAnswer('task_3', t0 + 93_000);
    },
    { code: 'BLITZ_TIMEOUT', status: 408 },
  );

  assert.equal(session.isCompleted(), true);

  // Повторный ответ на уже завершённой смене
  assert.throws(
    () => {
      session.submitAnswer('task_3', t0 + 95_000);
    },
    { code: 'SHIFT_COMPLETED', status: 400 },
  );
});

test('3. Запрет открытия справочника в режиме «Блиц»', () => {
  const session = new ActiveShiftSession({
    id: 'blitz_session_2',
    userId: 'user_blitz_2',
    shiftId: 'shift_c2',
    mode: 'blitz',
    userCompletedShifts: ['shift_c1', 'shift_c2'],
    tasks: ['task_1'],
  });

  assert.throws(
    () => {
      session.openHandbook('task_1');
    },
    { code: 'HANDBOOK_FORBIDDEN_IN_BLITZ', status: 403 },
  );
});

test('4. Учёт справочника в режиме «Самостоятельно»: штраф только на текущее задание', () => {
  const session = new ActiveShiftSession({
    id: 'solo_session_1',
    userId: 'user_solo',
    shiftId: 'shift_c1',
    mode: 'solo',
    userCompletedShifts: ['shift_c1'],
    tasks: ['task_1', 'task_2', 'task_3'],
  });

  assert.equal(session.getRemainingMs(), null); // в solo нет таймера

  // Задание 1: отвечаем чисто без справочника -> множитель 1.0
  const r1 = session.submitAnswer('task_1');
  assert.equal(r1.effectiveMode, 'solo');
  assert.equal(r1.masteryMultiplier, 1.0);
  assert.equal(session.hasUsedHandbook('task_1'), false);

  // Задание 2: игрок открывает справочник -> фиксируется использование
  const h2 = session.openHandbook('task_2');
  assert.equal(h2.handbookUsed, true);
  assert.equal(h2.effectiveMultiplier, 0.6);
  assert.equal(session.hasUsedHandbook('task_2'), true);

  // Ответ на задание 2 получает множитель 0.6 и effectiveMode solo_with_handbook
  const r2 = session.submitAnswer('task_2');
  assert.equal(r2.effectiveMode, 'solo_with_handbook');
  assert.equal(r2.masteryMultiplier, 0.6);

  // Задание 3: справочник не открывался -> множитель восстанавливается до 1.0
  const r3 = session.submitAnswer('task_3');
  assert.equal(r3.effectiveMode, 'solo');
  assert.equal(r3.masteryMultiplier, 1.0);
  assert.equal(r3.isLastTask, true);
  assert.equal(session.isCompleted(), true);

  // Попытка открыть справочник после завершения смены
  assert.throws(
    () => {
      session.openHandbook('task_3');
    },
    { code: 'SHIFT_COMPLETED', status: 400 },
  );
});

test('5. Режим «С наставником»: справочник открыт постоянно с множителем 0.6', () => {
  const session = new ActiveShiftSession({
    id: 'mentor_session_1',
    userId: 'user_mentor',
    shiftId: 'shift_c1',
    mode: 'mentor',
    userCompletedShifts: [],
    tasks: ['task_1'],
  });

  assert.equal(session.config.mentorHintsAllowed, true);
  assert.equal(session.config.handbookAllowed, true);

  const h = session.openHandbook('task_1');
  assert.equal(h.effectiveMultiplier, 0.6);

  const r = session.submitAnswer('task_1');
  assert.equal(r.effectiveMode, 'mentor');
  assert.equal(r.masteryMultiplier, 0.6);
  assert.equal(r.isLastTask, true);
});
