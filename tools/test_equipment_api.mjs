import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const repo = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'synopsis-independent-equipment-'));
const fixture = JSON.parse(await readFile(join(repo, 'config/test-roster.example.json'), 'utf8'));
const fixtureUsers = fixture.groups[0].users;
const events = [];
const listener = net.createServer();
listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
const port = listener.address().port;
await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
const base = `http://127.0.0.1:${port}`;
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
async function stop() { if (child?.exitCode === null) { const done = once(child, 'exit'); child.kill('SIGTERM'); await done; } }
async function request(route, method = 'GET', body, token) {
  const response = await fetch(base + route, { method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
async function ok(route, method, body, token, status = 200) {
  const response = await request(route, method, body, token);
  assert.equal(response.status, status, `${route}: ${JSON.stringify(response.body)}`); return response.body;
}
async function login(index) {
  const roster = await ok(`/api/identity/roster?group=${encodeURIComponent(fixture.groups[0].groupId)}`);
  const user = roster.users.find(entry => entry.displayName === fixtureUsers[index].displayName);
  return ok('/api/identity/login', 'POST', { userId: user.id, code: fixtureUsers[index].code });
}
function answerRoute(task) { return `/api/tasks/${encodeURIComponent(task.instanceId)}/answer`; }
function correctAnswer(task) {
  const numeric = { kn01_temp_001: 23.4, kn01_dewpoint_001: -5.2, kn01_station_pressure_001: 1021.8 };
  if (task.definitionId in numeric) return { value: numeric[task.definitionId] };
  if (task.type === 'choice') return { choiceIndex: task.payload.options.find(option => option.label.startsWith('Равномерное падение давления')).id };
  if (task.type === 'sequence') {
    const expected = ['iRixhVV','Nddff','1snTTT','2snTdTdTd','3PoPoPoPo','4PPPP или 4a3hhh','5appp'];
    return { order: expected.map(label => task.payload.steps.find(step => step.label === label).id) };
  }
  if (task.type === 'stationPlot') return { placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' } };
  if (task.type === 'stationBoard') {
    const placements = {};
    if (task.definitionId === 'station_board_three_001') for (const key of ['a','b','c']) { placements[`${key}_t`] = `${key}_nw`; placements[`${key}_td`] = `${key}_sw`; }
    else for (const key of ['a','b','c','d','e','f','g','h']) { placements[`${key}8_t`] = `${key}8_nw`; placements[`${key}8_td`] = `${key}8_sw`; }
    return { placements };
  }
  if (task.type === 'findError') return { stationId: 'qc_f' };
  if (task.type === 'dependencySequence') {
    const labels = ['Провести критику и физический контроль исходных наблюдений','Сопоставить текущий срок с предыдущим сроком и историей процесса','Проанализировать поле давления и провести изобары','Выделить центры В/Н и основные барические образования','Проанализировать барическую тенденцию и области П/Р','Проанализировать явления погоды, облачность и другие признаки воздушных масс','Выполнить комплексный фронтологический анализ по совокупности признаков','Проверить согласованность итогового анализа с полями и предыдущим сроком'];
    return { order: labels.map(label => task.payload.steps.find(step => step.label === label).id) };
  }
  throw new Error(`Unrecognized fixture ${task.type} ${task.definitionId}`);
}
async function finish(shiftId, task, token) {
  let result, sent;
  while (task) {
    sent = { shiftId, answer: correctAnswer(task), attempt: 1 };
    result = await ok(answerRoute(task), 'POST', sent, token);
    assert.equal(result.status, 'answered'); assert.equal(result.feedback.correct, true);
    if (!result.nextTask) return { result, sent, route: answerRoute(task) };
    task = result.nextTask;
  }
}
try {
  await start();
  let first = await login(0), second = await login(1), token = first.token;
  assert.equal((await request('/api/equipment')).status, 401);
  assert.equal((await request('/api/equipment/loadout', 'PATCH', { badgeId: 'badge.accuracy' }, token)).status, 403);
  assert.equal((await request('/api/equipment/loadout', 'PATCH', { badgeId: '__proto__' }, token)).status, 400);
  const initial = await ok('/api/equipment', 'GET', undefined, token);
  assert.equal(initial.stats.completedShifts, 0); assert.equal(initial.loadout.badgeId, 'badge.training_starter');
  await ok('/api/identity/avatar', 'PATCH', { avatar: { ...first.user.avatar, heldItem: 'held.pencil' } }, token);
  const started = await ok('/api/shifts', 'POST', { mode: 'ranked', equipment: { charges: { reference: 999, retry: 999 } } }, token, 201);
  assert.equal(started.mode, 'practice-draft'); assert.deepEqual(started.equipment.charges, { reference: 1, retry: 1 });
  assert.equal('correctAnswer' in started.task, false); assert.equal('answer' in started.task, false);
  assert.equal((await request(`/api/shifts/${started.shiftId}/task`, 'GET', undefined, second.token)).status, 404);
  assert.equal((await request(`/api/shifts/${started.shiftId}/result`, 'GET', undefined, second.token)).status, 404);
  assert.equal((await request(answerRoute(started.task), 'POST', { shiftId: started.shiftId, answer: { value: 23.4 } }, second.token)).status, 404);
  assert.equal((await request(`/api/shifts/${started.shiftId}/reference`, 'POST', { instanceId: started.task.instanceId }, second.token)).status, 404);
  assert.equal((await request('/api/progression/shift', 'POST', { score: 100, correct: 10 }, token)).status, 409);
  assert.equal((await request('/api/progression/exam', 'POST', { passed: true }, token)).status, 409);
  events.push('anonymous, ownership, locked/unknown badge, forged charge/mode, legacy progression guards PASS');
  await ok('/api/equipment/loadout', 'PATCH', { badgeId: null }, token);
  await ok('/api/identity/avatar', 'PATCH', { avatar: { ...first.user.avatar, heldItem: 'held.map-folder' } }, token);
  const resumed = await ok('/api/shifts', 'POST', undefined, token, 201);
  assert.equal(resumed.shiftId, started.shiftId); assert.deepEqual(resumed.equipment, started.equipment);
  const nextView = await ok('/api/equipment', 'GET', undefined, token);
  assert.equal(nextView.nextShift.badgeId, null); assert.equal(nextView.nextShift.heldItem, 'held.map-folder');
  events.push('start/resume idempotent and immutable equipment snapshot PASS');
  const refs = await Promise.all(Array.from({ length: 5 }, () => ok(`/api/shifts/${started.shiftId}/reference`, 'POST', { instanceId: started.task.instanceId }, token)));
  assert(refs.every(ref => ref.equipment.remaining.reference === 0 && ref.equipment.assistedTasks === 1));
  const wrongBody = { shiftId: started.shiftId, answer: { value: -999 }, attempt: 1 };
  const wrong = await ok(answerRoute(started.task), 'POST', wrongBody, token);
  assert.equal(wrong.status, 'retry-offered'); assert.equal(wrong.answered, 0);
  assert.equal('correctAnswer' in wrong.feedback, false); assert.equal(wrong.feedback.explanation, ''); assert.equal(wrong.feedback.details, null);
  assert.deepEqual(await ok(answerRoute(started.task), 'POST', wrongBody, token), wrong);
  assert.equal((await request(answerRoute(started.task), 'POST', { ...wrongBody, answer: { value: 23.4 } }, token)).status, 409);
  await stop(); await start(); first = await login(0); second = await login(1); token = first.token;
  const afterRestart = await ok(`/api/shifts/${started.shiftId}/task`, 'GET', undefined, token);
  assert.equal(afterRestart.retryAvailable, true); assert.equal(afterRestart.reference.assisted, true); assert.equal(afterRestart.equipment.remaining.reference, 0);
  const retryBody = { shiftId: started.shiftId, answer: { value: 23.4 }, attempt: 2 };
  const retries = await Promise.all(Array.from({ length: 5 }, () => ok(answerRoute(started.task), 'POST', retryBody, token)));
  assert(retries.every(result => result.progress.answered === 1 && result.equipment.remaining.retry === 0 && result.feedback.retried === true && result.feedback.assisted === true));
  assert.equal(retries[0].progress.correct, 0);
  assert.equal((await request(answerRoute(retries[0].nextTask), 'POST', { shiftId: started.shiftId, answer: { value: -5.2 }, attempt: 2 }, token)).status, 409);
  assert.equal((await request(`/api/shifts/${started.shiftId}/reference`, 'POST', { instanceId: retries[0].nextTask.instanceId }, token)).status, 409);
  events.push('concurrent hint/retry charge idempotency, no solution in retry offer, restart with pending retry, independent score excludes retry PASS');
  const incomplete = await ok(`/api/shifts/${started.shiftId}/result`, 'GET', undefined, token);
  assert.equal(incomplete.completed, false); assert.equal('reward' in incomplete, false);
  const finished = await finish(started.shiftId, retries[0].nextTask, token);
  assert.equal(finished.result.completed, true); assert.equal(finished.result.reward.completedShifts, 1);
  const beforeReplay = await ok('/api/equipment', 'GET', undefined, token);
  await Promise.all(Array.from({ length: 5 }, () => ok(finished.route, 'POST', finished.sent, token)));
  await Promise.all(Array.from({ length: 5 }, () => ok(`/api/shifts/${started.shiftId}/result`, 'GET', undefined, token)));
  assert.deepEqual(await ok('/api/equipment', 'GET', undefined, token), beforeReplay);
  assert(beforeReplay.catalog.find(b => b.id === 'badge.first_shift').unlocked);
  assert.equal((await ok('/api/equipment', 'GET', undefined, second.token)).stats.completedShifts, 0);
  await ok('/api/equipment/loadout', 'PATCH', { badgeId: 'badge.first_shift' }, token);
  const persistedStats = await ok('/api/equipment', 'GET', undefined, token);
  await stop(); await start(); first = await login(0); token = first.token;
  assert.deepEqual(await ok('/api/equipment', 'GET', undefined, token), persistedStats);
  const newShift = await ok('/api/shifts', 'POST', undefined, token, 201);
  assert.notEqual(newShift.shiftId, started.shiftId); assert.equal(newShift.equipment.badgeId, 'badge.first_shift');
  assert.deepEqual(newShift.equipment.charges, { reference: 1, retry: 1 });
  events.push('complete real ten-task shift, once-only rewards, cross-account isolation, earned selection and restart persistence PASS');
  const canonical = JSON.parse(await readFile(join(temp, 'equipment.json'), 'utf8'));
  const audit = (await readFile(join(temp, 'attempts.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(new Set(audit.map(a => a.eventId)).size, audit.length); assert.equal(canonical.attempts.length, audit.length);
  events.push(`durable canonical/audit evidence matches with ${audit.length} unique attempts PASS`);
  for (const body of [null, [], 12, 'invalid']) {
    assert.equal((await request('/api/equipment/loadout', 'PATCH', body, token)).status, 400);
    assert.equal((await request(`/api/shifts/${newShift.shiftId}/reference`, 'POST', body, token)).status, 400);
  }
  events.push('invalid JSON shapes rejected at input boundary PASS');
  console.log(JSON.stringify({ status: 'PASS', executedAt: new Date().toISOString(), node: process.version, checks: events }, null, 2));
  if (process.env.SYNOPSIS_EQUIPMENT_EVIDENCE) {
    const evidencePath = process.env.SYNOPSIS_EQUIPMENT_EVIDENCE;
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, JSON.stringify({ status: 'PASS', executedAt: new Date().toISOString(), node: process.version, checks: events }, null, 2) + '\n');
  }
} finally { await stop(); await rm(temp, { recursive: true, force: true }); }
