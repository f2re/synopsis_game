import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicTaskSafe, createTaskInstance, validateTaskAnswer } from '../src/index.js';

const definition = {
  id: 'dep1',
  type: 'dependencySequence',
  question: 'Соберите порядок',
  steps: ['Контроль данных', 'Изобары', 'Тенденция', 'Явления', 'Фронтология', 'Итоговая проверка'],
  dependencies: [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [2, 4], [3, 4],
    [4, 5],
  ],
};

function publicOrderForCanonical(built, canonicalOrder) {
  return canonicalOrder.map((canonical) => built.validationContext.canonicalByPublic.indexOf(canonical));
}

test('dependencySequence принимает несколько топологических порядков', () => {
  const built = createTaskInstance(definition, { seed: 17, instanceId: 'i1', contentPack: 'p@1' });
  assert.equal(built.publicTask.response.kind, 'dependencySequence');
  assert.equal(assertPublicTaskSafe(built.publicTask), true);
  assert.equal(JSON.stringify(built.publicTask).includes('dependencies'), false);

  const first = validateTaskAnswer(definition, built.validationContext, {
    order: publicOrderForCanonical(built, [0, 1, 2, 3, 4, 5]),
  });
  const second = validateTaskAnswer(definition, built.validationContext, {
    order: publicOrderForCanonical(built, [0, 3, 2, 1, 4, 5]),
  });
  assert.equal(first.correct, true);
  assert.equal(second.correct, true);
});

test('dependencySequence возвращает нарушенные зависимости только после ответа', () => {
  const built = createTaskInstance(definition, { seed: 9, instanceId: 'i2', contentPack: 'p@1' });
  const result = validateTaskAnswer(definition, built.validationContext, {
    order: publicOrderForCanonical(built, [1, 0, 2, 3, 4, 5]),
  });
  assert.equal(result.correct, false);
  assert.deepEqual(result.details.violations, [
    { before: 'Контроль данных', after: 'Изобары' },
  ]);
  assert.equal(result.details.multipleOrdersAllowed, true);
});

test('dependencySequence отклоняет циклический граф', () => {
  assert.throws(() => createTaskInstance({
    ...definition,
    id: 'cycle',
    dependencies: [[0, 1], [1, 0]],
  }, { seed: 1, instanceId: 'i3', contentPack: 'p@1' }), /содержит цикл/);
});
