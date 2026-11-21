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
const failure = (status, code = status === 401 ? 'invalid_session' : 'forbidden', error = status === 401 ? 'Сессия недействительна или истекла' : 'Недостаточно прав') => ({ ok: false, status, json: async () => ({ error, code }) });

(async () => {
  for (const code of ['invalid_session', 'session_required']) {
    const count = events.length;
    client.setSessionToken(`current-test-session-${code}`);
    respond = async () => failure(401, code);
    await assert.rejects(client.api.levelOneLobby(), error => error.status === 401 && error.code === code);
    assert.equal(client.getSessionToken(), null);
    assert.equal(events.length, count + 1);
    assert.equal(events.at(-1).type, client.SESSION_EXPIRED_EVENT);
    assert.equal(events.at(-1).tokenAfterDispatch, null, 'Token is removed before notifying the app');
  }
  const expiryEventCount = events.length;

  client.setSessionToken('preserved-test-session');
  respond = async () => failure(403);
  await assert.rejects(client.api.levelOneLobby(), error => error.status === 403);
  assert.equal(client.getSessionToken(), 'preserved-test-session');
  assert.equal(events.length, expiryEventCount, 'A permission denial does not expire the session');

  respond = async (path, init) => {
    assert.equal(path, '/api/identity/set-code');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.get('authorization'), 'Bearer preserved-test-session');
    return failure(401, 'invalid_code', 'Неверный текущий код');
  };
  await assert.rejects(client.api.setCode('newTest123', 'wrongCode'), error => error.status === 401 && error.code === 'invalid_code' && error.message === 'Неверный текущий код');
  assert.equal(client.getSessionToken(), 'preserved-test-session', 'Wrong current code does not revoke a valid authenticated session');
  assert.equal(events.length, expiryEventCount, 'The code dialog keeps its owning session and can show the operation error');

  respond = async () => failure(401, '', 'Не удалось выполнить запрос');
  await assert.rejects(client.api.levelOneLobby(), error => error.status === 401);
  assert.equal(client.getSessionToken(), 'preserved-test-session', 'An unclassified 401 is not evidence that the session was rejected');
  assert.equal(events.length, expiryEventCount);

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
  assert.equal(events.length, expiryEventCount, 'A late rejection from the old account leaves the new session alone');

  respond = async () => failure(401, 'invalid_code', 'Неверный код входа');
  await assert.rejects(client.api.login('test-account', 'wrong-test-code'), error => error.status === 401);
  assert.equal(client.getSessionToken(), 'new-test-session');
  assert.equal(events.length, expiryEventCount, 'A rejected login is not a rejected authenticated request');
  await assert.rejects(client.api.adminLogin('wrong-admin-code'), error => error.status === 401);
  assert.equal(client.getSessionToken(), 'new-test-session');
  assert.equal(events.length, expiryEventCount, 'A rejected admin login does not revoke an unrelated session');

  client.setSessionToken(null);
  await assert.rejects(client.api.levelOneLobby(), error => error.code === 'session_required');
  assert.equal(events.length, expiryEventCount, 'Missing-token checks do not fabricate expiry events');
  console.log(JSON.stringify({ status: 'PASS', checks: 9, scope: 'Real api.ts: both actual session error codes, invalid current code, unclassified 401, permission 403, stale-account 401, rejected user/admin logins, missing token. No browser.' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
