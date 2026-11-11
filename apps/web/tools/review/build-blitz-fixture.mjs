/** Rebuild public visual states from the real checker. No login or real student data. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShiftService } from '../../../server/dist/modules/shift/shiftService.js';
import { DEFAULT_AVATAR } from '../../../server/dist/modules/identity/model.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const directory = await mkdtemp(join(tmpdir(), 'synopsis-blitz-visual-'));
let now = Date.parse('2026-11-11T12:00:00.000Z');
const userId = 'fixture.blitz-practice.public';
const avatar = { ...DEFAULT_AVATAR, top: 'top.field-jacket', footwear: 'footwear.boots', backpack: 'backpack.field', heldItem: 'held.tablet' };

function input(task) {
  const payload = task.payload;
  if (task.response.kind === 'numeric') return { value: 0 };
  if (task.response.kind === 'choice') return { choiceIndex: payload.options[0].id };
  if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') return { order: payload.steps.map((step) => step.id) };
  if (task.response.kind === 'findError') return { stationId: payload.stations[0].id };
  return { placements: Object.fromEntries(payload.observations.map((observation, index) => [observation.id, payload.slots[index % payload.slots.length].id])) };
}

try {
  const service = new ShiftService({ contentRoot: join(root, 'content'), attemptLogPath: join(directory, 'attempts.jsonl'), now: () => new Date(now) });
  await service.init();
  const locked = await service.blitzLobby(userId);
  const practice = await service.startShift(userId, avatar);
  let task = practice.task;
  while (task) task = (await service.submitAnswer(userId, practice.shiftId, task.instanceId, input(task))).nextTask;
  const ready = await service.blitzLobby(userId);
  let session = await service.startBlitz(userId, avatar, 'fixture-blitz-start-20261111');
  const active = [];
  while (session.task) {
    active.push(session);
    session = (await service.submitBlitzAnswer(userId, session.id, session.task.instanceId, input(session.task))).session;
  }
  const completed = session;
  let timeout = await service.startBlitz(userId, avatar, 'fixture-blitz-timeout-20261111');
  timeout = (await service.submitBlitzAnswer(userId, timeout.id, timeout.task.instanceId, input(timeout.task))).session;
  now += 90_000;
  timeout = await service.getBlitz(userId, timeout.id);
  await writeFile(join(here, 'blitz-practice-fixture.json'), `${JSON.stringify({ source: 'ShiftService; core_ru_001@0.6.0; local public visual fixture; 2026-11-11', avatar, locked, ready, active, completed, timeout }, null, 2)}\n`);
  process.stdout.write('Public BlitzWorkspace visual fixture rebuilt from ShiftService.\n');
} finally { await rm(directory, { recursive: true, force: true }); }
