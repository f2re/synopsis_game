import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { EquipmentError, EquipmentService } from './equipmentService.js';

test('награды выдаются только за подтверждённый результат и идемпотентны', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synopsis-equipment-'));
  try {
    const path = join(dir, 'equipment.json');
    const service = new EquipmentService(path);
    await service.load();
    assert.throws(() => service.assertEquippable('student', 'badge.first-shift'),
      (error: unknown) => error instanceof EquipmentError && error.code === 'badge_locked');

    assert.deepEqual(await service.recordCompletedShift('student', {
      shiftId: 'shift-1', total: 8, firstTryCorrect: 6, assisted: false,
    }), ['badge.first-shift']);
    assert.deepEqual(await service.recordCompletedShift('student', {
      shiftId: 'shift-1', total: 8, firstTryCorrect: 8, assisted: false,
    }), []);
    assert.equal(service.getOverview('student').completedShifts, 1);
    assert.deepEqual(await service.recordCompletedShift('student', {
      shiftId: 'shift-2', total: 8, firstTryCorrect: 8, assisted: true,
    }), []);
    assert.deepEqual(await service.recordCompletedShift('student', {
      shiftId: 'shift-3', total: 8, firstTryCorrect: 8, assisted: false,
    }), ['badge.observer', 'badge.duty']);
    assert.equal(service.getOverview('student').perfectShifts, 1);

    const restored = new EquipmentService(path);
    await restored.load();
    assert.equal(restored.getOverview('student').completedShifts, 3);
    assert.equal(restored.getOverview('other').completedShifts, 0);
    restored.assertEquippable('student', 'badge.observer');
    assert.throws(() => restored.assertEquippable('other', 'badge.observer'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('снаряжение фиксирует ограниченные заряды; чужой значок не даёт бонусов', async () => {
  const service = new EquipmentService();
  const avatar = { badge: 'badge.none', heldItem: 'held.tablet' };
  assert.deepEqual(service.deriveBonuses('student', avatar), { hints: 1, retries: 0 });
  assert.deepEqual(service.deriveBonuses('student', { badge: 'badge.meteo', heldItem: 'held.pencil' }), { hints: 0, retries: 1 });
  assert.throws(() => service.deriveBonuses('student', { badge: 'badge.focus', heldItem: 'held.pencil' }));
  await service.recordCompletedShift('student', { shiftId: 'one', total: 1, firstTryCorrect: 1, assisted: false });
  assert.deepEqual(service.deriveBonuses('student', { badge: 'badge.first-shift', heldItem: 'held.pencil' }), { hints: 0, retries: 2 });
  await service.recordCompletedShift('student', { shiftId: 'two', total: 1, firstTryCorrect: 1, assisted: false });
  await service.recordCompletedShift('student', { shiftId: 'three', total: 1, firstTryCorrect: 1, assisted: false });
  assert.deepEqual(service.getOverview('student').earned.sort(),
    ['badge.first-shift', 'badge.observer', 'badge.duty', 'badge.focus'].sort());
  assert.deepEqual(service.deriveBonuses('student', { badge: 'badge.focus', heldItem: 'held.pencil' }), { hints: 0, retries: 2 });
});
