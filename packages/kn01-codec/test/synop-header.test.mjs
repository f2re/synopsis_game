import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeSynopText, parseSynopHeader, SynopHeaderError } from '../src/synop-header.js';

test('разбирает минимальный заголовок AAXX и тело телеграммы', () => {
  const parsed = parseSynopHeader('AAXX 26061 26063 11560 82405 10124 20079 40162=');
  assert.equal(parsed.reportType, 'AAXX');
  assert.equal(parsed.day, 26);
  assert.equal(parsed.hourUtc, 6);
  assert.equal(parsed.windIndicator, 1);
  assert.equal(parsed.stationId, '26063');
  assert.deepEqual(parsed.bodyTokens.slice(0, 2), ['11560', '82405']);
  assert.equal(parsed.canonicalText.endsWith('='), false);
});

test('сохраняет бюллетенный префикс до AAXX и канонизирует пробелы', () => {
  const parsed = parseSynopHeader('SMRS01 RUMS 260600\r\nAAXX   26061   26063  11560=');
  assert.deepEqual(parsed.bulletinPrefix, ['SMRS01', 'RUMS', '260600']);
  assert.equal(parsed.stationId, '26063');
  assert.equal(parsed.canonicalText, 'SMRS01 RUMS 260600 AAXX 26061 26063 11560');
});

test('канонизация делает эквивалентными различия только в пробелах и терминаторе', () => {
  assert.equal(
    canonicalizeSynopText('AAXX 26061 26063 11560='),
    canonicalizeSynopText('  AAXX\n26061\t26063 11560  '),
  );
});

test('отклоняет повреждённый заголовок', () => {
  assert.throws(() => parseSynopHeader('AAXX 32601 26063 11560='), (error) => {
    assert.ok(error instanceof SynopHeaderError);
    assert.equal(error.code, 'invalid_day');
    return true;
  });
  assert.throws(() => parseSynopHeader('AAXX 26251 26063 11560='), /Недопустимый срок/);
  assert.throws(() => parseSynopHeader('AAXX 26061 ABCDE 11560='), /IIiii/);
});
