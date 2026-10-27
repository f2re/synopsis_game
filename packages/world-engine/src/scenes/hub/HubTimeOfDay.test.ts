import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HubTimeOfDay,
  STATION_26063_LOCATION,
  PHASE_COLOR_MAP,
  PHASES_ORDER,
} from './HubTimeOfDay.ts';

test('1. HubTimeOfDay инициализируется фазой из реального времени', () => {
  const tod = new HubTimeOfDay(STATION_26063_LOCATION);
  const phase = tod.getCurrentPhase();
  assert.ok(PHASES_ORDER.includes(phase), `Фаза ${phase} должна быть допустимой`);
  assert.equal(tod.isDemoMode(), false, 'Демо-режим должен быть выключен по умолчанию');
});

test('2. Расчёт фаз суток для Санкт-Петербурга по астрономическому времени', () => {
  const tod = new HubTimeOfDay(STATION_26063_LOCATION);

  // Ночь: 02:00 в октябре (зима/осень)
  const dateNight = new Date('2026-10-27T02:00:00+03:00');
  assert.equal(tod.calculateSolarPhase(dateNight), 'night');

  // Рассвет: 06:30
  const dateDawn = new Date('2026-10-27T06:30:00+03:00');
  assert.equal(tod.calculateSolarPhase(dateDawn), 'dawn');

  // День: 14:00
  const dateDay = new Date('2026-10-27T14:00:00+03:00');
  assert.equal(tod.calculateSolarPhase(dateDay), 'day');

  // Золотой час: 19:30
  const dateGold = new Date('2026-10-27T19:30:00+03:00');
  assert.equal(tod.calculateSolarPhase(dateGold), 'golden_hour');

  // Сумерки: 22:00
  const dateTwilight = new Date('2026-10-27T22:00:00+03:00');
  assert.equal(tod.calculateSolarPhase(dateTwilight), 'twilight');

  // Белые ночи: 01:00 в июне (месяц 5)
  const dateWhiteNights = new Date('2026-06-21T01:00:00+03:00');
  assert.equal(tod.calculateSolarPhase(dateWhiteNights), 'white_nights');
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
