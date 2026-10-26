import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicTaskSafe, createTaskInstance, validateTaskAnswer } from '../src/index.js';

test('публичное числовое задание не содержит эталонный ответ', () => {
  const definition = { id: 't1', type: 'decode', question: 'Температура?', payload: { encoded: '10234' }, answer: { kind: 'numeric', value: 23.4, unit: 'degC', tolerance: 0 } };
  const built = createTaskInstance(definition, { seed: 1, instanceId: 'i1', contentPack: 'p@1' });
  assert.equal(assertPublicTaskSafe(built.publicTask), true);
  assert.equal(JSON.stringify(built.publicTask).includes('23.4'), false);
  assert.equal(validateTaskAnswer(definition, built.validationContext, { value: 23.4 }).correct, true);
});

test('варианты ответа переставляются детерминированно и проверяются на серверной стороне', () => {
  const definition = { id: 'c1', type: 'choice', question: 'Выбор', payload: { options: ['A', 'B', 'C', 'D'] }, answer: { kind: 'choice_index', value: 2 } };
  const first = createTaskInstance(definition, { seed: 42, instanceId: 'i1', contentPack: 'p@1' });
  const second = createTaskInstance(definition, { seed: 42, instanceId: 'i2', contentPack: 'p@1' });
  assert.deepEqual(first.publicTask.payload.options.map((item) => item.label), second.publicTask.payload.options.map((item) => item.label));
  const correctPublic = first.validationContext.canonicalByPublic.indexOf(2);
  assert.equal(validateTaskAnswer(definition, first.validationContext, { choiceIndex: correctPublic }).correct, true);
});

test('последовательность проверяется через скрытое соответствие после перемешивания', () => {
  const definition = { id: 's1', type: 'sequence', question: 'Порядок', steps: ['A', 'B', 'C'], correct_order: [0, 1, 2] };
  const built = createTaskInstance(definition, { seed: 7, instanceId: 'i1', contentPack: 'p@1' });
  const order = [0, 1, 2].map((canonical) => built.validationContext.canonicalByPublic.indexOf(canonical));
  assert.equal(validateTaskAnswer(definition, built.validationContext, { order }).correct, true);
  assert.equal(assertPublicTaskSafe(built.publicTask), true);
});
