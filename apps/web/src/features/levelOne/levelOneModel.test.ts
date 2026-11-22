import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLevelOneDraft, clearLevelOneStartKey, levelOneAnswer, levelOneNumber, levelOneStartKey, readLevelOneDraft, reviewedLevelOneAnswer, saveLevelOneDraft, toggleLevelOneSign } from './levelOneModel.ts';
import type { LevelOneReview, ShiftTask } from '../../api.ts';

function memoryStore() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, values };
}
const numeric: ShiftTask = { instanceId: 'first:4', definitionId: 'temperature', contentPack: 'accepted', type: 'decode', difficulty: 1, question: 'Учебный пример', response: { kind: 'numeric', unit: 'degC' } };
const choice: ShiftTask = { ...numeric, instanceId: 'first:2', response: { kind: 'choice' }, payload: { options: [{ id: 3, label: 'Первый видимый' }, { id: 1, label: 'Второй видимый' }] } };

test('decimal entry accepts comma, dot and an accessible minus without accepting JavaScript literals', () => {
  for (const [input, expected] of [['23,4', 23.4], ['−0,8', -0.8], ['-12.8', -12.8], ['0', 0], [' +0.1 ', 0.1], [',8', 0.8]] as const) assert.equal(levelOneNumber(input), expected);
  for (const input of ['', ' ', '-', '.', ',', 'NaN', 'Infinity', '0x10', '2e3', '1,2,3', '1 234', '23°C']) assert.equal(levelOneNumber(input), null, input);
});

test('sign control works before and after entering a value', () => {
  assert.equal(toggleLevelOneSign(''), '-');
  assert.equal(toggleLevelOneSign('0,8'), '-0,8');
  assert.equal(toggleLevelOneSign('−0,8'), '0,8');
  assert.equal(toggleLevelOneSign('+12.8'), '-12.8');
  assert.equal(toggleLevelOneSign('-'), '');
});

test('answers use the actual option id and reject choices outside the current task', () => {
  assert.deepEqual(levelOneAnswer(choice, { numeric: '', choiceIndex: 3 }), { choiceIndex: 3 });
  assert.equal(levelOneAnswer(choice, { numeric: '', choiceIndex: 0 }), null);
  assert.equal(levelOneAnswer(choice, { numeric: '', choiceIndex: null }), null);
  assert.deepEqual(levelOneAnswer(numeric, { numeric: '−0,8', choiceIndex: null }), { value: -0.8 });
  assert.equal(levelOneAnswer({ ...numeric, response: { kind: 'unknown' } }, { numeric: '1', choiceIndex: null }), null);
});

test('drafts belong to the account, server session and exact task instance', () => {
  const store = memoryStore();
  saveLevelOneDraft(store, 'alice', 'run1', numeric, { numeric: '-0,8', choiceIndex: null });
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', numeric).numeric, '-0,8');
  assert.equal(readLevelOneDraft(store, 'bob', 'run1', numeric).numeric, '');
  assert.equal(readLevelOneDraft(store, 'alice', 'run2', numeric).numeric, '');
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', { ...numeric, instanceId: 'next' }).numeric, '');
  clearLevelOneDraft(store, 'alice', 'run1', numeric.instanceId);
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', numeric).numeric, '');
});

test('corrupt and mismatched drafts cannot select an answer for another task', () => {
  const store = memoryStore();
  saveLevelOneDraft(store, 'alice', 'run1', choice, { numeric: '', choiceIndex: 3 });
  const key = [...store.values.keys()][0];
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', choice).choiceIndex, 3);
  store.values.set(key, '{broken');
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', choice).choiceIndex, null);
  store.values.set(key, JSON.stringify({ userId: 'bob', sessionId: 'run1', instanceId: choice.instanceId, numeric: '25', choiceIndex: 1 }));
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', choice).choiceIndex, null);
});

test('retries reuse a scoped start key and an explicit new run gets a new one', () => {
  const store = memoryStore();
  let generated = 0;
  const generate = () => `level-start-key-${++generated}`;
  const first = levelOneStartKey(store, 'alice', generate);
  assert.equal(levelOneStartKey(store, 'alice', generate), first);
  assert.notEqual(levelOneStartKey(store, 'bob', generate), first);
  clearLevelOneStartKey(store, 'alice');
  assert.notEqual(levelOneStartKey(store, 'alice', generate), first);
  assert.equal(generated, 3);
});

test('disabled local storage cannot prevent entering or submitting the level', () => {
  const store = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); }, removeItem: () => { throw Error('blocked'); } };
  assert.equal(levelOneStartKey(store, 'alice', () => 'valid-key-12345678'), 'valid-key-12345678');
  assert.doesNotThrow(() => saveLevelOneDraft(store, 'alice', 'run1', numeric, { numeric: '1', choiceIndex: null }));
  assert.equal(readLevelOneDraft(store, 'alice', 'run1', numeric).numeric, '');
  assert.doesNotThrow(() => clearLevelOneDraft(store, 'alice', 'run1', numeric.instanceId));
});

test('response recovery uses the durable entry for the submitted instance', () => {
  const first: LevelOneReview = { instanceId: 'first', definitionId: 'a', question: 'Первое', answer: { value: 1 }, correct: false, assisted: false, correctAnswer: 2, explanation: 'Разбор', sources: [] };
  const next = { ...first, instanceId: 'next', correct: true };
  assert.equal(reviewedLevelOneAnswer([first, next], 'first'), first);
  assert.equal(reviewedLevelOneAnswer([first, next], 'missing'), null);
});
