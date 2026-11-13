import test from 'node:test';
import assert from 'node:assert/strict';
import { getR01PhaseStyle, normalizeR01Weather, r01RainDrop, R01_RAIN_DROP_LIMIT } from './r01Environment.ts';
import { getR01Layout } from './r01Layout.ts';

test('Солнце в фоне остаётся только в ясном золотом часе', () => {
  for (const phase of ['day', 'dawn', 'night', 'twilight', 'white_nights'] as const) {
    assert.equal(getR01PhaseStyle(phase, 'clear').sunset, false);
  }
  assert.equal(getR01PhaseStyle('golden_hour', 'clear').sunset, true);
  assert.equal(getR01PhaseStyle('golden_hour', 'rain').sunset, false);
  assert.notEqual(getR01PhaseStyle('day', 'clear').skyTint, getR01PhaseStyle('night', 'clear').skyTint);
});

test('Отсутствующий или неверный снимок погоды не включает движение', () => {
  for (const value of [undefined, null, 'rain', { mode: 'rain' }, { mode: 'rain', animate: 'true' }, { mode: 'snow', animate: true }]) {
    assert.equal(normalizeR01Weather(value).animate, false);
  }
  assert.deepEqual(normalizeR01Weather({ mode: 'rain', animate: true }), { mode: 'rain', animate: true });
});

test('Поле дождя ограничено, детерминировано и остаётся внутри видимой области', () => {
  for (const [width, height] of [[960, 540], [480, 1040], [1300, 620]]) {
    for (const time of [0, 83, 10000, 86400000]) {
      for (let i = 0; i < R01_RAIN_DROP_LIMIT; i++) {
        const drop = r01RainDrop(i, time, width, height);
        assert.deepEqual(drop, r01RainDrop(i, time, width, height));
        assert.ok(drop.x >= 0 && drop.x <= width && drop.y >= 0 && drop.y <= height);
        assert.ok(drop.length >= 4 && drop.length <= 8);
      }
    }
  }
});

test('Входы нижнего ряда на коротком экране находятся выше нижней панели', () => {
  for (const [width, height] of [[844, 390], [960, 540], [667, 375]]) {
    const layout = getR01Layout(width, height);
    for (const building of layout.buildings) {
      const foot = height / 2 + (building.y + building.height - layout.height / 2) * layout.zoom;
      assert.ok(foot <= height - 68 - 8 + .01, `${width}×${height}: ${building.id}`);
    }
  }
});
