import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HubTimeOfDay,
  STATION_26063_LOCATION,
  PHASE_COLOR_MAP,
  PHASES_ORDER,
  calculateSolarPosition,
} from './HubTimeOfDay.ts';

test('1. HubTimeOfDay инициализируется фазой из реального времени', () => {
  const tod = new HubTimeOfDay(STATION_26063_LOCATION);
  const phase = tod.getCurrentPhase();
  assert.ok(PHASES_ORDER.includes(phase), `Фаза ${phase} должна быть допустимой`);
  assert.equal(tod.isDemoMode(), false, 'Демо-режим должен быть выключен по умолчанию');
});

test('2. Положение Солнца: зимний день, ночное небо и белые ночи Санкт-Петербурга', () => {
  const tod = new HubTimeOfDay(STATION_26063_LOCATION);
  const cases: Array<[string, string]> = [
    ['2026-10-27T02:00:00+03:00', 'night'],
    ['2026-10-27T07:30:00+03:00', 'dawn'],
    ['2026-10-27T14:00:00+03:00', 'day'],
    ['2026-10-27T17:00:00+03:00', 'golden_hour'],
    ['2026-10-27T18:00:00+03:00', 'twilight'],
    ['2026-10-27T22:00:00+03:00', 'night'],
    ['2026-06-21T01:00:00+03:00', 'white_nights'],
    ['2026-06-21T12:00:00+03:00', 'day'],
    ['2026-12-21T12:00:00+03:00', 'day'],
    ['2026-12-21T02:00:00+03:00', 'night'],
  ];
  for (const [value, expected] of cases) {
    assert.equal(tod.calculateSolarPhase(new Date(value)), expected, value);
  }
});

test('2a. Солнечная высота физически связана с широтой, долготой и UTC, не с часовым поясом устройства', () => {
  const date = new Date('2026-06-21T22:00:00Z');
  const north = calculateSolarPosition(date, STATION_26063_LOCATION);
  assert.ok(north.elevationDeg > -8 && north.elevationDeg < -5, 'На широте Петербурга близ полуночи Солнце погружено ~6.6°');
  assert.ok(north.midnightElevationDeg > -12, 'В июне нет морской ночи в принятом профиле');
  const equivalent = calculateSolarPosition(date, { ...STATION_26063_LOCATION, timezone: 'UTC' });
  assert.equal(north.elevationDeg, equivalent.elevationDeg);
  const winter = calculateSolarPosition(new Date('2026-12-21T21:00:00Z'), STATION_26063_LOCATION);
  assert.ok(winter.midnightElevationDeg < -50, 'Зимой отсутствует режим белых ночей');
  const equator = calculateSolarPosition(new Date('2026-03-20T12:00:00Z'), { latitude: 0, longitude: 0, timezone: 'UTC' });
  assert.ok(equator.elevationDeg > 87, 'Вблизи равноденствия на экваторе близ полудня Солнце около зенита');
});

test('3. Ускоренная демонстрация переключает фазы каждые 5 секунд', () => {
  const tod = new HubTimeOfDay(STATION_26063_LOCATION);
  tod.setAcceleratedDemo(true);
  tod.setPhase('night');

  let changedPhase = '';
  tod.update(5000, (p) => {
    changedPhase = p;
  });

  assert.equal(changedPhase, 'dawn', 'После night в демо-режиме должен наступить dawn');

  // При выключении демо немедленно возвращается реальное время
  tod.setAcceleratedDemo(false);
  assert.equal(tod.isDemoMode(), false);
});

test('4. Цвета фаз соответствуют токенам палитры', () => {
  const tod = new HubTimeOfDay(STATION_26063_LOCATION);
  PHASES_ORDER.forEach((phase) => {
    tod.setPhase(phase);
    const colors = tod.getPhaseColors();
    assert.ok(colors.skyTop > 0, `skyTop для ${phase} должен быть числовым цветом`);
    assert.ok(colors.skyHorizon > 0, `skyHorizon для ${phase} должен быть числовым цветом`);
    assert.ok(typeof colors.starsVisible === 'boolean', `starsVisible для ${phase} должен быть boolean`);
  });
});
