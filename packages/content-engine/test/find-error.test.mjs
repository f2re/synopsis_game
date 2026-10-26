import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicTaskSafe, createTaskInstance, validateTaskAnswer } from '../src/index.js';

const definition = {
  id: 'fe1',
  type: 'findError',
  question: 'Найдите ошибочную станцию',
  payload: {
    rule: 'Td не может превышать T',
    stations: [
      { id: 's1', name: 'А', x: 200, y: 300 },
      { id: 's2', name: 'Б', x: 500, y: 300 },
      { id: 's3', name: 'В', x: 800, y: 300 },
    ],
    observations: [
      { id: 's1_t', stationId: 's1', field: 'T', display: '8,0', numericValue: 8.0 },
      { id: 's1_td', stationId: 's1', field: 'Td', display: '5,0', numericValue: 5.0 },
      { id: 's2_t', stationId: 's2', field: 'T', display: '4,0', numericValue: 4.0 },
      { id: 's2_td', stationId: 's2', field: 'Td', display: '9,0', numericValue: 9.0 },
      { id: 's3_t', stationId: 's3', field: 'T', display: '1,0', numericValue: 1.0 },
      { id: 's3_td', stationId: 's3', field: 'Td', display: '-2,0', numericValue: -2.0 },
    ],
  },
  answer: { kind: 'station_id', value: 's2' },
};

test('findError не раскрывает скрытый id ответа', () => {
  const built = createTaskInstance(definition, { seed: 1, instanceId: 'i1', contentPack: 'p@1' });
  assert.equal(built.publicTask.response.kind, 'findError');
  assert.equal(assertPublicTaskSafe(built.publicTask), true);
  assert.equal('answer' in built.publicTask, false);
  assert.equal(JSON.stringify(built.publicTask).includes('correctStationId'), false);
  assert.equal(JSON.stringify(built.publicTask).includes('expectedStationId'), false);
});

test('findError проверяет выбранную станцию только на серверной стороне', () => {
  const built = createTaskInstance(definition, { seed: 1, instanceId: 'i1', contentPack: 'p@1' });
  const wrong = validateTaskAnswer(definition, built.validationContext, { stationId: 's1' });
  assert.equal(wrong.correct, false);
  assert.equal(wrong.correctAnswer, 'Б');
  assert.equal(wrong.details.expectedStationId, 's2');
  const correct = validateTaskAnswer(definition, built.validationContext, { stationId: 's2' });
  assert.equal(correct.correct, true);
});
