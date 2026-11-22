'use strict';
// Static TypeScript contracts only. This is not a browser or mounted-form test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../..');
const ts = require(path.join(repo, 'apps/web/node_modules/typescript'));
const base = '9ea0921ba476d9a2d4e19e81f60e35aca83cd13e';
const prefix = 'apps/web/src/features/shift/';
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const baseline = file => execFileSync('git', ['show', `${base}:${file}`], { cwd: repo, encoding: 'utf8' });
const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(root, predicate) {
  const result = [];
  function visit(node) { if (predicate(node)) result.push(node); ts.forEachChild(node, visit); }
  visit(root); return result;
}
const name = node => node.tagName?.getText();
const callText = (source, predicate) => find(source, node => ts.isCallExpression(node) && predicate(node)).map(node => node.getText(source));
const workspace = parse('ShiftWorkspace.tsx', read(prefix + 'ShiftWorkspace.tsx'));
const previous = parse('ShiftWorkspace.tsx', baseline(prefix + 'ShiftWorkspace.tsx'));
const flow = parse('SeamlessShiftFlow.tsx', read(prefix + 'SeamlessShiftFlow.tsx'));
const checks = [];
function check(label, callback) { callback(); checks.push({ label, status: 'PASS' }); }

check('one stable workspace is rendered immediately, without the handover gate or a changing key', () => {
  const mounts = find(flow, node => ts.isJsxSelfClosingElement(node) && name(node) === 'ShiftWorkspace');
  assert.equal(mounts.length, 1);
  assert.ok(ts.isJsxElement(mounts[0].parent));
  assert.equal(mounts[0].parent.openingElement.tagName.getText(), 'div');
  assert.ok(!mounts[0].attributes.properties.some(attribute => attribute.name?.getText() === 'key'));
  assert.ok(!flow.text.includes("phase === 'handover'"));
  assert.ok(!flow.text.includes('Принять смену'));
});
check('the optional note is a closed native disclosure outside the answer card', () => {
  const notes = find(workspace, node => ts.isJsxElement(node) && name(node.openingElement) === 'details' &&
    node.openingElement.attributes.properties.some(attribute => attribute.name?.getText() === 'className' && attribute.initializer?.getText().includes('shift-desk-note')));
  assert.equal(notes.length, 1);
  const note = notes[0];
  for (const attribute of note.openingElement.attributes.properties) assert.ok(!['open', 'key', 'onToggle', 'onClick'].includes(attribute.name?.getText()));
  assert.ok(ts.isJsxElement(note.parent));
  assert.equal(name(note.parent.openingElement), 'section');
  assert.ok(note.parent.children.some(node => ts.isJsxElement(node) && name(node.openingElement) === 'article'));
  assert.equal(find(note, node => ts.isJsxSelfClosingElement(node) && ['input', 'ShiftWorkspace'].includes(name(node))).length, 0);
  assert.ok(note.getText().includes('<summary>Записка Полины</summary>'));
});
check('startup effects, local input state and API calls are unchanged from the baseline', () => {
  const hooks = node => ['useEffect', 'useState', 'useRef', 'useMemo'].includes(node.expression.getText());
  assert.deepEqual(callText(workspace, hooks), callText(previous, hooks));
  const api = node => ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText() === 'api';
  assert.deepEqual(callText(workspace, api), callText(previous, api));
  assert.equal(callText(workspace, node => node.expression.getText() === 'api.startShift').length, 1);
  const inputs = source => find(source, node => ts.isJsxSelfClosingElement(node) && name(node) === 'input').map(node => node.getText());
  assert.deepEqual(inputs(workspace), inputs(previous));
});
check('answer, retry, help, advance and feedback handlers are byte-equivalent source expressions', () => {
  for (const identifier of ['acceptAnswerResult', 'submit', 'openReference', 'beginRetry', 'reveal', 'advance']) {
    const declaration = source => find(source, node => ts.isFunctionDeclaration(node) && node.name?.text === identifier)[0]?.getText();
    assert.ok(declaration(workspace), identifier);
    assert.equal(declaration(workspace), declaration(previous), identifier);
  }
});
check('identity, routing, server selection, grading and the ten-task pack were not changed', () => {
  for (const file of ['apps/web/src/App.tsx', 'apps/web/src/api.ts', 'apps/server/src/modules/identity/identityService.ts', 'apps/server/src/modules/shift/shiftService.ts', 'content/packs/core_ru_001.json']) {
    assert.equal(read(file), baseline(file), file);
  }
});
check('the note contains no unsourced weather report and keeps a 44px native target', () => {
  const lore = read(prefix + 'shiftLore.ts');
  const note = lore.slice(lore.indexOf('export const SHIFT_HANDOVER_NOTE'), lore.indexOf('export const SHIFT_DEBRIEF'));
  assert.ok(!/облач|барограф|ветер|погода|заряд/iu.test(note));
  assert.match(read(prefix + 'ShiftWorkspace.css'), /\.shift-desk-note > summary\s*\{[^}]*min-height:\s*44px/);
});

const report = {
  baseRevision: base,
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim(),
  kind: 'static-typescript-contracts', status: 'PASS', checks,
  limitations: ['No browser execution or screenshots.', 'Preservation of mounted DOM input, keyboard, scrolling and responsive appearance still requires the adapted browser scenarios.'],
};
fs.writeFileSync(path.join(__dirname, 'entry-flow-invariants.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
