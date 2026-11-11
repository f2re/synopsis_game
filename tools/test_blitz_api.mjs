import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Independent HTTP gate. Uses only the repository's public example roster;
// never an existing account, external server or production data store.
const repo = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'synopsis-blitz-http-'));
const fixture = JSON.parse(await readFile(join(repo, 'config/test-roster.example.json'), 'utf8'));
const listener = net.createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const port = listener.address().port;
await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
const base = `http://127.0.0.1:${port}`;
const checks = [];
let child;

async function start() {
  child = spawn(process.execPath, ['apps/server/dist/index.js'], { cwd: repo,
    env: { ...process.env, API_BIND: '127.0.0.1', API_PORT: String(port),
      SYNOPSIS_SECURITY_PROFILE: 'trusted', SYNOPSIS_BOOTSTRAP_ADMIN_CODE: '',
      SYNOPSIS_ENABLE_TEST_ROSTER: 'true', SYNOPSIS_TEST_ROSTER_FILE: join(repo, 'config/test-roster.example.json'),
      SYNOPSIS_IDENTITY_STORE: join(temp, 'identity.json'), SYNOPSIS_EQUIPMENT_STORE: join(temp, 'equipment.json'),
      SYNOPSIS_PROGRESSION_STORE: join(temp, 'progression.json'), SYNOPSIS_ATTEMPT_LOG: join(temp, 'attempts.jsonl'),
      SYNOPSIS_CONTENT_ROOT: join(repo, 'content') }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('API startup timeout')), 15000);
    child.stdout.on('data', bytes => { if (String(bytes).includes(base)) { clearTimeout(timer); resolve(); } });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`API exited ${code}`)); });
  });
}
async function stop() {
  if (child?.exitCode === null) { const done = once(child, 'exit'); child.kill('SIGTERM'); await done; }
}
async function request(route, method = 'GET', body, token) {
  const response = await fetch(base + route, { method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
async function ok(route, method = 'GET', body, token, expected = 200) {
  const result = await request(route, method, body, token);
  assert.equal(result.status, expected, `${route}: unexpected HTTP status ${result.status}`);
  return result.body;
}
async function login(index) {
  const roster = await ok(`/api/identity/roster?group=${encodeURIComponent(fixture.groups[0].groupId)}`);
  const selected = fixture.groups[0].users[index];
  const user = roster.users.find(entry => entry.displayName === selected.displayName);
  return ok('/api/identity/login', 'POST', { userId: user.id, code: selected.code });
}
function answerFor(task) {
  const payload = task.payload;
  if (task.response.kind === 'numeric') return { value: 0 };
  if (task.response.kind === 'choice') return { choiceIndex: payload.options[0].id };
  if (['sequence', 'dependencySequence'].includes(task.response.kind)) return { order: payload.steps.map(step => step.id) };
  if (task.response.kind === 'findError') return { stationId: payload.stations[0].id };
  return { placements: Object.fromEntries(payload.observations.map((observation, index) => [observation.id, payload.slots[index % payload.slots.length].id])) };
}
async function qualify(token) {
  const shift = await ok('/api/shifts', 'POST', {}, token, 201);
  let task = shift.task;
  while (task) {
    let result = await ok(`/api/tasks/${encodeURIComponent(task.instanceId)}/answer`, 'POST',
      { shiftId: shift.shiftId, answer: answerFor(task), attempt: 1 }, token);
    if (result.status === 'retry-offered') result = await ok(`/api/shifts/${shift.shiftId}/reveal`, 'POST', { instanceId: task.instanceId }, token);
    task = result.nextTask;
  }
}

try {
  await start();
  let first = await login(0), second = await login(1), token = first.token;
  for (const [route, method, body] of [
    ['/api/blitz-practice', 'GET'], ['/api/blitz-practice', 'POST', { requestId: 'independent-request-001' }],
    ['/api/blitz-practice/missing', 'GET'], ['/api/blitz-practice/missing/answer', 'POST', { instanceId: 'missing:1', answer: {} }],
  ]) assert.equal((await request(route, method, body)).status, 401);
  assert.equal((await request('/api/blitz-practice', 'POST', { requestId: 'independent-request-001' }, token)).status, 403);
  for (const body of [null, [], 12, 'invalid', {}, { requestId: '' }]) {
    assert.equal((await request('/api/blitz-practice', 'POST', body, token)).status, 400);
  }
  assert.equal((await ok('/api/blitz-practice', 'GET', undefined, token)).eligible, false);
  await qualify(token);
  const lobby = await ok('/api/blitz-practice', 'GET', undefined, token);
  assert.equal(lobby.eligible, true); assert.equal(lobby.contentStatus, 'draft');
  assert.equal(lobby.durationSeconds, 90); assert.equal(lobby.total, 6);
  checks.push('Authentication, malformed JSON, canonical completion gate, draft label and 90-second policy PASS');

  const outfit = { ...first.user.avatar, top: 'top.field-jacket', footwear: 'footwear.boots', heldItem: 'held.map-folder', companion: 'companion.tit' };
  await ok('/api/identity/avatar', 'PATCH', { avatar: outfit }, token);
  const before = await ok('/api/equipment', 'GET', undefined, token);
  const starts = await Promise.all(Array.from({ length: 5 }, (_, index) => ok('/api/blitz-practice', 'POST',
    { requestId: `independent-first-${index}`, deadlineAt: '2099-01-01T00:00:00.000Z', durationSeconds: 999999,
      mode: 'ranked', avatarSnapshot: first.user.avatar, equipment: { charges: { reference: 999, retry: 999 } } }, token, 201)));
  assert.equal(new Set(starts.map(session => session.id)).size, 1);
  let session = starts[0];
  assert.equal(Date.parse(session.deadlineAt) - Date.parse(session.startedAt), 90_000);
  assert.deepEqual(session.avatarSnapshot, outfit); assert.equal(Object.keys(session.avatarSnapshot).length, 11);
  assert.equal(session.mode, 'blitz-practice'); assert.equal(session.equipment.enabled, false);
  assert.deepEqual(session.equipment.charges, { reference: 0, retry: 0 });
  assert.equal(JSON.stringify(session.task).includes('correctAnswer'), false);
  assert.equal('answer' in session.task, false);
  await ok('/api/identity/avatar', 'PATCH', { avatar: first.user.avatar }, token);
  assert.deepEqual((await ok(`/api/blitz-practice/${session.id}`, 'GET', undefined, token)).avatarSnapshot, outfit);
  assert.equal((await request(`/api/blitz-practice/${session.id}`, 'GET', undefined, second.token)).status, 404);
  assert.equal((await request(`/api/blitz-practice/${session.id}/answer`, 'POST', { instanceId: session.task.instanceId, answer: {} }, second.token)).status, 404);
  for (const action of ['reference', 'reveal']) assert.equal((await request(`/api/shifts/${session.id}/${action}`, 'POST', { instanceId: session.task.instanceId }, token)).status, 409);
  for (const action of ['task', 'result']) assert.equal((await request(`/api/shifts/${session.id}/${action}`, 'GET', undefined, token)).status, 409);
  assert.equal((await request(`/api/tasks/${encodeURIComponent(session.task.instanceId)}/answer`, 'POST', { shiftId: session.id, answer: {}, attempt: 1 }, token)).status, 409);
  checks.push('Concurrent starts, forged clock/mode/equipment ignored, immutable eleven-field outfit, cross-account and legacy API guards PASS');

  const firstTask = session.task, firstAnswer = answerFor(firstTask);
  const answered = await Promise.all(Array.from({ length: 5 }, () => ok(`/api/blitz-practice/${session.id}/answer`, 'POST', { instanceId: firstTask.instanceId, answer: firstAnswer }, token)));
  assert(answered.every(result => result.accepted && result.session.progress.answered === 1));
  assert.equal((await request(`/api/blitz-practice/${session.id}/answer`, 'POST', { instanceId: firstTask.instanceId, answer: { value: 999 } }, token)).status, 409);
  session = answered[0].session;
  while (session.task) session = (await ok(`/api/blitz-practice/${session.id}/answer`, 'POST', { instanceId: session.task.instanceId, answer: answerFor(session.task) }, token)).session;
  assert.equal(session.status, 'completed'); assert.equal(session.finishReason, 'answered');
  assert.equal(session.progress.answered, 6); assert.equal(session.review.length, 6);
  const after = await ok('/api/equipment', 'GET', undefined, token);
  assert.deepEqual(after.stats, before.stats); assert.deepEqual(after.catalog, before.catalog);
  for (let index = 0; index < starts.length; index++) {
    assert.equal((await ok('/api/blitz-practice', 'POST', { requestId: `independent-first-${index}` }, token, 201)).id, session.id);
  }
  checks.push('Concurrent answer exactly once, conflicting answer refused, all six tasks, replay and no progression/reward changes PASS');

  const timed = await ok('/api/blitz-practice', 'POST', { requestId: 'independent-timeout-001' }, token, 201);
  const accepted = await ok(`/api/blitz-practice/${timed.id}/answer`, 'POST', { instanceId: timed.task.instanceId, answer: answerFor(timed.task) }, token);
  await stop(); await start();
  first = await login(0); second = await login(1); token = first.token;
  const resumed = await ok(`/api/blitz-practice/${timed.id}`, 'GET', undefined, token);
  assert.equal(resumed.status, 'active'); assert.equal(resumed.deadlineAt, timed.deadlineAt);
  assert.equal(resumed.progress.answered, 1); assert.deepEqual(resumed.avatarSnapshot, timed.avatarSnapshot);
  assert.equal((await request(`/api/blitz-practice/${timed.id}`, 'GET', undefined, second.token)).status, 404);
  console.log('HTTP checks passed; observing the real persisted 90-second deadline across server restart.');
  // The process yields to the caller while this real clock elapses. No clock injection
  // or saved timestamp editing is used for the HTTP deadline evidence.
  while (Date.now() <= Date.parse(timed.deadlineAt) + 100) {
    await new Promise(resolve => setTimeout(resolve, Math.min(1000, Math.max(1, Date.parse(timed.deadlineAt) + 101 - Date.now()))));
  }
  const late = await ok(`/api/blitz-practice/${timed.id}/answer`, 'POST',
    { instanceId: accepted.session.task.instanceId, answer: answerFor(accepted.session.task), clientNow: timed.startedAt }, token);
  assert.equal(late.accepted, false); assert.equal(late.session.status, 'completed');
  assert.equal(late.session.finishReason, 'timeout'); assert.equal(late.session.completedAt, timed.deadlineAt);
  assert.equal(late.session.progress.answered, 1); assert.equal(late.session.task, null);
  assert.equal((await ok('/api/blitz-practice', 'POST', { requestId: 'independent-timeout-001' }, token, 201)).id, timed.id);
  await stop(); await start(); first = await login(0); token = first.token;
  const restored = await ok(`/api/blitz-practice/${timed.id}`, 'GET', undefined, token);
  assert.equal(restored.status, 'completed'); assert.equal(restored.completedAt, timed.deadlineAt);
  const canonical = JSON.parse(await readFile(join(temp, 'equipment.json'), 'utf8'));
  const audit = (await readFile(join(temp, 'attempts.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(canonical.attempts.filter(entry => entry.shiftId === timed.id).length, 1);
  assert.equal(audit.filter(entry => entry.shiftId === timed.id).length, 1);
  checks.push('Real 90-second expiry, restart/resume without extra time, forged client time ignored, late answer refused, durable result and unique audit PASS');
  const evidence = { status: 'PASS', executedAt: new Date().toISOString(), node: process.version,
    scenario: 'Real local HTTP server with isolated public fixture; no browser authentication claim',
    realDeadlineObserved: true, durationMs: 90_000, checks };
  console.log(JSON.stringify(evidence, null, 2));
  if (process.env.SYNOPSIS_BLITZ_EVIDENCE) {
    await mkdir(dirname(process.env.SYNOPSIS_BLITZ_EVIDENCE), { recursive: true });
    await writeFile(process.env.SYNOPSIS_BLITZ_EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
  }
} finally { await stop(); await rm(temp, { recursive: true, force: true }); }
