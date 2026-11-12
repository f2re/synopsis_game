/* Keyboard contract for the shared radio-choice handler. This is not a browser
 * rendering test; it checks selection/focus ownership and native key exclusions. */
'use strict';
const assert = require('node:assert/strict');
const { load, Runner, nodes } = require('./ui_test_harness.cjs');
const { handleRadioGroupKeyDown } = load('apps/web/src/features/ui/radioGroupKeys.ts');

let selected = -1, focused = -1, prevented = 0;
const group = { querySelectorAll() { return buttons; } };
const buttons = Array.from({ length: 4 }, (_, index) => ({
  disabled: false, hidden: false, ariaDisabled: false,
  closest(selector) { return selector === '[role="radiogroup"]' ? group : this; },
  getAttribute(name) { return name === 'aria-disabled' && this.ariaDisabled ? 'true' : null; },
  focus() { focused = index; },
  click() { selected = index; },
}));
function key(index, name, options = {}) {
  const event = { target: buttons[index], currentTarget: group, key: name, defaultPrevented: false,
    altKey: false, ctrlKey: false, metaKey: false, preventDefault() { prevented++; }, ...options };
  handleRadioGroupKeyDown(event);
}

key(0, 'ArrowLeft'); assert.equal(selected, 3); assert.equal(focused, 3);
key(3, 'ArrowRight'); assert.equal(selected, 0); assert.equal(focused, 0);
key(0, 'ArrowDown'); assert.equal(selected, 1);
key(1, 'ArrowUp'); assert.equal(selected, 0);
key(0, 'End'); assert.equal(selected, 3);
key(3, 'Home'); assert.equal(selected, 0);
buttons[1].disabled = true;
key(0, 'ArrowRight'); assert.equal(selected, 2, 'Disabled option is skipped');
buttons[2].ariaDisabled = true;
key(0, 'ArrowDown'); assert.equal(selected, 3, 'ARIA-disabled option is skipped');
buttons[3].hidden = true;
key(0, 'ArrowDown'); assert.equal(selected, 0, 'Hidden option is skipped');
const before = prevented;
key(0, 'ArrowRight', { ctrlKey: true });
key(0, 'ArrowRight', { altKey: true });
key(0, 'ArrowRight', { metaKey: true });
key(0, 'Tab'); key(0, ' '); key(0, 'Enter');
assert.equal(prevented, before, 'Tab, native activation and browser shortcuts retain their defaults');
key(0, 'End', { currentTarget: { querySelectorAll() { throw new Error('Outer group must not handle an inner group'); } } });
assert.equal(prevented, before);
buttons.forEach(button => { button.disabled = true; });
key(0, 'ArrowRight'); assert.equal(prevented, before, 'Pending answer cannot be changed');

const blitz = load('apps/web/src/features/shift/BlitzWorkspace.tsx', {
  '../../api': {}, '../../brand': { GAME_MARK: '26063' },
  '../avatar/SavedAvatarPortrait': {}, '../ui': {},
  '../ui/radioGroupKeys': { handleRadioGroupKeyDown },
  './StationPlotTask': {}, './ShiftWorkspace.css': {}, './BlitzWorkspace.css': {},
}, {}, '\nexports.testQuestion = BlitzQuestion;');
const task = { instanceId: 'keyboard-contract', question: 'Выберите вариант', response: { kind: 'choice' },
  payload: { options: [{ id: 4, label: 'Первый' }, { id: 8, label: 'Второй' }, { id: 12, label: 'Третий' }] } };
const runner = new Runner(blitz.testQuestion, { task, disabled: false, onSubmit() {} });
const choices = () => nodes(runner.output).filter(node => node.props?.role === 'radio');
assert.deepEqual(choices().map(node => node.props.tabIndex), [0, -1, -1], 'One entry into an unanswered group');
choices()[2].props.onClick(); runner.render();
assert.deepEqual(choices().map(node => node.props.tabIndex), [-1, -1, 0], 'Selected choice owns the Tab stop, even with nonconsecutive IDs');
assert.deepEqual(choices().map(node => node.props['aria-checked']), [false, false, true]);
runner.render({ disabled: true });
assert.ok(choices().every(node => node.props.disabled && node.props.tabIndex === -1));
runner.unmount();
console.log('PASS: radio-choice arrows, Home/End, wrapping, disabled/hidden/nested-group exclusion, native Tab/Space/Enter, one active Tab stop and pending-answer lock.');
