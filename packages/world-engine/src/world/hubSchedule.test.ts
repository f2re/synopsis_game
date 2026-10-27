import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUB_AMBIENT_CYCLES,
  HubScheduleManager,
  createMulberry32,
  generateSeedFromDateAndLocation,
  FINDINGS_REGISTRY,
} from './hubSchedule.ts';
import { worldBridge } from '../bridge/WorldBridge.ts';

test('1. Расписание хаба содержит >= 14 канонических циклов', () => {
  assert.ok(HUB_AMBIENT_CYCLES.length >= 14, `Ожидалось >= 14 циклов, получено ${HUB_AMBIENT_CYCLES.length}`);
  assert.equal(HUB_AMBIENT_CYCLES.length, 18);
});

test('2. Лимит одновременно активных спорадических событий строго <= 3', () => {
  const manager = new HubScheduleManager(26063);

  // Симулируем 2 часа времени с шагом 5 секунд (1440 тиков)
  for (let tick = 0; tick < 1440; tick++) {
    manager.update(5, (tick % 24));
    const activeCount = manager.getActiveSporadicCount();
    assert.ok(
      activeCount <= 3,
      `Нарушение лимита спорадических событий: активно ${activeCount} > 3 на шаге ${tick}`,
    );
  }
});

test('3. Воспроизводимость поведения по сиду (два менеджера с сидом 26063 идентичны)', () => {
  const managerA = new HubScheduleManager(26063);
  const managerB = new HubScheduleManager(26063);

  for (let tick = 0; tick < 500; tick++) {
    const startedA = managerA.update(10, 12);
    const startedB = managerB.update(10, 12);
    assert.deepEqual(startedA, startedB, `Рассинхронизация на тике ${tick}`);
    assert.deepEqual(
      managerA.getActiveSporadicEvents(),
      managerB.getActiveSporadicEvents(),
      `Рассинхронизация активных событий на тике ${tick}`,
    );
  }
});

test('4. Реакция фауны на нажатие и фиксация находок на сервере', () => {
  const manager = new HubScheduleManager(26063);
  let discoveredFindingId = '';

  const unsub = worldBridge.on('world:finding_discovered', (finding: any) => {
    discoveredFindingId = finding.id;
  });

  // Клик по большой синице
  const titRes = manager.interactWithFauna('bird_tit');
  assert.equal(titRes.reacted, true);
  assert.equal(titRes.finding?.id, 'finding_tit');
  assert.equal(discoveredFindingId, 'finding_tit');

  // Клик по белке
  const squirrelRes = manager.interactWithFauna('animal_squirrel');
  assert.equal(squirrelRes.reacted, true);
  assert.equal(squirrelRes.finding?.id, 'finding_squirrel');
  assert.equal(discoveredFindingId, 'finding_squirrel');

  unsub();
});

test('5. Режим study-calm блокирует появление новых спорадических событий', () => {
  const manager = new HubScheduleManager(26063);
  manager.setStudyCalm(true);

  for (let tick = 0; tick < 100; tick++) {
    const started = manager.update(10, 12);
    assert.equal(started.length, 0, 'В режиме study-calm не должны стартовать спорадические события');
  }
});
