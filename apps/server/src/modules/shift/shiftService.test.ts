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

async function reachThreeBoard(service: ShiftService, userId: string) {
  const reached = await reachStationPlot(service, userId);
  const stationPlotResult = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, {
    placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' },
  });
  return { shiftId: reached.shiftId, task: stationPlotResult.nextTask! };
}

async function reachEightBoard(service: ShiftService, userId: string) {
  const reached = await reachThreeBoard(service, userId);
  const threeResult = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, {
    placements: { a_t: 'a_nw', a_td: 'a_sw', b_t: 'b_nw', b_td: 'b_sw', c_t: 'c_nw', c_td: 'c_sw' },
  });
  return { shiftId: reached.shiftId, task: threeResult.nextTask! };
}

async function reachFindError(service: ShiftService, userId: string) {
  const reached = await reachEightBoard(service, userId);
  const eightResult = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, {
    placements: {
      a8_t: 'a8_nw', a8_td: 'a8_sw', b8_t: 'b8_nw', b8_td: 'b8_sw',
      c8_t: 'c8_nw', c8_td: 'c8_sw', d8_t: 'd8_nw', d8_td: 'd8_sw',
      e8_t: 'e8_nw', e8_td: 'e8_sw', f8_t: 'f8_nw', f8_td: 'f8_sw',
      g8_t: 'g8_nw', g8_td: 'g8_sw', h8_t: 'h8_nw', h8_td: 'h8_sw',
    },
  });
  return { shiftId: reached.shiftId, task: eightResult.nextTask! };
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
    assert.equal(result.nextTask?.definitionId, 'station_board_three_001');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('трёхстанционный планшон скрывает эталон и переводит к плотному планшону', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachThreeBoard(service, 'student-4');
    const board = reached.task;
    assert.equal(board.response.kind, 'stationBoard');
    assert.equal((board.payload?.stations as unknown[]).length, 3);
    assert.equal(JSON.stringify(board).includes('"a_t":"a_nw"'), false);
    const result = await service.submitAnswer('student-4', reached.shiftId, board.instanceId, {
      placements: { a_t: 'a_nw', a_td: 'a_sw', b_t: 'b_nw', b_td: 'b_sw', c_t: 'c_nw', c_td: 'c_sw' },
    });
    assert.equal(result.feedback.correct, true);
    assert.equal(result.completed, false);
    assert.equal(result.nextTask?.definitionId, 'station_board_eight_001');
    assert.equal((result.nextTask?.payload?.stations as unknown[]).length, 8);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('планшон на восемь станций загружается из отдельного файла и ведёт к физическому контролю', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachEightBoard(service, 'student-5');
    const board = reached.task;
    assert.equal(board.definitionId, 'station_board_eight_001');
    assert.equal(board.response.kind, 'stationBoard');
    assert.equal((board.payload?.stations as unknown[]).length, 8);
    assert.equal((board.payload?.observations as unknown[]).length, 16);
    assert.equal(JSON.stringify(board).includes('"a8_t":"a8_nw"'), false);

    const result = await service.submitAnswer('student-5', reached.shiftId, board.instanceId, {
      placements: {
        a8_t: 'a8_nw', a8_td: 'a8_sw', b8_t: 'b8_nw', b8_td: 'b8_sw',
        c8_t: 'c8_nw', c8_td: 'c8_sw', d8_t: 'd8_nw', d8_td: 'd8_sw',
        e8_t: 'e8_nw', e8_td: 'e8_sw', f8_t: 'f8_nw', f8_td: 'f8_sw',
        g8_t: 'g8_nw', g8_td: 'g8_sw', h8_t: 'h8_nw', h8_td: 'h8_sw',
      },
    });
    assert.equal(result.feedback.correct, true);
    assert.equal(result.completed, false);
    assert.equal(result.nextTask?.definitionId, 'find_error_td_gt_t_001');
    assert.equal(result.nextTask?.response.kind, 'findError');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('findError не раскрывает station_id и проверяет физическое нарушение на сервере', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachFindError(service, 'student-6');
    const task = reached.task;
    assert.equal(task.definitionId, 'find_error_td_gt_t_001');
    assert.equal(task.response.kind, 'findError');
    assert.equal((task.payload?.stations as unknown[]).length, 8);
    assert.equal(JSON.stringify(task).includes('expectedStationId'), false);
    assert.equal(JSON.stringify(task).includes('"value":"qc_f"'), false);

    const wrong = await service.submitAnswer('student-6', reached.shiftId, task.instanceId, { stationId: 'qc_a' });
    assert.equal(wrong.feedback.correct, false);
    assert.equal(wrong.feedback.correctAnswer, 'Е');
    assert.deepEqual(wrong.feedback.details, { selectedStationId: 'qc_a', expectedStationId: 'qc_f' });
    assert.equal(wrong.completed, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
