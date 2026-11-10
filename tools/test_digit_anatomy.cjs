#!/usr/bin/env node
/** Feedback must display server-resolved station pressure without guessing omitted digits. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/web/node_modules/typescript');
const React = require('../apps/web/node_modules/react');
const jsxRuntime = require('../apps/web/node_modules/react/jsx-runtime');
const { renderToStaticMarkup } = require('../apps/web/node_modules/react-dom/server');

const repo = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repo, 'apps/web/src/features/shift/feedback/DigitAnatomy.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)((id) => {
  if (id === 'react') return React;
  if (id === 'react/jsx-runtime') return jsxRuntime;
  throw new Error(`Unexpected DigitAnatomy import: ${id}`);
}, loaded, loaded.exports);
const { parseGroupAnatomy, DigitAnatomy } = loaded.exports;

const tasks = JSON.parse(fs.readFileSync(path.join(repo, 'content/tasks/core_tasks.json'), 'utf8')).tasks;
const fixture = tasks.find((task) => task.id === 'kn01_station_pressure_001');
assert.equal(fixture.payload.encoded, '30218');
assert.equal(fixture.answer.value, 1021.8);
const resolved = parseGroupAnatomy(fixture.payload.encoded, fixture.payload.group, fixture.answer.value);
assert.equal(resolved[1].digits, '0218', 'The original coded digits remain visible');
assert.equal(resolved[1].decodedValue, '1021.8 гПа', 'Display the canonical answer from the task');
assert.equal(parseGroupAnatomy('38000', '3PoPoPoPo', 800)[1].decodedValue, '800.0 гПа', 'Do not add 1000 to a supplied high-altitude value');
for (const value of [undefined, NaN, Infinity, -Infinity]) {
  assert.equal(parseGroupAnatomy('30218', '3PoPoPoPo', value)[1].decodedValue, 'Расшифровка недоступна', 'Missing or non-finite server values must not become truncated pressure');
}

const html = renderToStaticMarkup(React.createElement(DigitAnatomy, {
  codeGroup: fixture.payload.encoded,
  groupType: fixture.payload.group,
  resolvedValue: fixture.answer.value,
}));
assert(html.includes('1021.8 гПа'), 'The component passes the resolved value to its parser');
const fallbackHtml = renderToStaticMarkup(React.createElement(DigitAnatomy, { codeGroup: '30218', groupType: '3PoPoPoPo' }));
assert(fallbackHtml.includes('Расшифровка недоступна'));
assert(!fallbackHtml.includes('21.8 гПа'));
assert.equal(parseGroupAnatomy('10234', '1snTTT', 999)[2].decodedValue, '+23.4 °C', 'Other group decoding stays unchanged');
console.log('PASS: canonical station pressure, supplied high-altitude value, unavailable/non-finite fallback, component binding and unchanged temperature group.');
