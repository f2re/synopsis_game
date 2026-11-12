import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Real HTTP, isolated public example users, no production stores or credentials.
const repo = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'synopsis-portrait-http-'));
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
      SYNOPSIS_AVATAR_ASSETS_ROOT: join(repo, 'apps/web/public/assets/avatar/modular-r01'),
      SYNOPSIS_CONTENT_ROOT: join(repo, 'content') }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Portrait API startup timeout')), 15000);
    child.stdout.on('data', bytes => { if (String(bytes).includes(base)) { clearTimeout(timer); resolve(); } });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Portrait API exited ${code}`)); });
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
  assert.equal(JSON.stringify(roster).includes('pngDataUrl'), false, 'Public roster must not disclose portraits');
  assert.equal(JSON.stringify(roster).includes('avatarPortrait'), false);
  const selected = fixture.groups[0].users[index];
  const user = roster.users.find(entry => entry.displayName === selected.displayName);
  return ok('/api/identity/login', 'POST', { userId: user.id, code: selected.code });
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function checkPortrait(portrait, profile) {
  assert.equal(portrait.version, 1);
  assert.equal(portrait.width, 160); assert.equal(portrait.height, 160);
  assert.match(portrait.sourceRevision, /^portrait-v1:/);
  assert.match(portrait.pngDataUrl, /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/);
  const bytes = Buffer.from(portrait.pngDataUrl.slice('data:image/png;base64,'.length), 'base64');
  assert(bytes.length > 0 && bytes.length < 128 * 1024);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
  assert.equal(bytes.readUInt32BE(16), 160); assert.equal(bytes.readUInt32BE(20), 160);
  assert.equal(portrait.sha256, hash(bytes));
  assert.equal(portrait.appearanceKey, hash(JSON.stringify(profile)));
  return bytes.length;
}
function checkSnapshot(value, user) {
  assert.deepEqual(value.equipment.avatarSnapshot, user.avatar);
  assert.deepEqual(value.equipment.avatarPortrait, user.avatarPortrait);
}
function answerFor(task) {
  // Valid input shapes exercise transport and completion, not scientific correctness.
  const payload = task.payload;
  if (task.response.kind === 'numeric') return { value: 0 };
  if (task.response.kind === 'choice') return { choiceIndex: payload.options[0].id };
  if (['sequence', 'dependencySequence'].includes(task.response.kind)) return { order: payload.steps.map(step => step.id) };
  if (task.response.kind === 'findError') return { stationId: payload.stations[0].id };
  return { placements: Object.fromEntries(payload.observations.map((observation, index) => [observation.id, payload.slots[index % payload.slots.length].id])) };
}

try {
  await start();
  let first = await login(0), second = await login(1), token = first.token;
  const original = first.user, other = second.user;
  const pngBytes = [checkPortrait(original.avatarPortrait, original.avatar)];
  assert.equal((await request('/api/identity/avatar', 'PATCH', { avatar: original.avatar })).status, 401);
  const outfit = { ...original.avatar, skinTone: 'skin.deep', hair: 'hair.curl', hairColor: 'haircolor.auburn',
    headwear: 'headwear.beanie', top: 'top.field-jacket', bottom: 'bottom.field-trousers', footwear: 'footwear.boots',
    backpack: 'backpack.field', heldItem: 'held.map-folder', companion: 'companion.tit', badge: 'badge.meteo' };
  const saved = (await ok('/api/identity/avatar', 'PATCH', { avatar: outfit,
    avatarPortrait: { ...original.avatarPortrait, pngDataUrl: 'data:image/svg+xml,<svg onload="alert(1)"/>' },
    portraitUrl: 'https://invalid.example/portrait.png' }, token)).user;
  assert.deepEqual(saved.avatar, outfit); assert.equal(Object.keys(saved.avatar).length, 11);
  pngBytes.push(checkPortrait(saved.avatarPortrait, outfit));
  assert.notEqual(saved.avatarPortrait.sha256, original.avatarPortrait.sha256);
  assert.deepEqual((await ok('/api/identity/me', 'GET', undefined, token)).user.avatarPortrait, saved.avatarPortrait);
  assert.deepEqual((await ok('/api/identity/me', 'GET', undefined, second.token)).user.avatarPortrait, other.avatarPortrait);
  assert.deepEqual((await ok('/api/identity/avatar', 'PATCH', { avatar: outfit }, token)).user.avatarPortrait, saved.avatarPortrait);
  for (const invalid of [{ ...outfit, footwear: 'footwear.unknown' }, { ...outfit, top: 'top.none' }, { ...outfit, skinTone: 'red' }, {}]) {
    assert.equal((await request('/api/identity/avatar', 'PATCH', { avatar: invalid }, token)).status, 400);
    const current = (await ok('/api/identity/me', 'GET', undefined, token)).user;
    assert.deepEqual(current.avatar, outfit); assert.deepEqual(current.avatarPortrait, saved.avatarPortrait);
  }
  const bootsOnly = { ...outfit, footwear: 'footwear.shoes' };
  const shoes = (await ok('/api/identity/avatar', 'PATCH', { avatar: bootsOnly }, token)).user;
  assert.equal(shoes.avatarPortrait.sha256, saved.avatarPortrait.sha256, 'Off-crop shoes preserve portrait pixels');
  assert.notEqual(shoes.avatarPortrait.appearanceKey, saved.avatarPortrait.appearanceKey, 'Off-crop shoes remain in saved appearance');
  assert.deepEqual(shoes.avatar, bootsOnly); checkPortrait(shoes.avatarPortrait, bootsOnly);
  checks.push('Server-owned PNG, 160×160 header/hash, all eleven fields/colors, off-crop shoes, invalid save, idempotent save, client SVG/URL ignored, public roster and account isolation PASS');

  const practice = await ok('/api/shifts', 'POST', { avatarSnapshot: original.avatar, avatarPortrait: original.avatarPortrait }, token, 201);
  checkSnapshot(practice, shoes);
  const changed = (await ok('/api/identity/avatar', 'PATCH', { avatar: original.avatar }, token)).user;
  checkSnapshot(await ok(`/api/shifts/${practice.shiftId}/task`, 'GET', undefined, token), shoes);
  checkSnapshot(await ok('/api/shifts', 'POST', {}, token, 201), shoes);
  let task = practice.task;
  while (task) {
    let result = await ok(`/api/tasks/${encodeURIComponent(task.instanceId)}/answer`, 'POST',
      { shiftId: practice.shiftId, answer: answerFor(task), attempt: 1 }, token);
    checkSnapshot(result, shoes);
    if (result.status === 'retry-offered') {
      result = await ok(`/api/shifts/${practice.shiftId}/reveal`, 'POST', { instanceId: task.instanceId }, token);
      checkSnapshot(result, shoes);
    }
    task = result.nextTask;
  }
  const practiceResult = await ok(`/api/shifts/${practice.shiftId}/result`, 'GET', undefined, token);
  assert.equal(practiceResult.completed, true); checkSnapshot(practiceResult, shoes);
  assert.equal((await request(`/api/shifts/${practice.shiftId}/result`, 'GET', undefined, second.token)).status, 404);
  checks.push('Ordinary practice pins actual saved PNG and full outfit at start; later edits, resume, answers and final result preserve it PASS');

  const blitz = await ok('/api/blitz-practice', 'POST', { requestId: 'saved-portrait-http-001',
    avatarSnapshot: shoes.avatar, avatarPortrait: shoes.avatarPortrait }, token, 201);
  checkSnapshot(blitz, changed); assert.deepEqual(blitz.avatarSnapshot, changed.avatar);
  const latest = (await ok('/api/identity/avatar', 'PATCH', { avatar: outfit }, token)).user;
  checkSnapshot(await ok(`/api/blitz-practice/${blitz.id}`, 'GET', undefined, token), changed);
  const answer = await ok(`/api/blitz-practice/${blitz.id}/answer`, 'POST',
    { instanceId: blitz.task.instanceId, answer: answerFor(blitz.task) }, token);
  checkSnapshot(answer.session, changed);
  checks.push('Blitz pins server-owned PNG and all outfit fields; forged start images and later profile changes cannot replace session portrait PASS');

  await stop(); await start();
  first = await login(0); second = await login(1); token = first.token;
  assert.deepEqual(first.user.avatar, latest.avatar); assert.deepEqual(first.user.avatarPortrait, latest.avatarPortrait);
  assert.deepEqual(second.user.avatar, other.avatar); assert.deepEqual(second.user.avatarPortrait, other.avatarPortrait);
  checkSnapshot(await ok(`/api/shifts/${practice.shiftId}/result`, 'GET', undefined, token), shoes);
  checkSnapshot(await ok(`/api/blitz-practice/${blitz.id}`, 'GET', undefined, token), changed);
  const identity = JSON.parse(await readFile(join(temp, 'identity.json'), 'utf8'));
  const training = JSON.parse(await readFile(join(temp, 'equipment.json'), 'utf8'));
  assert.deepEqual(identity.users.find(user => user.id === first.user.id).avatarPortrait, latest.avatarPortrait);
  checkSnapshot(training.shifts[practice.shiftId], shoes); checkSnapshot(training.shifts[blitz.id], changed);
  checks.push('Process restart preserves exact PNG bytes, appearance and separate ordinary/blitz historical snapshots on disk PASS');

  const evidence = { status: 'PASS', executedAt: new Date().toISOString(), node: process.version,
    scenario: 'Real isolated HTTP server and restart; no browser or scientific validation claim',
    portraitSize: [160, 160], pngBytes, checks };
  console.log(JSON.stringify(evidence, null, 2));
  if (process.env.SYNOPSIS_PORTRAIT_EVIDENCE) {
    await mkdir(dirname(process.env.SYNOPSIS_PORTRAIT_EVIDENCE), { recursive: true });
    await writeFile(process.env.SYNOPSIS_PORTRAIT_EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
  }
} finally { await stop(); await rm(temp, { recursive: true, force: true }); }
