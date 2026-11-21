import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createTaskInstance, validateTaskAnswer } from '../../../../packages/content-engine/src/index.js';
import { decodeGroup } from '../../../../packages/kn01-codec/src/index.js';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const definitionsPath = 'content/tasks/kn01_level1_templates.json';
const baseline = execFileSync('git', ['rev-parse', 'fac9275'], { cwd: repo, encoding: 'utf8' }).trim();
const definitions = JSON.parse(await readFile(resolve(repo, definitionsPath), 'utf8')).tasks;
const oldDefinitions = JSON.parse(execFileSync('git', ['show', `${baseline}:${definitionsPath}`], { cwd: repo, encoding: 'utf8' })).tasks;

// Independent expectations: reconstructed from the 2013 primary source, not definition.answer.
const choices = [
  { id: 'tmpl_c1_aaxx_header', expectedLabel: 'Сводка погоды с наземной метеорологической станции', sourcePages: [3, 9] },
  { id: 'tmpl_c2_temp_vs_dewpoint', expectedLabel: '1 — температура воздуха, 2 — точка росы', sourcePages: [10, 11] },
  { id: 'tmpl_c2_sign_bit_sn', expectedLabel: 'sn = 1', sourcePages: [60] },
];
const numeric = [
  { id: 'tmpl_c2_positive_temp', group: '10234', type: '1snTTT', expected: 234 / 10 },
  { id: 'tmpl_c2_negative_dewpoint', group: '21008', type: '2snTdTdTd', expected: -(8 / 10) },
  { id: 'tmpl_c2_encode_temp', group: '11128', type: '1snTTT', expected: -(128 / 10) },
];

function independentlyDecode(group, expectedPrefix) {
  assert.match(group, /^[12][01]\d{3}$/);
  assert.equal(group[0], expectedPrefix);
  const tenths = Number(group[2]) * 100 + Number(group[3]) * 10 + Number(group[4]);
  return (group[1] === '1' ? -1 : 1) * tenths / 10;
}

const forbiddenFields = new Set(['answer', 'correctAnswer', 'solution', 'validationContext', 'canonicalByPublic', 'explanation']);
function assertPublicOnly(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!forbiddenFields.has(key), `Public task exposes ${key}`);
    assertPublicOnly(child);
  }
}

const checks = [];
let optionJudgments = 0;
let numericJudgments = 0;
for (const entry of [...choices, ...numeric]) {
  const definition = definitions.find(item => item.id === entry.id);
  assert.ok(definition, entry.id);
  assert.deepEqual(definition, oldDefinitions.find(item => item.id === entry.id), `${entry.id}: definition changed since baseline`);
  assert.equal(definition.method_profile, 'RUS_SURFACE_STATION_V1');
  assert.equal(definition.data_origin, 'synthetic_drill');
  assert.ok(definition.sources.some(source => source.source_id === 'ROSHYDROMET_KN01_2013'));
  const sha256 = createHash('sha256').update(JSON.stringify(definition)).digest('hex');
  if ('expectedLabel' in entry) {
    assert.equal(definition.type, 'choice');
    const allPositions = new Set();
    const permutations = new Set();
    for (let seed = 1; seed <= 64; seed++) {
      const { publicTask, validationContext } = createTaskInstance(definition, { instanceId: `verify-${entry.id}-${seed}`, contentPack: 'kn01_level1_pack@1.0.0', seed });
      assertPublicOnly(publicTask);
      const correct = publicTask.payload.options.find(option => option.label === entry.expectedLabel);
      assert.ok(correct, 'The independently established correct meaning must be present');
      allPositions.add(correct.id);
      permutations.add(publicTask.payload.options.map(option => option.label).join('|'));
      for (const option of publicTask.payload.options) {
        const result = validateTaskAnswer(definition, validationContext, { choiceIndex: option.id });
        assert.equal(result.correct, option.label === entry.expectedLabel, `${entry.id}: shuffled option ${option.id}`);
        assert.equal(result.correctAnswer, entry.expectedLabel);
        optionJudgments++;
      }
    }
    assert.deepEqual([...allPositions].sort(), [0, 1, 2, 3], 'Every public position is covered');
    checks.push({ id: entry.id, status: 'VERIFIED', sourcePages: entry.sourcePages, expected: entry.expectedLabel, seeds: 64, correctPositions: [...allPositions].sort(), distinctPermutations: permutations.size, definitionSha256: sha256 });
  } else {
    assert.equal(definition.type, 'decode');
    assert.equal(definition.payload.encoded, entry.group);
    assert.equal(definition.payload.group, entry.type);
    const independent = independentlyDecode(entry.group, entry.type[0]);
    assert.equal(independent, entry.expected);
    assert.equal(definition.answer.value, independent);
    assert.equal(definition.answer.unit, '°C');
    const { publicTask, validationContext } = createTaskInstance(definition, { instanceId: `verify-${entry.id}`, contentPack: 'kn01_level1_pack@1.0.0', seed: 39 });
    assertPublicOnly(publicTask);
    assert.equal(publicTask.response.kind, 'numeric');
    assert.equal(publicTask.response.unit, '°C');
    const correct = validateTaskAnswer(definition, validationContext, { value: independent });
    assert.equal(correct.correct, true);
    numericJudgments++;
    for (const wrong of [-independent, independent * 10, independent / 10, independent + 0.1, independent - 0.1]) {
      assert.notEqual(wrong, independent);
      assert.equal(validateTaskAnswer(definition, validationContext, { value: wrong }).correct, false, `${entry.id}: wrong ${wrong}`);
      numericJudgments++;
    }
    const decoded = decodeGroup(entry.group, entry.type);
    assert.equal(decoded.value, independent);
    assert.equal(decoded.unit, 'degC');
    checks.push({ id: entry.id, status: 'VERIFIED', sourcePages: [10, 11, 60], group: entry.group, independent, codecValue: decoded.value, unit: '°C', definitionSha256: sha256 });
  }
}

const boundaryChecks = [
  ['10000', '1snTTT', 0],
  ['10001', '1snTTT', 0.1],
  ['11001', '1snTTT', -0.1],
  ['20000', '2snTdTdTd', 0],
  ['21001', '2snTdTdTd', -0.1],
];
for (const [group, type, expected] of boundaryChecks) {
  assert.equal(independentlyDecode(group, type[0]), expected);
  assert.equal(decodeGroup(group, type).value, expected);
}
for (const [group, type] of [['19234', '1snTTT'], ['29008', '2snTdTdTd']]) assert.throws(() => decodeGroup(group, type));

const report = {
  reviewer: '/root/meteo_verifier',
  date: '2026-11-21',
  status: 'VERIFIED',
  baseline,
  source: { url: 'https://meteoinfo.ru/images/media/books-docs/RHM/kn-01-synop.pdf', edition: 'Москва, 2013', printedPages: [3, 9, 10, 11, 60], table: '3845' },
  profile: 'RUS_SURFACE_STATION_V1',
  checks,
  optionJudgments,
  numericJudgments,
  boundaryChecks: boundaryChecks.length,
  rejectedSignCodes: 2,
  publicPayloadsChecked: choices.length * 64 + numeric.length,
  scope: 'Только шесть перечисленных неизменённых учебных примеров. Это не один снимок наблюдений, не квалификация и не приёмка всего пакета.',
  limitations: ['Не выполнялись браузерные действия.', 'Жизненный цикл сервера и сохранение профиля не проверялись этим скриптом.', 'Актуальность всех более поздних нормативных изменений не заявляется.'],
};
await writeFile(new URL('./methodology-independent-check.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, tasks: checks.length, optionJudgments, numericJudgments, boundaryChecks: report.boundaryChecks, rejectedSignCodes: 2, publicPayloadsChecked: report.publicPayloadsChecked }));
