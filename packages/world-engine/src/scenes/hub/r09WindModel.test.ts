import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeWindBands, normalizeWindEnvironment, R09_WIND_LIMITS, sampleWindDisplacement, sampleWindField, StationWindClock, windSeed,
  type VegetationWindKind,
} from './r09WindModel.ts';

const normal = normalizeWindEnvironment();
const kinds: VegetationWindKind[] = ['tree', 'shrub', 'grass', 'reed', 'flag'];

test('Каждый исходный пиксель принадлежит ровно одной полосе; основание закреплено', () => {
  for (const kind of kinds) for (const [width, height] of [[35, 60], [32, 62], [512, 288], [1, 1], [3, 7]]) {
    const bands = makeWindBands(width, height, kind);
    assert.ok(bands.length <= R09_WIND_LIMITS.bandsPerPlacement);
    const coverage = new Uint8Array(width * height);
    for (const band of bands) for (let y = band.y; y < band.y + band.height; y++) for (let x = band.x; x < band.x + band.width; x++) coverage[y * width + x]++;
    assert.ok(coverage.every((count) => count === 1));
    const fixed = bands.filter((band) => band.freedom === 0);
    assert.equal(fixed.length, 1);
    if (kind === 'flag') assert.equal(fixed[0].x, 0);
    else assert.equal(fixed[0].y + fixed[0].height, height);
  }
  assert.throws(() => makeWindBands(0, 60, 'tree'));
  assert.throws(() => makeWindBands(35.5, 60, 'tree'));
  assert.throws(() => makeWindBands(35, 60, 'tree', .01));
});

test('Одинаковые исходные условия дают одинаковый ветер без глобальной случайности', () => {
  const sample = { id: 'station.birch.left', kind: 'tree' as const, sourceX: 20, sourceY: 210, sourceHeight: 60, freedom: 1 };
  for (let time = 0; time < 60_000; time += 100) {
    assert.deepEqual(sampleWindField(time, 20, 210), sampleWindField(time, 20, 210));
    assert.deepEqual(sampleWindDisplacement(time, sample, normal), sampleWindDisplacement(time, sample, normal));
  }
  assert.notEqual(windSeed(sample.id), windSeed('station.birch.right'));
  assert.notEqual(windSeed(sample.id, 26063), windSeed(sample.id, 26064));
});

test('Порыв меняется во времени и имеет непрерывное пространственное запаздывание', () => {
  const fields = [0, 1500, 6000, 13000, 24000].map((time) => sampleWindField(time, 10, 180).gust);
  assert.ok(new Set(fields).size > 3);
  for (let time = 0; time < 30_000; time += 500) {
    const near = sampleWindField(time, 10.1, 180).gust;
    assert.ok(Math.abs(near - sampleWindField(time, 10, 180).gust) < .005);
  }
  assert.notEqual(sampleWindField(6000, 10, 180).gust, sampleWindField(6000, 400, 180).gust);
});

test('Смещения целочисленны и ограничены, корни неподвижны даже при сильном порыве', () => {
  let changed = false;
  for (const kind of kinds) for (let time = 0; time < 100_000; time += 117) for (const freedom of [0, .2, .6, 1]) {
    const actor = { id: `plant.${kind}`, kind, sourceX: 370, sourceY: 240, sourceHeight: 140, freedom, gain: 1.5 };
    const pose = sampleWindDisplacement(time, actor, { ...normal, weather: 'rain' });
    assert.ok(Number.isInteger(pose.x) && Number.isInteger(pose.y));
    assert.ok(Math.abs(pose.x) <= 4 && Math.abs(pose.y) <= 4);
    if (freedom === 0) assert.deepEqual(pose, { x: 0, y: 0 });
    if (kind === 'flag') assert.equal(pose.x, 0); else assert.equal(pose.y, 0);
    if (pose.x || pose.y) changed = true;
  }
  assert.ok(changed);
});

test('Уменьшенное движение возвращает точный исходный кадр', () => {
  for (const kind of kinds) for (const time of [0, 100, 7000, 86_400_000]) {
    assert.deepEqual(sampleWindDisplacement(time, { id: 'plant', kind, sourceX: 20, sourceY: 200, sourceHeight: 180, freedom: 1 }, { ...normal, reducedMotion: true }), { x: 0, y: 0 });
  }
});

test('10 Гц и 5 Гц ограничивают смену позы при разной частоте рендера', () => {
  for (const lowPower of [false, true]) {
    for (const step of [10, 20, 25, 50, 1000 / 60]) {
      const clock = new StationWindClock();
      for (let index = 0; index < Math.round(10_000 / step); index++) clock.advance(step, { ...normal, lowPower });
      assert.ok(Math.abs(clock.timeMs - 10_000) < .00001);
      assert.equal(clock.paintFrames, lowPower ? 50 : 100);
    }
  }
});

test('Скрытие, остановка и испорченный delta не продвигают часы; возвращение ограничено', () => {
  const clock = new StationWindClock();
  clock.advance(100, normal);
  for (let index = 0; index < 1000; index++) {
    assert.equal(clock.advance(100, { ...normal, paused: true }), false);
    assert.equal(clock.advance(100, { ...normal, reducedMotion: true }), false);
  }
  for (const delta of [NaN, Infinity, -1, 0]) assert.equal(clock.advance(delta, normal), false);
  assert.equal(clock.timeMs, 100);
  clock.advance(60_000, normal);
  assert.equal(clock.timeMs, 200);
  assert.equal(clock.paintFrames, 2);
});

test('Профиль экономии уменьшает частоту, сохраняя ту же фазу ветра', () => {
  const normalClock = new StationWindClock(), lowClock = new StationWindClock();
  for (let index = 0; index < 900; index++) {
    normalClock.advance(1000 / 30, normal);
    lowClock.advance(1000 / 30, { ...normal, lowPower: true });
  }
  assert.equal(normalClock.timeMs, lowClock.timeMs);
  assert.equal(normalClock.paintFrames, lowClock.paintFrames * 2);
  const actor = { id: 'birch', kind: 'tree' as const, sourceX: 20, sourceY: 210, sourceHeight: 60, freedom: 1 };
  assert.deepEqual(sampleWindDisplacement(normalClock.timeMs, actor, normal), sampleWindDisplacement(lowClock.timeMs, actor, { ...normal, lowPower: true }));
});
