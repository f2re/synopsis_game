// Reproducible source-to-answer check for the six selected introductory tasks.
// No server, browser, user state, or content files are modified.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { decodeGroup } from '../../../../packages/kn01-codec/src/index.js';
import { createTaskInstance, validateTaskAnswer, assertPublicTaskSafe } from '../../../../packages/content-engine/src/index.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const file = 'content/tasks/kn01_level1_templates.json';
const bytes = readFileSync(resolve(root, file));
const definitions = JSON.parse(bytes).tasks;
const expected = [
  ['tmpl_c1_aaxx_header', 'Сводка погоды с наземной метеорологической станции'],
  ['tmpl_c2_temp_vs_dewpoint', '1 — температура воздуха, 2 — точка росы'],
  ['tmpl_c2_sign_bit_sn', 'sn = 1'],
  ['tmpl_c2_positive_temp', 23.4],
  ['tmpl_c2_negative_dewpoint', -0.8],
  ['tmpl_c2_encode_temp', -12.8],
];

const checks = [];
for (const [id, answer] of expected) {
  const definition = definitions.find(task => task.id === id);
  assert.ok(definition, id);
  assert.equal(definition.method_profile, 'RUS_SURFACE_STATION_V1');
  assert.equal(definition.data_origin, 'synthetic_drill');
  assert.equal(definition.review.publication_allowed, true);
  assert.equal(definition.sources[0].source_id, 'ROSHYDROMET_KN01_2013');
  const { publicTask, validationContext } = createTaskInstance(definition, {
    instanceId: `${id}:methodology-check`, contentPack: 'selected-six-methodology-review', seed: 42,
  });
  assertPublicTaskSafe(publicTask);
  let submitted;
  let wrong;
  if (typeof answer === 'number') {
    assert.equal(definition.type, 'decode');
    assert.equal(definition.answer.value, answer);
    assert.equal(decodeGroup(definition.payload.encoded, definition.payload.group).value, answer);
    submitted = answer;
    wrong = answer + 1;
  } else {
    assert.equal(definition.type, 'choice');
    assert.equal(definition.payload.options[definition.answer.value], answer);
    const option = publicTask.payload.options.find(item => item.label === answer);
    assert.ok(option);
    submitted = { choiceIndex: option.id };
    wrong = { choiceIndex: (option.id + 1) % publicTask.payload.options.length };
  }
  assert.equal(validateTaskAnswer(definition, validationContext, submitted).correct, true);
  assert.equal(validateTaskAnswer(definition, validationContext, wrong).correct, false);
  checks.push({ id, response: publicTask.response.kind, expectedAnswer: answer,
    codecReproduced: typeof answer === 'number', correctAccepted: true,
    wrongRejected: true, publicTaskSafe: true });
}

console.log(JSON.stringify({
  status: 'PASS', date: '2026-11-21', kind: 'selected-six-methodology-and-engine-check',
  sourceFile: file, sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  primarySource: 'https://meteoinfo.ru/images/media/books-docs/RHM/kn-01-synop.pdf',
  primarySourceEdition: '2013',
  sourceLocators: ['Таблица 1, печатные страницы 9–11', 'Кодовая таблица 3845, печатная страница 60'],
  checks,
  limitations: ['Not an independent second methodology review.', 'Not a browser, full service, or learner pilot test.', 'No approval of the remaining level-one pack or all method-profile rules.'],
}, null, 2));
