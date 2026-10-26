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
  const result = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, {
    placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' },
  });
  return { shiftId: reached.shiftId, task: result.nextTask! };
}

async function reachEightBoard(service: ShiftService, userId: string) {
  const reached = await reachThreeBoard(service, userId);
  const result = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, {
    placements: { a_t: 'a_nw', a_td: 'a_sw', b_t: 'b_nw', b_td: 'b_sw', c_t: 'c_nw', c_td: 'c_sw' },
  });
  return { shiftId: reached.shiftId, task: result.nextTask! };
}

async function reachFindError(service: ShiftService, userId: string) {
  const reached = await reachEightBoard(service, userId);
  const result = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, {
    placements: {
      a8_t: 'a8_nw', a8_td: 'a8_sw', b8_t: 'b8_nw', b8_td: 'b8_sw',
      c8_t: 'c8_nw', c8_td: 'c8_sw', d8_t: 'd8_nw', d8_td: 'd8_sw',
      e8_t: 'e8_nw', e8_td: 'e8_sw', f8_t: 'f8_nw', f8_td: 'f8_sw',
      g8_t: 'g8_nw', g8_td: 'g8_sw', h8_t: 'h8_nw', h8_td: 'h8_sw',
    },
  });
  return { shiftId: reached.shiftId, task: result.nextTask! };
}

async function reachPrimaryAnalysis(service: ShiftService, userId: string) {
  const reached = await reachFindError(service, userId);
  const result = await service.submitAnswer(userId, reached.shiftId, reached.task.instanceId, { stationId: 'qc_f' });
  return { shiftId: reached.shiftId, task: result.nextTask! };
}

test('stationPlot переводит к планшону на три станции', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const { shiftId, task } = await reachStationPlot(service, 'student-3');
    assert.equal(task.type, 'stationPlot');
    assert.equal(JSON.stringify(task).includes('"obs_t":"slot_01"'), false);
    const result = await service.submitAnswer('student-3', shiftId, task.instanceId, { placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' } });
    assert.equal(result.nextTask?.definitionId, 'station_board_three_001');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('трёхстанционный планшон переводит к плотному планшону', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachThreeBoard(service, 'student-4');
    assert.equal((reached.task.payload?.stations as unknown[]).length, 3);
    const result = await service.submitAnswer('student-4', reached.shiftId, reached.task.instanceId, { placements: { a_t: 'a_nw', a_td: 'a_sw', b_t: 'b_nw', b_td: 'b_sw', c_t: 'c_nw', c_td: 'c_sw' } });
    assert.equal(result.nextTask?.definitionId, 'station_board_eight_001');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('плотный планшон ведёт к физическому контролю', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachEightBoard(service, 'student-5');
    assert.equal((reached.task.payload?.stations as unknown[]).length, 8);
    const result = await service.submitAnswer('student-5', reached.shiftId, reached.task.instanceId, {
      placements: {
        a8_t: 'a8_nw', a8_td: 'a8_sw', b8_t: 'b8_nw', b8_td: 'b8_sw', c8_t: 'c8_nw', c8_td: 'c8_sw', d8_t: 'd8_nw', d8_td: 'd8_sw',
        e8_t: 'e8_nw', e8_td: 'e8_sw', f8_t: 'f8_nw', f8_td: 'f8_sw', g8_t: 'g8_nw', g8_td: 'g8_sw', h8_t: 'h8_nw', h8_td: 'h8_sw',
      },
    });
    assert.equal(result.nextTask?.definitionId, 'find_error_td_gt_t_001');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('findError не раскрывает station_id и после ответа ведёт к конструктору анализа', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachFindError(service, 'student-6');
    assert.equal(JSON.stringify(reached.task).includes('expectedStationId'), false);
    const result = await service.submitAnswer('student-6', reached.shiftId, reached.task.instanceId, { stationId: 'qc_a' });
    assert.equal(result.feedback.correct, false);
    assert.equal(result.feedback.correctAnswer, 'Е');
    assert.equal(result.completed, false);
    assert.equal(result.nextTask?.definitionId, 'primary_analysis_dependencies_001');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('dependencySequence формируется из методического профиля, скрывает DAG и принимает допустимый порядок', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-shift-'));
  try {
    const service = new ShiftService({ contentRoot: resolve(process.cwd(), '../../content'), attemptLogPath: join(directory, 'attempts.jsonl') });
    await service.init();
    const reached = await reachPrimaryAnalysis(service, 'student-7');
    const task = reached.task;
    assert.equal(task.definitionId, 'primary_analysis_dependencies_001');
    assert.equal(task.response.kind, 'dependencySequence');
    assert.equal(JSON.stringify(task).includes('dependencies'), false);
    const steps = task.payload?.steps as Array<{ id: number; label: string }>;
    assert.equal(steps.length, 8);

    const labels = [
      'Провести критику и физический контроль исходных наблюдений',
      'Сопоставить текущий срок с предыдущим сроком и историей процесса',
      'Проанализировать поле давления и провести изобары',
      'Выделить центры В/Н и основные барические образования',
      'Проанализировать барическую тенденцию и области П/Р',
      'Проанализировать явления погоды, облачность и другие признаки воздушных масс',
      'Выполнить комплексный фронтологический анализ по совокупности признаков',
      'Проверить согласованность итогового анализа с полями и предыдущим сроком',
    ];
    const order = labels.map((label) => steps.find((step) => step.label === label)!.id);
    const result = await service.submitAnswer('student-7', reached.shiftId, task.instanceId, { order });
    assert.equal(result.feedback.correct, true);
    assert.equal(result.completed, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
