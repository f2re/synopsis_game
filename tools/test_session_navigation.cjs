'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../apps/web/node_modules/typescript');
function runtime(blocked = false) {
  const stored = new Map(), calls = [];
  const exports = {};
  const storage = {
    getItem(key) { if (blocked) throw new Error('Storage denied'); return stored.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage denied'); stored.set(key, value); },
    removeItem(key) { if (blocked) throw new Error('Storage denied'); stored.delete(key); },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/src/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, sessionStorage: storage, Headers,
    fetch(url, init) { return new Promise((resolve, reject) => calls.push({ url, init, reject, finish(payload, status = 200) { resolve({ ok: status < 400, status, json: async () => payload }); } })); },
  });
  return { ...exports, calls };
}
(async () => {
  const r = runtime();
  const pending = r.api.login('test-observer', 'test-code');
  const rejected = assert.rejects(pending, error => error.code === 'login_cancelled');
  r.cancelPendingLogin();
  await r.api.logout();
  r.calls[0].finish({ token: 'late-test-session', user: { id: 'test-observer' } });
  await rejected;
  assert.equal(r.getSessionToken(), null, 'A late login cannot resurrect a session');
  assert.equal(r.calls[1].url, '/api/identity/logout', 'Stale server session is revoked');
  r.calls[1].finish({ ok: true });
  const admin = r.api.adminLogin('test-code');
  const adminRejected = assert.rejects(admin, error => error.code === 'login_cancelled');
  r.cancelPendingLogin(); r.calls[2].finish({ token: 'late-admin-session', user: { id: 'test-admin' } });
  await adminRejected; r.calls[3].finish({ ok: true });
  assert.equal(r.getSessionToken(), null);
  r.setSessionToken('departing-test-session');
  const exit = r.api.logout();
  assert.equal(r.getSessionToken(), null, 'Exit clears the local session before a slow network reply');
  assert.equal(r.calls[4].init.headers.get('authorization'), 'Bearer departing-test-session');
  const fresh = r.api.login('second-observer', 'test-code');
  r.calls[5].finish({ token: 'fresh-test-session', user: { id: 'second-observer' } }); await fresh;
  r.calls[4].finish({ ok: true }); await exit;
  assert.equal(r.getSessionToken(), 'fresh-test-session', 'Old revocation never removes a newer login');
  const failing = r.api.logout(); const failed = assert.rejects(failing);
  r.calls[6].reject(new Error('Offline')); await failed;
  assert.equal(r.getSessionToken(), null, 'Network failure cannot preserve a local login');
  const b = runtime(true);
  assert.equal(b.getSessionToken(), null);
  const memoryLogin = b.api.login('test-observer', 'test-code');
  b.calls[0].finish({ token: 'memory-only-session', user: { id: 'test-observer' } }); await memoryLogin;
  assert.equal(b.getSessionToken(), 'memory-only-session');
  const memoryExit = b.api.logout(); b.calls[1].finish({ ok: true }); await memoryExit;
  assert.equal(b.getSessionToken(), null, 'Blocked sessionStorage still permits a complete exit');
  const nav = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/src/appNavigation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: nav });
  for (const unsafe of ['https://example.com', '//example.com', '/shift', '/admin', '/exit', null, {}, '/library/../../admin']) assert.equal(nav.safeReturnPath(unsafe), '/');
  assert.equal(nav.safeReturnPath('/library?q=Td'), '/library?q=Td');
  assert.equal(nav.safeReturnPath('/archive'), '/archive'); assert.equal(nav.screenSurface('/archive'), 'library');
  assert.equal(nav.screenSurface('/exit'), 'silent'); assert.equal(nav.screenSurface('/shift'), 'study');
  console.log('PASS: stale user/admin login cancellation and revocation; immediate local exit; delayed logout vs new login; offline exit; blocked sessionStorage; safe return routes; study/exit audio surfaces.');
})().catch(error => { console.error(error); process.exitCode = 1; });
