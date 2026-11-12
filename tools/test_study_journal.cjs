/* Actual journal component: saved counters, request failure, session isolation. */
'use strict';
const assert = require('node:assert/strict');
const { load, Runner, deferred, flush, nodes, text } = require('./ui_test_harness.cjs');
let token = 'session-a';
const calls = [], timers = new Map(); let nextTimer = 0;
const { StudyJournal } = load('apps/web/src/features/hub/StudyJournal.tsx', {
  '../../api': { getSessionToken: () => token, api: { equipment(signal) {
    const pending = deferred(); calls.push({ ...pending, signal }); return pending.promise;
  } } },
}, { AbortController, window: { setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: id => timers.delete(id) } });
const profile = id => ({ id, displayName: id });
const result = (completedShifts, unassistedCorrect, practiceDays) => ({ stats: { completedShifts, unassistedCorrect, practiceDays }, catalog: [] });
const counters = runner => nodes(runner.output).filter(node => node.type === 'dd').map(node => Number(text(node)));
(async () => {
  const guest = new Runner(StudyJournal, { user: null });
  assert.equal(calls.length, 0, 'Guests do not fetch private progress');
  assert.match(text(guest.output), /Войдите в профиль/); guest.unmount();
  const journal = new Runner(StudyJournal, { user: profile('a') });
  assert.match(text(journal.output), /Открываем журнал/);
  calls[0].resolve(result(7, 24, 3)); await flush(journal);
  assert.deepEqual(counters(journal), [7, 24, 3], 'Only returned server counters are displayed');
  token = 'session-b'; journal.render({ user: profile('b') });
  assert.deepEqual(counters(journal), [], 'Switching profiles clears previous progress');
  calls[1].reject(new Error('Offline')); await flush(journal);
  assert.match(text(journal.output), /Не удалось открыть журнал/);
  assert.deepEqual(counters(journal), [], 'A failed request is not presented as zero progress');
  const retry = nodes(journal.output).find(node => node.type === 'button' && text(node) === 'Повторить загрузку');
  retry.props.onClick(); journal.render();
  assert.match(text(journal.output), /Открываем журнал/);
  calls[2].resolve(result(0, 0, 0)); await flush(journal);
  assert.deepEqual(counters(journal), [0, 0, 0]);
  assert.match(text(journal.output), /Начните первую смену/);
  token = 'session-c'; journal.render({ user: profile('c') });
  const departing = calls.at(-1); journal.unmount(); token = null;
  assert.equal(departing.signal.aborted, true);
  departing.resolve(result(99, 99, 99)); await flush(journal);
  assert.equal(journal.lateWrites, 0, 'A stale response cannot update a closed journal');
  assert.equal(timers.size, 0, 'All request timeout handles released');
  console.log('PASS journal: real counters, guest boundary, profile switch, offline/retry, empty state and stale response cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
