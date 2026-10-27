import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ProgressionService,
  KN01_LEVEL1_ELEMENTS,
  calculateMasteryGain,
  calculateMasteryPenalty,
  calculateTimeDecay,
  type Kn01Element,
} from './progressionService.js';

test('1. Математические формулы прироста, штрафа и затухания освоения', () => {
  // Прирост при старте (M = 0): base 20, solo, diff 1 -> 20.0
  const gain0 = calculateMasteryGain(0, 20.0, 'solo', 1);
  assert.equal(gain0, 20.0);

  // Насыщение при M = 50: (1 - 50/100) = 0.5 -> 10.0
  const gain50 = calculateMasteryGain(50, 20.0, 'solo', 1);
  assert.equal(gain50, 10.0);

  // Множитель режима: mentor = 0.6 -> 6.0
  const gainMentor = calculateMasteryGain(50, 20.0, 'mentor', 1);
  assert.equal(gainMentor, 6.0);

  // Множитель сложности: diff 2 = 1.25 -> 12.5
  const gainDiff2 = calculateMasteryGain(50, 20.0, 'solo', 2);
  assert.equal(gainDiff2, 12.5);

  // Штраф при ошибке (M = 80): solo, base 20, penalty factor 0.35 -> 1.0 * 0.35 * 20 * 0.8 = 5.6
  const penalty = calculateMasteryPenalty(80, 20.0, 'solo', 0.35);
  assert.equal(penalty, 5.6);

  // Затухание: в пределах 24 ч — без затухания
  const decay20h = calculateTimeDecay(80.0, 20, 24, 0.02, 40.0);
  assert.equal(decay20h, 80.0);

  // Затухание через 48 ч (1 день после льготного периода): 80 * (1 - 0.02) = 78.4
  const decay48h = calculateTimeDecay(80.0, 48, 24, 0.02, 40.0);
  assert.ok(Math.abs(decay48h - 78.4) < 0.001);

  // Несгораемый пол: 50 дней не опускают ниже 40.0
  const decayFloor = calculateTimeDecay(80.0, 1200, 24, 0.02, 40.0);
  assert.equal(decayFloor, 40.0);
});

test('2. Начальное состояние и блокировка неразрешённых смен', () => {
  const service = new ProgressionService();
  const userId = 'user_test_01';

  const state = service.getProgression(userId);
  assert.equal(state.userId, userId);
  assert.equal(state.rankTitle, 'Стажёр');
  assert.equal(state.unlockedShifts.length, 1);
  assert.equal(state.unlockedShifts[0], 'shift_c1');
  assert.equal(state.completedShifts.length, 0);
  assert.equal(state.examPassed, false);

  // Все 10 элементов равны 0.0
  for (const el of KN01_LEVEL1_ELEMENTS) {
    assert.equal(state.elementMastery[el], 0.0);
  }

  // Попытка запустить заблокированную смену С2 вызывает ошибку 403
  assert.throws(
    () => {
      service.completeShift(userId, {
        shiftId: 'shift_c2',
        mode: 'solo',
        durationMs: 120000,
        taskResults: [],
      });
    },
    { code: 'SHIFT_LOCKED' },
  );
});

test('3. Последовательная разблокировка смен С1 -> С2 -> С3 -> С4 -> С5 и выдача наград', () => {
  const service = new ProgressionService();
  const userId = 'user_cadet_progression';

  // Проходим С1
  const s1 = service.completeShift(userId, {
    shiftId: 'shift_c1',
    mode: 'solo',
    durationMs: 60000,
    taskResults: [
      { taskTemplateId: 'tmpl_c1_aaxx', element: 'AAXX', isCorrect: true },
      { taskTemplateId: 'tmpl_c1_yyg', element: 'YYGGiw', isCorrect: true },
      { taskTemplateId: 'tmpl_c1_station', element: 'IIiii', isCorrect: true },
    ],
  });

  assert.equal(s1.passed, true);
  assert.ok(s1.rewardsGranted.includes('pencil_trainee'));
  assert.ok(s1.unlockedShifts.includes('shift_c2'));

  let state = service.getProgression(userId);
  assert.ok(state.unlockedShifts.includes('shift_c2'));
  assert.ok(state.rewards.includes('pencil_trainee'));

  // Проходим С2 -> разблокировка С3 и значок «Термометр»
  const s2 = service.completeShift(userId, {
    shiftId: 'shift_c2',
    mode: 'solo',
    durationMs: 70000,
    taskResults: [
      { taskTemplateId: 'tmpl_c2_t', element: '1snTTT', isCorrect: true },
      { taskTemplateId: 'tmpl_c2_td', element: '2snTdTdTd', isCorrect: true },
    ],
  });
  assert.ok(s2.rewardsGranted.includes('badge_thermometer'));
  assert.ok(s2.unlockedShifts.includes('shift_c3'));

  // Проходим С3 -> разблокировка С4 и значок «Барометр»
  const s3 = service.completeShift(userId, {
    shiftId: 'shift_c3',
    mode: 'solo',
    durationMs: 75000,
    taskResults: [
      { taskTemplateId: 'tmpl_c3_p', element: '3PoPoPoPo', isCorrect: true },
      { taskTemplateId: 'tmpl_c3_sea', element: '4PPPP', isCorrect: true },
      { taskTemplateId: 'tmpl_c3_tend', element: '5appp', isCorrect: true },
    ],
  });
  assert.ok(s3.rewardsGranted.includes('badge_barometer'));
  assert.ok(s3.unlockedShifts.includes('shift_c4'));

  // Проходим С4 -> разблокировка С5 и значок «Флюгер»
  const s4 = service.completeShift(userId, {
    shiftId: 'shift_c4',
    mode: 'solo',
    durationMs: 80000,
    taskResults: [
      { taskTemplateId: 'tmpl_c4_wind', element: 'Nddff', isCorrect: true },
      { taskTemplateId: 'tmpl_c4_high', element: '00fff', isCorrect: true },
    ],
  });
  assert.ok(s4.rewardsGranted.includes('badge_vane'));
  assert.ok(s4.unlockedShifts.includes('shift_c5'));

  // Проходим С5
  const s5 = service.completeShift(userId, {
    shiftId: 'shift_c5',
    mode: 'solo',
    durationMs: 120000,
    taskResults: [
      { taskTemplateId: 'tmpl_c5_all', element: '1snTTT', isCorrect: true },
    ],
  });
  assert.equal(s5.passed, true);
  state = service.getProgression(userId);
  assert.deepEqual(state.completedShifts, ['shift_c1', 'shift_c2', 'shift_c3', 'shift_c4', 'shift_c5']);
});

test('4. Журнал ошибок: повторы, фиксация кода причины и авторазрешение', () => {
  const service = new ProgressionService();
  const userId = 'user_errors_drill';

  // Совершаем ошибку на знаке sn температуры
  const r1 = service.recordAnswer(userId, {
    taskTemplateId: 'tmpl_c2_temp_sn',
    element: '1snTTT',
    isCorrect: false,
    errorCode: 'ERR_SN_SIGN_CONFUSION',
  });
  assert.ok(r1.errorEntry);
  assert.equal(r1.errorEntry.repeatCount, 1);
  assert.equal(r1.errorEntry.errorCode, 'ERR_SN_SIGN_CONFUSION');
  assert.equal(r1.errorEntry.resolved, false);

  // Повторная ошибка на том же шаблоне
  const r2 = service.recordAnswer(userId, {
    taskTemplateId: 'tmpl_c2_temp_sn',
    element: '1snTTT',
    isCorrect: false,
    errorCode: 'ERR_SN_SIGN_CONFUSION',
  });
  assert.equal(r2.errorEntry?.repeatCount, 2);

  // Проверяем список ошибок через getErrorJournal
  let errors = service.getErrorJournal(userId);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].repeatCount, 2);

  // Правильный ответ на этом же задании переводит ошибку в resolved
  const r3 = service.recordAnswer(userId, {
    taskTemplateId: 'tmpl_c2_temp_sn',
    element: '1snTTT',
    isCorrect: true,
  });
  assert.ok(r3.delta > 0);

  errors = service.getErrorJournal(userId, { unresolvedOnly: true });
  assert.equal(errors.length, 0);

  const allErrors = service.getErrorJournal(userId);
  assert.equal(allErrors.length, 1);
  assert.equal(allErrors[0].resolved, true);
  assert.ok(allErrors[0].resolvedAt);
});

test('5. Серия правильных ответов (streak) и награда «Лампа дежурного»', () => {
  const service = new ProgressionService();
  const userId = 'user_streak_master';

  // Совершаем 10 правильных ответов подряд
  for (let i = 0; i < 10; i++) {
    service.recordAnswer(userId, {
      taskTemplateId: `task_${i}`,
      element: 'AAXX',
      isCorrect: true,
    });
  }

  // Завершаем смену С1 с 10 ответами
  const s = service.completeShift(userId, {
    shiftId: 'shift_c1',
    mode: 'solo',
    durationMs: 90000,
    taskResults: Array.from({ length: 10 }, (_, i) => ({
      taskTemplateId: `task_shift_${i}`,
      element: 'AAXX' as Kn01Element,
      isCorrect: true,
    })),
  });

  const state = service.getProgression(userId);
  assert.ok(state.maxStreak >= 10);
  assert.ok(state.rewards.includes('duty_lamp'));
});

test('6. Расчёт допуска к экзамену: критерии 10 элементов >= 80% и общий >= 85%', () => {
  const service = new ProgressionService();
  const userId = 'user_exam_candidate';

  // Сначала смены не пройдены и освоение 0
  let check = service.checkExamEligibility(userId);
  assert.equal(check.eligible, false);
  assert.ok(check.reasons.some((r) => r.includes('Не пройдена обязательная смена')));

  // Завершаем С1–С5
  for (const shift of ['shift_c1', 'shift_c2', 'shift_c3', 'shift_c4', 'shift_c5']) {
    service.getProgression(userId).unlockedShifts.push(shift);
    service.completeShift(userId, {
      shiftId: shift,
      mode: 'solo',
      durationMs: 30000,
      taskResults: [{ taskTemplateId: `tmpl_${shift}`, element: 'AAXX', isCorrect: true }],
    });
  }

  // Смены завершены, но освоение ещё не набрано
  check = service.checkExamEligibility(userId);
  assert.equal(check.eligible, false);
  assert.ok(check.reasons.some((r) => r.includes('ниже порога 80%')));

  // Накачиваем освоение 9 элементов до 85%, а 10-й элемент (00fff) оставляем на 60%
  const state = service.getProgression(userId);
  for (const el of KN01_LEVEL1_ELEMENTS) {
    state.elementMastery[el] = 88.0;
  }
  state.elementMastery['00fff'] = 65.0; // ниже 80%

  check = service.checkExamEligibility(userId);
  assert.equal(check.eligible, false);
  assert.ok(check.reasons.some((r) => r.includes('00fff')));

  // Подтягиваем 00fff до 85% -> общий 87.7%
  state.elementMastery['00fff'] = 85.0;
  check = service.checkExamEligibility(userId);
  assert.equal(check.eligible, true);
  assert.equal(check.reasons.length, 0);
  assert.ok(check.minElementMastery >= 80.0);
  assert.ok(check.overallMastery >= 85.0);
});

test('7. Квалификационный экзамен: сдача, несдача, кулдаун и разблокировка локаций', () => {
  const service = new ProgressionService();
  const userId = 'user_exam_runner';
  const state = service.getProgression(userId);

  // Пытаемся сдать допуск, когда он заблокирован
  assert.throws(
    () => {
      service.completeExam(userId, {
        durationMs: 300000,
        taskResults: [],
      });
    },
    { code: 'EXAM_LOCKED' },
  );

  // Разблокируем допуск
  state.unlockedShifts.push('shift_exam');

  // Несдача: 7 правильных из 12 (58% < 80%)
  const failRes = service.completeExam(userId, {
    durationMs: 400000,
    taskResults: Array.from({ length: 12 }, (_, i) => ({
      taskTemplateId: `exam_task_${i}`,
      element: '1snTTT' as Kn01Element,
      isCorrect: i < 7,
    })),
  });
  assert.equal(failRes.passed, false);
  assert.equal(state.examPassed, false);
  assert.equal(state.failedExamCooldownShiftsRemaining, 1);

  // Во время кулдауна экзамен блокируется проверкой checkExamEligibility
  const cooldownCheck = service.checkExamEligibility(userId);
  assert.equal(cooldownCheck.eligible, false);
  assert.ok(cooldownCheck.reasons.some((r) => r.includes('кулдаун') || r.includes('тренировочную смену')));

  // Проходим тренировочную смену С1 -> кулдаун снимается
  service.completeShift(userId, {
    shiftId: 'shift_c1',
    mode: 'solo',
    durationMs: 60000,
    taskResults: [{ taskTemplateId: 't1', element: 'AAXX', isCorrect: true }],
  });
  assert.equal(state.failedExamCooldownShiftsRemaining, 0);

  // Успешная сдача допуска: 11 из 12 (91.7% >= 80%)
  const passRes = service.completeExam(userId, {
    durationMs: 350000,
    taskResults: Array.from({ length: 12 }, (_, i) => ({
      taskTemplateId: `exam_task_${i}`,
      element: '1snTTT' as Kn01Element,
      isCorrect: i < 11,
    })),
  });

  assert.equal(passRes.passed, true);
  assert.equal(passRes.rankTitle, 'Техник-метеоролог');
  assert.ok(passRes.rewards.includes('token_code_post_26063'));
  assert.ok(passRes.rewards.includes('certificate_code_post_level1'));
  assert.ok(passRes.unlockedLocations.includes('cartography_class'));
  assert.ok(passRes.unlockedLocations.includes('archive_vault'));

  assert.equal(state.examPassed, true);
  assert.equal(state.rankTitle, 'Техник-метеоролог');
  assert.ok(state.unlockedLocations.includes('cartography_class'));
  assert.ok(state.unlockedLocations.includes('archive_vault'));
});

test('8. Персистентность состояния прогрессии (saveState / loadState)', async () => {
  const storePath = join(tmpdir(), `progression_test_${randomUUID()}.json`);
  const serviceA = new ProgressionService({ storePath });
  const userId = 'persisted_user_01';

  // Меняем состояние
  serviceA.recordAnswer(userId, {
    taskTemplateId: 'tmpl_1',
    element: '4PPPP',
    isCorrect: true,
    mode: 'solo',
  });
  serviceA.getProgression(userId).rewards.push('test_trophy');
  await serviceA.saveState();

  // Создаём новый экземпляр и загружаем
  const serviceB = new ProgressionService({ storePath });
  await serviceB.loadState();

  const loadedState = serviceB.getProgression(userId);
  assert.ok(loadedState.elementMastery['4PPPP'] > 0);
  assert.ok(loadedState.rewards.includes('test_trophy'));

  // Проверка обработки отсутствующего файла
  const serviceEmpty = new ProgressionService({ storePath: join(tmpdir(), `nonexistent_${randomUUID()}.json`) });
  await serviceEmpty.loadState();
});

test('9. Вызов applyDecay и мягкое затухание по прошествии времени', () => {
  const service = new ProgressionService();
  const userId = 'user_decay_test';

  const t0 = new Date('2026-10-01T12:00:00Z').toISOString();
  const state = service.getProgression(userId, t0);
  state.elementMastery['AAXX'] = 90.0;
  state.lastActiveAt = t0;

  // Через 12 часов (внутри льготного периода 24ч) — без изменений
  const t12h = new Date('2026-10-02T00:00:00Z').toISOString();
  service.applyDecay(userId, t12h);
  assert.equal(state.elementMastery['AAXX'], 90.0);

  // Через 72 часа (48 часов после льготного периода) — затухание 2 суток
  const t72h = new Date('2026-10-04T12:00:00Z').toISOString();
  service.applyDecay(userId, t72h);
  assert.ok(state.elementMastery['AAXX'] < 90.0);
  assert.ok(state.elementMastery['AAXX'] > 40.0);
});
