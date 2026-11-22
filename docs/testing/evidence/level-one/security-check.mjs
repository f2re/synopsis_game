import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ShiftService, ShiftError } from '../../../../apps/server/dist/modules/shift/shiftService.js';
import { EquipmentService } from '../../../../apps/server/dist/modules/equipment/equipmentService.js';
import { DEFAULT_AVATAR } from '../../../../apps/server/dist/modules/identity/model.js';
import { LEVEL_ONE_MAX_START_KEYS } from '../../../../apps/server/dist/modules/shift/levelOneRules.js';
import { assertPublicTaskSafe } from '../../../../packages/content-engine/src/index.js';

const directory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(directory, '../../../..');
const tempRoot = resolve(repo, '../test-tmp');
await mkdir(tempRoot, { recursive: true });
const temporary = await mkdtemp(join(tempRoot, 'level-security-review-'));
const checks = [];
const check = async (name, operation) => { await operation(); checks.push({ name, status: 'PASS' }); };
const rejected = (code, status) => error => error instanceof ShiftError && error.code === code && (status === undefined || error.status === status);
const equipment = new EquipmentService({ storePath: join(temporary, 'training.json') });
const options = { equipment, contentRoot: join(repo, 'content'), attemptLogPath: join(temporary, 'attempts.jsonl') };
const service = new ShiftService(options);
const answerFor = task => task.response.kind === 'choice' ? { choiceIndex: task.payload.options[0].id } : { value: 0 };

try {
  await service.init();
  const alice = await service.startLevelOne('review-alice', DEFAULT_AVATAR, 'shared-request-key-0001');
  await check('Current task omits server validation data, future task IDs and request keys', async () => {
    assertPublicTaskSafe(alice.task);
    assert.equal(alice.review.length, 0);
    for (const key of ['seed', 'responses', 'requestIds', 'canonicalByPublic', 'validationContext', 'correctAnswer']) assert.equal(Object.hasOwn(alice, key), false);
    assert.equal(JSON.stringify(alice).includes('tmpl_c2_positive_temp'), false);
  });
  await check('Another account cannot read, answer or request the explanation of an owned run', async () => {
    assert.throws(() => service.getLevelOne('review-bob', alice.id), rejected('shift_not_found', 404));
    await assert.rejects(service.submitLevelOneAnswer('review-bob', alice.id, alice.task.instanceId, answerFor(alice.task)), rejected('shift_not_found', 404));
    await assert.rejects(service.openLevelOneReference('review-bob', alice.id, alice.task.instanceId), rejected('shift_not_found', 404));
    assert.equal(service.getLevelOne('review-alice', alice.id).progress.answered, 0);
    assert.equal(equipment.store.read().attempts.length, 0);
  });
  await check('Identical request IDs are scoped to the authenticated account', async () => {
    const bob = await service.startLevelOne('review-bob', DEFAULT_AVATAR, 'shared-request-key-0001');
    assert.notEqual(bob.id, alice.id);
    assert.equal(service.levelOneLobby('review-alice').session.id, alice.id);
    assert.equal(service.levelOneLobby('review-bob').session.id, bob.id);
  });
  await check('Returned views do not allow a caller to mutate the stored run', async () => {
    const view = service.getLevelOne('review-alice', alice.id);
    view.progress.correct = 6;
    view.equipment.assistedTasks = 6;
    view.review.push({ correct: true });
    const recovered = service.getLevelOne('review-alice', alice.id);
    assert.equal(recovered.progress.correct, 0);
    assert.equal(recovered.assistedTasks, 0);
    assert.equal(recovered.review.length, 0);
  });
  await check('An active run bounds new start keys but remains readable and accepts its old key', async () => {
    for (let i = 1; i < LEVEL_ONE_MAX_START_KEYS; i++) {
      const result = await service.startLevelOne('review-alice', DEFAULT_AVATAR, `additional-start-key-${String(i).padStart(4, '0')}`);
      assert.equal(result.id, alice.id);
    }
    await assert.rejects(service.startLevelOne('review-alice', DEFAULT_AVATAR, 'additional-start-key-overflow'), rejected('level_start_limit', 429));
    assert.equal(equipment.store.read().shifts[alice.id].levelOne.requestIds.length, LEVEL_ONE_MAX_START_KEYS);
    assert.equal(service.getLevelOne('review-alice', alice.id).id, alice.id);
    assert.equal((await service.startLevelOne('review-alice', DEFAULT_AVATAR, 'shared-request-key-0001')).id, alice.id);
  });
  const firstAnswer = answerFor(alice.task);
  let afterFirst;
  await check('Concurrent identical answers create one durable attempt; another answer is rejected', async () => {
    const [one, two] = await Promise.all([
      service.submitLevelOneAnswer('review-alice', alice.id, alice.task.instanceId, firstAnswer),
      service.submitLevelOneAnswer('review-alice', alice.id, alice.task.instanceId, firstAnswer),
    ]);
    assert.deepEqual(one, two);
    afterFirst = one.session;
    assert.equal(afterFirst.progress.answered, 1);
    assert.equal(equipment.store.read().attempts.length, 1);
    await assert.rejects(service.submitLevelOneAnswer('review-alice', alice.id, alice.task.instanceId, { choiceIndex: (firstAnswer.choiceIndex + 1) % 4 }), rejected('answer_already_recorded', 409));
    assert.equal(equipment.store.read().attempts.length, 1);
  });
  await check('Help reveals only the current exercise and marks it assisted without rewards or charges', async () => {
    await assert.rejects(service.openLevelOneReference('review-alice', alice.id, `${alice.id}:6`), rejected('task_instance_mismatch', 409));
    await assert.rejects(service.openLevelOneReference('review-alice', alice.id, alice.task.instanceId), rejected('task_instance_mismatch', 409));
    const first = await service.openLevelOneReference('review-alice', alice.id, afterFirst.task.instanceId);
    const repeated = await service.openLevelOneReference('review-alice', alice.id, afterFirst.task.instanceId);
    assert.deepEqual(first, repeated);
    assert.equal(first.assisted, true);
    assert.ok(first.explanation.length > 0);
    assert.equal(first.equipment.assistedTasks, 1);
    assert.deepEqual(first.equipment.remaining, { reference: 0, retry: 0 });
    assertPublicTaskSafe(service.getLevelOne('review-alice', alice.id).task);
  });
  await check('Ordinary shift mutation and result endpoints cannot accept a first-level run', async () => {
    await assert.rejects(service.submitAnswer('review-alice', alice.id, afterFirst.task.instanceId, answerFor(afterFirst.task)), rejected('shift_mode_mismatch', 409));
    assert.throws(() => service.getResult('review-alice', alice.id), rejected('shift_mode_mismatch', 409));
  });
  await check('Completion, lost-response replay and reload keep level results separate from ordinary rewards', async () => {
    let session = service.getLevelOne('review-alice', alice.id);
    while (session.task) session = (await service.submitLevelOneAnswer('review-alice', alice.id, session.task.instanceId, answerFor(session.task))).session;
    assert.equal(session.status, 'completed');
    assert.equal(session.progress.answered, 6);
    assert.equal(session.review.length, 6);
    assert.equal(session.task, null);
    assert.equal(equipment.getEquipment('review-alice', DEFAULT_AVATAR).stats.completedShifts, 0);
    assert.equal((await service.blitzLobby('review-alice')).eligible, false);
    assert.equal(equipment.store.read().shifts[alice.id].reward, undefined);
    const replay = await service.startLevelOne('review-alice', DEFAULT_AVATAR, 'shared-request-key-0001');
    assert.deepEqual(replay, session);
    const restored = new ShiftService({ ...options, equipment: new EquipmentService({ storePath: join(temporary, 'training.json') }) });
    await restored.init();
    assert.deepEqual(restored.getLevelOne('review-alice', alice.id), session);
    const next = await restored.startLevelOne('review-alice', DEFAULT_AVATAR, 'explicit-new-run-key-0001');
    assert.notEqual(next.id, alice.id);
    assert.equal(restored.levelOneLobby('review-alice').completedRuns, 1);
    assert.equal(restored.getLevelOne('review-alice', alice.id).status, 'completed');
  });
  const paths = ['apps/server/src/index.ts', 'apps/server/src/modules/shift/shiftService.ts', 'apps/server/src/modules/shift/levelOneRules.ts', 'apps/server/src/modules/equipment/model.ts', 'apps/server/src/modules/equipment/trainingStore.ts'];
  const sha256 = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash('sha256').update(await readFile(join(repo, path))).digest('hex')])));
  const report = { reviewer: '/root/level_security_review', kind: 'independent-service-security-check', status: 'PASS', checks, sha256, limitations: ['No HTTP listener, browser or DOM execution.', 'The role guard is reviewed separately in security-review.md.', 'Existing identity credential provisioning is outside this change.'] };
  await writeFile(join(directory, 'security-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks }, null, 2));
} finally { await rm(temporary, { recursive: true, force: true }); }
