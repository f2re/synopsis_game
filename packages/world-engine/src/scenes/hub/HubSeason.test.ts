import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEASONS_ORDER,
  SEASON_PROFILES,
  calculateSeason,
  isSeason,
  nextSeason,
  seasonForMonth,
} from './HubSeason.ts';
import {
  HUB_STAGES,
  buildingStatesFromStages,
  computeStageStatuses,
} from './hubStages.ts';

const SPB = { timezone: 'Europe/Moscow' };

test('сезоны по месяцам: границы года', () => {
  assert.equal(seasonForMonth(11), 'winter');
  assert.equal(seasonForMonth(0), 'winter');
  assert.equal(seasonForMonth(1), 'winter');
  assert.equal(seasonForMonth(2), 'spring');
  assert.equal(seasonForMonth(4), 'spring');
  assert.equal(seasonForMonth(5), 'summer');
  assert.equal(seasonForMonth(7), 'summer');
  assert.equal(seasonForMonth(8), 'autumn');
  assert.equal(seasonForMonth(10), 'autumn');
});

test('сезон считается в часовом поясе станции', () => {
  // 31 мая 21:30 UTC — в Москве уже 1 июня, лето
  assert.equal(calculateSeason(new Date('2026-05-31T21:30:00Z'), SPB), 'summer');
  assert.equal(calculateSeason(new Date('2026-10-27T12:00:00Z'), SPB), 'autumn');
  assert.equal(calculateSeason(new Date('2026-12-31T22:00:00Z'), SPB), 'winter');
});

test('цикл сезонов замкнут и профили полны', () => {
  let s = SEASONS_ORDER[0];
  for (let i = 0; i < SEASONS_ORDER.length; i++) s = nextSeason(s);
  assert.equal(s, SEASONS_ORDER[0]);
  for (const id of SEASONS_ORDER) {
    assert.equal(SEASON_PROFILES[id].id, id);
    assert.ok(isSeason(id));
  }
  assert.equal(isSeason('monsoon'), false);
  assert.equal(SEASON_PROFILES.winter.roofSnow, true);
  assert.equal(SEASON_PROFILES.summer.snowCover, 0);
});

test('этапы: старт — только КН-01 текущий, остальное закрыто', () => {
  const st = computeStageStatuses([]);
  assert.equal(st.kn01, 'current');
  assert.equal(st.archive, 'locked');
  assert.equal(st.aerology, 'locked');
});

test('этапы: после КН-01 открываются архив и картография, текущий — один', () => {
  const st = computeStageStatuses(['kn01']);
  assert.equal(st.kn01, 'completed');
  assert.equal(st.archive, 'current');
  assert.equal(st.cartography, 'available');
  assert.equal(st.duel, 'locked');
  assert.equal(Object.values(st).filter((v) => v === 'current').length, 1);
});

test('этапы: цепочка до аэрологии и состояния зданий', () => {
  const all = HUB_STAGES.map((s) => s.id);
  const st = computeStageStatuses(all.slice(0, -1));
  assert.equal(st.aerology, 'current');
  const buildings = buildingStatesFromStages(st);
  assert.equal(buildings.lab, 'active');
  assert.equal(buildings.codepost, 'available');
  assert.equal(buildings.radar, 'available');
  assert.equal(Object.keys(buildings).length, HUB_STAGES.length);
});

test('этапы: порядок уникален, requires ссылаются на существующие этапы', () => {
  const ids = new Set(HUB_STAGES.map((s) => s.id));
  assert.equal(new Set(HUB_STAGES.map((s) => s.order)).size, HUB_STAGES.length);
  for (const s of HUB_STAGES) for (const r of s.requires) assert.ok(ids.has(r), `${s.id} → ${r}`);
});
