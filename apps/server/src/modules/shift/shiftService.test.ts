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
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath });
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
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('задания с выбором и последовательностью проходят серверное формирование без эталона в клиенте', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const started = service.startShift('student-2');
    let task = started.task;
    const shiftId = started.shiftId;
    for (const value of [23.4, -5.2, 1021.8]) {
      const result = await service.submitAnswer('student-2', shiftId, task.instanceId, { value });
      task = result.nextTask!;
    }
    assert.equal(task.type, 'choice');
    assert.equal(JSON.stringify(task).includes('choice_index'), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

async function reachStationPlot(service: ShiftService, userId: string) {
  const started = service.startShift(userId);
  const shiftId = started.shiftId;
  let task = started.task;
  for (const value of [23.4, -5.2, 1021.8]) {
    const result = await service.submitAnswer(userId, shiftId, task.instanceId, { value });
    task = result.nextTask!;
  }
  const choiceOptions = task.payload?.options as Array<{ id: number; label: string }>;
  const correctChoice = choiceOptions.find((option) => option.label.startsWith('Равномерное падение давления'))!;
  let result = await service.submitAnswer(userId, shiftId, task.instanceId, { choiceIndex: correctChoice.id });
  task = result.nextTask!;
  const sequenceSteps = task.payload?.steps as Array<{ id: number; label: string }>;
  const expectedLabels = ['iRixhVV', 'Nddff', '1snTTT', '2snTdTdTd', '3PoPoPoPo', '4PPPP или 4a3hhh', '5appp'];
  const order = expectedLabels.map((label) => sequenceSteps.find((step) => step.label === label)!.id);
  result = await service.submitAnswer(userId, shiftId, task.instanceId, { order });
  return { shiftId, task: result.nextTask! };
}

test('stationPlot не раскрывает эталон и переводит к планшону на три станции', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const { shiftId, task } = await reachStationPlot(service, 'student-3');
    assert.equal(task.type, 'stationPlot');
    assert.equal(JSON.stringify(task).includes('"obs_t":"slot_01"'), false);
    const result = await service.submitAnswer('student-3', shiftId, task.instanceId, {
      placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' },
    });
    assert.equal(result.feedback.correct, true);
    assert.equal(result.completed, false);
    assert.equal(result.nextTask?.type, 'stationBoard');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('трёхстанционный планшон скрывает эталон и проверяет позиции по каждой станции', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachStationPlot(service, 'student-4');
    const stationPlotResult = await service.submitAnswer('student-4', reached.shiftId, reached.task.instanceId, {
      placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' },
    });
    const board = stationPlotResult.nextTask!;
    assert.equal(board.response.kind, 'stationBoard');
    assert.equal((board.payload?.stations as unknown[]).length, 3);
    assert.equal(JSON.stringify(board).includes('"a_t":"a_nw"'), false);

    const result = await service.submitAnswer('student-4', reached.shiftId, board.instanceId, {
      placements: {
        a_t: 'a_nw', a_td: 'a_sw',
        b_t: 'b_sw', b_td: 'b_nw',
        c_t: 'c_nw', c_td: 'c_sw',
      },
    });
    assert.equal(result.feedback.correct, false);
    const components = (result.feedback.details as { components: Array<{ correct: boolean }> }).components;
    assert.equal(components.filter((component) => component.correct).length, 4);
    assert.equal(result.completed, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
