'use strict';
// Independent contract check: actual API client + isolated IdentityService fixture.
// This does not start HTTP, a browser, or load an existing identity store.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../../../..');
process.chdir(root);
const { load, deferred } = require(path.join(root, 'tools/ui_test_harness.cjs'));
const checks = [];
const check = async (name, operation) => {
  try { await operation(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL' }); throw error; }
};
const response = (status, payload) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
const errorResponse = (status, code) => response(status, { error: 'Fixture operation rejected', ...(code === undefined ? {} : { code }) });
const rejectsCode = (status, code) => error => error.status === status && error.code === code;

(async () => {
  const { IdentityService, IdentityError } = await import(pathToFileURL(path.join(root, 'apps/server/dist/modules/identity/identityService.js')));
  const temporaryRoot = path.resolve(root, '../test-tmp');
  await fs.mkdir(temporaryRoot, { recursive: true });
  const directory = await fs.mkdtemp(path.join(temporaryRoot, 'session-code-security-'));
  let status = 'FAIL';
  const sourcePaths = [
    'apps/web/src/api.ts',
    'apps/server/src/modules/identity/identityService.ts',
    'apps/server/dist/modules/identity/identityService.js',
    'apps/server/src/index.ts',
    'tools/test_session_recovery.cjs',
    'tools/ui_test_harness.cjs',
    'docs/testing/evidence/level-one/addendum/session-code-check.cjs',
  ];
  try {
    const service = new IdentityService({
      storePath: path.join(directory, 'fixture-identity.json'), securityProfile: 'trusted',
      avatarAssetsRoot: path.join(root, 'apps/web/public/assets/avatar/modular-r01'),
    });
    await service.init();
    await service.bootstrapAdmin('Fixture security administrator', 'oldFix123');
    const fixture = await service.adminLogin('oldFix123', 'fixture-only');
    const storage = new Map();
    const events = [];
    let respond;
    const client = load('apps/web/src/api.ts', {}, {
      Headers, Event,
      sessionStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key),
      },
      window: { dispatchEvent: event => {
        events.push({ type: event.type, tokenAlreadyCleared: client.getSessionToken() === null, hasDetail: 'detail' in event });
        return true;
      } },
      fetch: (...args) => respond(...args),
    });
    const serviceAdapter = async (url, init) => {
      const authorization = init.headers.get('authorization');
      assert.ok(authorization?.startsWith('Bearer '));
      const token = authorization.slice('Bearer '.length);
      try {
        if (url === '/api/identity/set-code' && init.method === 'POST') {
          const body = JSON.parse(init.body);
          return response(200, { user: await service.setUserCode(token, body.newCode, body.currentCode) });
        }
        if (url === '/api/identity/me') return response(200, { user: service.me(token) });
        throw new Error('Unexpected fixture service operation');
      } catch (error) {
        if (!(error instanceof IdentityError)) throw error;
        return response(error.status, { error: error.message, code: error.code });
      }
    };
    respond = serviceAdapter;
    client.setSessionToken(fixture.token);

    await check('Actual invalid current code returns invalid_code and keeps both client and server session valid', async () => {
      await assert.rejects(client.api.setCode('newFix456', 'wrongFix789'), rejectsCode(401, 'invalid_code'));
      assert.equal(client.getSessionToken(), fixture.token);
      assert.equal(events.length, 0);
      assert.equal((await client.api.me()).id, fixture.user.id);
      const unchangedCode = await service.adminLogin('oldFix123', 'fixture-confirm-only');
      assert.equal(unchangedCode.user.id, fixture.user.id);
      service.logout(unchangedCode.token);
    });
    await check('A correct retry after invalid_code uses the same valid session', async () => {
      const updated = await client.api.setCode('newFix456', 'oldFix123');
      assert.equal(updated.id, fixture.user.id);
      assert.equal(client.getSessionToken(), fixture.token);
      assert.equal((await client.api.me()).id, fixture.user.id);
      assert.equal(events.length, 0);
    });
    await check('Actual revoked fixture session returns invalid_session and clears the matching client session', async () => {
      service.logout(fixture.token);
      await assert.rejects(client.api.me(), rejectsCode(401, 'invalid_session'));
      assert.equal(client.getSessionToken(), null);
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { type: client.SESSION_EXPIRED_EVENT, tokenAlreadyCleared: true, hasDetail: false });
    });
    await check('Both server session error codes expire a matching authenticated request', async () => {
      for (const code of ['invalid_session', 'session_required']) {
        const before = events.length;
        client.setSessionToken(`fixture-current-${code}`);
        respond = async () => errorResponse(401, code);
        await assert.rejects(client.api.me(), rejectsCode(401, code));
        assert.equal(client.getSessionToken(), null);
        assert.equal(events.length, before + 1);
        assert.deepEqual(events.at(-1), { type: client.SESSION_EXPIRED_EVENT, tokenAlreadyCleared: true, hasDetail: false });
      }
    });
    await check('Neither session code on a delayed old request can close the replacement session', async () => {
      for (const code of ['invalid_session', 'session_required']) {
        const before = events.length;
        const late = deferred();
        client.setSessionToken('fixture-departing');
        respond = (_url, init) => {
          assert.equal(init.headers.get('authorization'), 'Bearer fixture-departing');
          return late.promise;
        };
        const pending = client.api.me();
        client.setSessionToken('fixture-replacement');
        late.resolve(errorResponse(401, code));
        await assert.rejects(pending, rejectsCode(401, code));
        assert.equal(client.getSessionToken(), 'fixture-replacement');
        assert.equal(events.length, before);
      }
    });
    await check('Replacement during asynchronous JSON decoding is also protected from a stale 401', async () => {
      const before = events.length;
      const decoded = deferred();
      const enteredDecode = deferred();
      client.setSessionToken('fixture-before-decode');
      respond = async () => ({ ok: false, status: 401, json: () => { enteredDecode.resolve(); return decoded.promise; } });
      const pending = client.api.me();
      await enteredDecode.promise;
      client.setSessionToken('fixture-after-decode');
      decoded.resolve({ error: 'Fixture rejected', code: 'invalid_session' });
      await assert.rejects(pending, rejectsCode(401, 'invalid_session'));
      assert.equal(client.getSessionToken(), 'fixture-after-decode');
      assert.equal(events.length, before);
    });
    await check('An unknown or missing 401 error code remains an operation error', async () => {
      for (const code of [undefined, 'session_expired', 'operation_failed']) {
        const before = events.length;
        client.setSessionToken('fixture-retained');
        respond = async () => errorResponse(401, code);
        await assert.rejects(client.api.me(), error => error.status === 401);
        assert.equal(client.getSessionToken(), 'fixture-retained');
        assert.equal(events.length, before);
      }
    });
    await check('A 403 does not expire the client even if its payload contains a session error code', async () => {
      for (const code of ['forbidden', 'invalid_session']) {
        const before = events.length;
        client.setSessionToken('fixture-permission');
        respond = async () => errorResponse(403, code);
        await assert.rejects(client.api.me(), rejectsCode(403, code));
        assert.equal(client.getSessionToken(), 'fixture-permission');
        assert.equal(events.length, before);
      }
    });
    await check('Rejected user and admin logins preserve an already active client session', async () => {
      const before = events.length;
      client.setSessionToken('fixture-login-preserved');
      respond = async (_url, init) => {
        assert.equal(init.headers.has('authorization'), false);
        return errorResponse(401, 'invalid_code');
      };
      await assert.rejects(client.api.login('fixture-user', 'fixture-wrong'), rejectsCode(401, 'invalid_code'));
      await assert.rejects(client.api.adminLogin('fixture-wrong'), rejectsCode(401, 'invalid_code'));
      assert.equal(client.getSessionToken(), 'fixture-login-preserved');
      assert.equal(events.length, before);
    });
    await check('No token fails before transport and does not invent a session-expired event', async () => {
      const before = events.length;
      client.setSessionToken(null);
      let calls = 0;
      respond = async () => { calls++; return errorResponse(401, 'session_required'); };
      await assert.rejects(client.api.me(), rejectsCode(401, 'session_required'));
      assert.equal(calls, 0);
      assert.equal(events.length, before);
    });
    status = 'PASS';
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
    const sha256 = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex')])));
    const report = {
      task: 'LEVEL-ONE-PLAYABLE', reviewer: '/root/level_security_review', status,
      checkedAt: new Date().toISOString(),
      localHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      scope: 'Narrow follow-up: session expiry codes versus invalid current code; no change to the original security report.',
      checks, sha256,
      fixture: { freshStore: true, actualIdentityService: true, actualApiClient: true, removedAfterRun: true, existingAccountsRead: false, credentialsRecorded: false },
      limitations: ['No browser, DOM, HTTP listener, or real network.', 'Service responses are adapted in process; this is not execution of the HTTP router.', 'Remote CI conclusions are reviewed separately by playability_review.'],
    };
    await fs.writeFile(path.join(__dirname, 'session-code-review.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status, checks }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
