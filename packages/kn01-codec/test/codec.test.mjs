import test from 'node:test';
import assert from 'node:assert/strict';
import { KN01_RULESET_ID, decodeGroup, encodeGroup, parseTelegram } from '../src/index.js';

test('дешифрирует температуру и точку росы из стартового пакета', () => {
  assert.equal(decodeGroup('10234', '1snTTT', KN01_RULESET_ID).value, 23.4);
  assert.equal(decodeGroup('21052', '2snTdTdTd', KN01_RULESET_ID).value, -5.2);
});

test('восстанавливает давление станции из сокращённой записи', () => {
  assert.equal(decodeGroup('30218', '3PoPoPoPo', KN01_RULESET_ID).value, 1021.8);
  assert.equal(decodeGroup('39999', '3PoPoPoPo', KN01_RULESET_ID).value, 999.9);
});

test('дешифрирует пример барической тенденции 57103', () => {
  const decoded = decodeGroup('57103', '5appp', KN01_RULESET_ID);
  assert.equal(decoded.value.characteristic, 7);
  assert.equal(decoded.value.pressureChangeHpa, -10.3);
  assert.equal(decoded.value.periodHours, 3);
});

test('поддерживает обратное преобразование для базовых числовых групп', () => {
  for (const [group, value] of [['1snTTT', -12.7], ['2snTdTdTd', 3.4], ['3PoPoPoPo', 1013.4]]) {
    const encoded = encodeGroup(group, value, KN01_RULESET_ID);
    assert.equal(decodeGroup(encoded, group, KN01_RULESET_ID).value, value);
  }
});

test('разбирает поддерживаемые группы телеграммы и снимает завершающий знак', () => {
  const parsed = parseTelegram('AAXX 26121 10234 21052 30218 57103=', KN01_RULESET_ID);
  assert.equal(parsed.groups.length, 4);
  assert.equal(parsed.groups.at(-1)?.encoded, '57103');
  assert.deepEqual(parsed.unparsed, ['AAXX', '26121']);
});
