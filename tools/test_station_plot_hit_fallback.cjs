/* Real StationPlotTask handlers with geometry/event doubles. This checks the
 * routing contract; native SVG hit testing remains a separate browser gate. */
'use strict';
const assert = require('node:assert/strict');
const { load, nodes } = require('./ui_test_harness.cjs');
const react = {
  useLayoutEffect() {}, useMemo: fn => fn(), useRef: value => ({ current: value }),
  useState: value => [typeof value === 'function' ? value() : value, () => {}],
};
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
  matrixTransform(m) { return new Point(m.a * this.x + m.c * this.y + m.e, m.b * this.x + m.d * this.y + m.f); }
}
const { StationPlotTask } = load('apps/web/src/features/shift/StationPlotTask.tsx', {
  react, './StationPlotTask.css': {}, './stationPositionLabel': { stationPositionLabel: (x, y) => `${x}, ${y}` },
}, { DOMPoint: Point });
const payload = {
  observations: [{ id: 't', label: 'Температура', value: '+5' }, { id: 'p', label: 'Давление', value: '1010' }],
  slots: [{ id: 'top-left', x: 300, y: 300, kind: 'value' }, { id: 'top-right', x: 700, y: 300, kind: 'value' }],
};
const matrix = {
  a: .46951666474342346, d: .46951666474342346, b: 0, c: 0, e: 803.4833374023438, f: 541.4833374023438,
  inverse() { return { a: 1 / this.a, d: 1 / this.d, b: 0, c: 0, e: -this.e / this.a, f: -this.f / this.d }; },
};
function fixture({ disabled = false, observations = payload.observations } = {}) {
  const calls = [], focus = [], localPoints = [];
  const output = StationPlotTask({ payload: { ...payload, observations }, placements: { p: 'top-left' }, disabled,
    onChange: value => calls.push(JSON.parse(JSON.stringify(value))) });
  const svgElement = nodes(output).find(node => node.type === 'svg');
  const group = nodes(output).find(node => node.props?.role === 'button');
  const target = {
    getScreenCTM: () => matrix,
    isPointInFill(point) { localPoints.push(point); return point.x >= 183 && point.x <= 417 && point.y >= 243 && point.y <= 357; },
    getAttribute: name => name === 'data-slot-id' ? 'top-left' : null,
    closest: () => ({ focus: options => focus.push(options) }),
  };
  const svg = { querySelectorAll: () => [target] };
  const event = { currentTarget: svg, target: svg, clientX: 944.3416976928711, clientY: 708.6166534423828 };
  return { calls, focus, localPoints, target, svg, event, click: svgElement.props.onClick, group };
}
{
  const f = fixture(); f.click(f.event);
  assert.deepEqual(f.calls, [{ t: 'top-left' }], 'A unique exact-fill root click replaces the previous observation');
  assert.equal(f.localPoints.length, 1);
  assert.ok(Math.abs(f.localPoints[0].x - 300.0072524) < .0001 && Math.abs(f.localPoints[0].y - 355.9689178) < .0001, 'Native client coordinates are inverted through the target CTM');
  assert.deepEqual(JSON.parse(JSON.stringify(f.focus)), [{ preventScroll: true }], 'The matched group receives focus without moving the viewport');
}
for (const mode of ['disabled', 'no-selection', 'gap', 'ambiguous', 'unknown-slot', 'no-matrix']) {
  const f = fixture(mode === 'disabled' ? { disabled: true } : mode === 'no-selection' ? { observations: [] } : {});
  if (mode === 'gap') f.event.clientX = 850;
  if (mode === 'ambiguous') f.svg.querySelectorAll = () => [f.target, { ...f.target }];
  if (mode === 'unknown-slot') f.target.getAttribute = () => 'not-in-payload';
  if (mode === 'no-matrix') f.target.getScreenCTM = () => null;
  f.click(f.event);
  assert.deepEqual(f.calls, [], `${mode} cannot assign an observation`);
  assert.deepEqual(f.focus, [], `${mode} cannot move focus`);
}
{
  const f = fixture();
  f.group.props.onClick(); f.click({ ...f.event, target: f.target });
  assert.equal(f.calls.length, 1, 'A native group click is not assigned again when it bubbles to the SVG');
  let prevented = 0;
  f.group.props.onKeyDown({ key: ' ', preventDefault() { prevented++; } });
  assert.equal(prevented, 1); assert.equal(f.calls.length, 2, 'Existing Space activation stays on the native group handler');
}
console.log('station plot exact-fill fallback: PASS (handler routing only; browser gate is separate)');
