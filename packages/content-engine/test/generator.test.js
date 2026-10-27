import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKn01Task, EDGE_CASES } from '../src/generator/kn01.js';

test('Детерминизм генератора: одинаковый сид порождает строго идентичное задание', () => {
  const seeds = [42, 100500, 26063, 777, 9999];

  for (const seed of seeds) {
    const taskA = generateKn01Task({ seed });
    const taskB = generateKn01Task({ seed });
    assert.deepEqual(taskA, taskB, `Задания для сида ${seed} должны быть строго идентичны`);
  }
});

test('Разные сиды порождают различные задания', () => {
  const task1 = generateKn01Task({ seed: 101 });
  const task2 = generateKn01Task({ seed: 202 });
  assert.notEqual(task1.id, task2.id);
});

test('Каждый неверный вариант несёт код причины из таксономии W1-02', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const task = generateKn01Task({ seed });

    if (task.type === 'findError') {
      assert.ok(task.choices.length >= 2);
      for (const choice of task.choices) {
        assert.ok(typeof choice.reasonCode === 'string' && choice.reasonCode.length > 0);
      }
    } else if (task.distractors) {
      assert.ok(task.distractors.length >= 1);
      for (const distractor of task.distractors) {
        assert.ok(
          typeof distractor.reasonCode === 'string' && distractor.reasonCode.length > 0,
          `Дистрактор ${JSON.stringify(distractor)} в задании ${task.id} обязан иметь reasonCode`
        );
      }
    }
  }
});

test('Ни один неверный вариант не совпадает с эталонным ответом', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const task = generateKn01Task({ seed });

    if (task.type === 'findError') {
      const wrongChoices = task.choices.filter((_, idx) => idx !== task.correctIndex);
      for (const wrong of wrongChoices) {
        assert.notEqual(wrong.text, task.correctGroup);
      }
    } else if (task.distractors) {
      for (const distractor of task.distractors) {
        assert.notEqual(
          distractor.value,
          task.target,
          `Неверный вариант ${distractor.value} совпал с эталоном ${task.target} в задании ${task.id}`
        );
      }
    }
  }
});

test('Все 15 обязательных граничных случаев W1-01 встречаются в 1000 сгенерированных экземплярах', () => {
  const observedEdgeCases = new Set();
  const totalGenerations = 1000;

  for (let seed = 1; seed <= totalGenerations; seed++) {
    const task = generateKn01Task({ seed });
    if (task.edgeCaseId) {
      observedEdgeCases.add(task.edgeCaseId);
    }
  }

  const expectedEdgeCases = EDGE_CASES.map((ec) => ec.id);
  assert.equal(expectedEdgeCases.length, 15);

  for (const expectedId of expectedEdgeCases) {
    assert.ok(
      observedEdgeCases.has(expectedId),
      `Граничный случай ${expectedId} обязан встретиться среди ${totalGenerations} сгенерированных заданий`
    );
  }

  assert.equal(observedEdgeCases.size, 15);
});
