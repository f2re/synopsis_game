import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { ShiftService } from './shiftService.js';

test('первая смена не раскрывает ответ и сохраняет попытку в неизменяемый журнал', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const attemptLogPath = join(directory, 'attempts.jsonl');
    const service = new ShiftService({
      contentRoot: resolve(process.cwd(), '../../content'),
      attemptLogPath,
    });
    await service.init();
    const started = service.startShift('student-1');
    assert.equal(started.task.definitionId, 'kn01_temp_001');
    assert.equal(JSON.stringify(started.task).includes('23.4'), false);
    assert.equal('answer' in started.task, false);

    const result = await service.submitAnswer('student-1', started.shiftId, started.task.instanceId, { value: 23.4 });
    assert.equal(result.feedback.correct, true);
    assert.equal(result.feedback.correctAnswer, 23.4);
    assert.equal(result.nextTask?.definitionId, 'kn01_dewpoint_001');

    const log = await readFile(attemptLogPath, 'utf8');
    assert.match(log, /"definitionId":"kn01_temp_001"/);
    assert.match(log, /"correct":true/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('задания с выбором и последовательностью проходят серверное формирование без эталона в клиенте', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const started = service.startShift('student-2');
    let task = started.task;
    let shiftId = started.shiftId;
    for (const value of [23.4, -5.2, 1021.8]) {
      const result = await service.submitAnswer('student-2', shiftId, task.instanceId, { value });
      task = result.nextTask!;
    }
    assert.equal(task.type, 'choice');
    assert.equal(JSON.stringify(task).includes('choice_index'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
