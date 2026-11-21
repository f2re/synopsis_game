'use strict';
// Executes the real API client. Network replies are bounded doubles; no browser acceptance.
const assert = require('node:assert/strict');
const { load, deferred } = require('./ui_test_harness.cjs');
const data = new Map();
const events = [];
let respond;
const sessionStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
const client = load('apps/web/src/api.ts', {}, {
  Headers, Event, sessionStorage,
  window: { dispatchEvent: event => { events.push({ type: event.type, tokenAfterDispatch: client.getSessionToken() }); return true; } },
  fetch: (...args) => respond(...args),
});
const failure = status => ({ ok: false, status, json: async () => ({ error: status === 401 ? 'Сессия истекла' : 'Недостаточно прав', code: status === 401 ? 'session_expired' : 'forbidden' }) });

(async () => {
  client.setSessionToken('current-test-session');
  respond = async () => failure(401);
  await assert.rejects(client.api.levelOneLobby(), error => error.status === 401);
  assert.equal(client.getSessionToken(), null);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, client.SESSION_EXPIRED_EVENT);
  assert.equal(events[0].tokenAfterDispatch, null, 'Token is removed before notifying the app');

  client.setSessionToken('preserved-test-session');
  respond = async () => failure(403);
  await assert.rejects(client.api.levelOneLobby(), error => error.status === 403);
  assert.equal(client.getSessionToken(), 'preserved-test-session');
  assert.equal(events.length, 1, 'A permission denial does not expire the session');

  const late = deferred();
  respond = (path, init) => {
    assert.equal(init.headers.get('authorization'), 'Bearer old-test-session');
    return late.promise;
  };
  client.setSessionToken('old-test-session');
  const pending = client.api.levelOneLobby();
  client.setSessionToken('new-test-session');
  late.resolve(failure(401));
  await assert.rejects(pending, error => error.status === 401);
  assert.equal(client.getSessionToken(), 'new-test-session');
  assert.equal(events.length, 1, 'A late rejection from the old account leaves the new session alone');

  respond = async () => failure(401);
  await assert.rejects(client.api.login('test-account', 'wrong-test-code'), error => error.status === 401);
  assert.equal(client.getSessionToken(), 'new-test-session');
  assert.equal(events.length, 1, 'A rejected login is not a rejected authenticated request');

  client.setSessionToken(null);
  await assert.rejects(client.api.levelOneLobby(), error => error.code === 'session_required');
  assert.equal(events.length, 1, 'Missing-token checks do not fabricate expiry events');
  console.log(JSON.stringify({ status: 'PASS', checks: 5, scope: 'Real api.ts: current 401, permission 403, stale-account 401, rejected login, missing token. No browser.' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
