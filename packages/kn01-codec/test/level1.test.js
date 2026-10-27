import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KN01_RULESET_ID,
  decodeGroup,
  encodeGroup,
  parseGroup,
  validateGroup,
  parseTelegram,
} from '../src/index.js';

test('Фикстуры Раздел А: Температура и точка росы (1snTTT, 2snTdTdTd)', () => {
  // 1. 10234 -> +23.4 °C
  assert.equal(decodeGroup('10234', '1snTTT').value, 23.4);
  assert.equal(encodeGroup('1snTTT', 23.4), '10234');

  // 2. 10000 -> 0.0 °C
  assert.equal(decodeGroup('10000', '1snTTT').value, 0.0);
  assert.equal(encodeGroup('1snTTT', 0.0), '10000');

  // 3. 11005 -> -0.5 °C
  assert.equal(decodeGroup('11005', '1snTTT').value, -0.5);
  assert.equal(encodeGroup('1snTTT', -0.5), '11005');

  // 4. 11128 -> -12.8 °C
  assert.equal(decodeGroup('11128', '1snTTT').value, -12.8);
  assert.equal(encodeGroup('1snTTT', -12.8), '11128');

  // 5. 10385 -> +38.5 °C
  assert.equal(decodeGroup('10385', '1snTTT').value, 38.5);
  assert.equal(encodeGroup('1snTTT', 38.5), '10385');

  // 6. 20182 -> +18.2 °C
  assert.equal(decodeGroup('20182', '2snTdTdTd').value, 18.2);
  assert.equal(encodeGroup('2snTdTdTd', 18.2), '20182');

  // 7. 20000 -> 0.0 °C
  assert.equal(decodeGroup('20000', '2snTdTdTd').value, 0.0);
  assert.equal(encodeGroup('2snTdTdTd', 0.0), '20000');

  // 8. 21014 -> -1.4 °C
  assert.equal(decodeGroup('21014', '2snTdTdTd').value, -1.4);
  assert.equal(encodeGroup('2snTdTdTd', -1.4), '21014');

  // 9. 21246 -> -24.6 °C
  assert.equal(decodeGroup('21246', '2snTdTdTd').value, -24.6);
  assert.equal(encodeGroup('2snTdTdTd', -24.6), '21246');

  // 10. 11052 21084 -> T = -5.2 °C, Td = -8.4 °C (валидно, Td <= T)
  const decT = decodeGroup('11052', '1snTTT').value;
  const decTd = decodeGroup('21084', '2snTdTdTd').value;
  assert.equal(decT, -5.2);
  assert.equal(decTd, -8.4);
  assert.ok(decTd <= decT);
});

test('Фикстуры Раздел Б: Давление и тенденция (3PoPoPoPo, 4PPPP, 5appp)', () => {
  // 11. 30132 -> 1013.2 гПа
  assert.equal(decodeGroup('30132', '3PoPoPoPo').value, 1013.2);
  assert.equal(encodeGroup('3PoPoPoPo', 1013.2), '30132');

  // 12. 39856 -> 985.6 гПа
  assert.equal(decodeGroup('39856', '3PoPoPoPo').value, 985.6);
  assert.equal(encodeGroup('3PoPoPoPo', 985.6), '39856');

  // 13. 30000 -> 1000.0 гПа
  assert.equal(decodeGroup('30000', '3PoPoPoPo').value, 1000.0);
  assert.equal(encodeGroup('3PoPoPoPo', 1000.0), '30000');

  // 14. 40132 -> 1013.2 гПа (PPP=013 < 500)
  assert.equal(decodeGroup('40132', '4PPPP').value, 1013.2);
  assert.equal(encodeGroup('4PPPP', 1013.2), '40132');

  // 15. 40058 -> 1005.8 гПа (PPP=005 < 500)
  assert.equal(decodeGroup('40058', '4PPPP').value, 1005.8);
  assert.equal(encodeGroup('4PPPP', 1005.8), '40058');

  // 16. 49874 -> 987.4 гПа (PPP=987 >= 500)
  assert.equal(decodeGroup('49874', '4PPPP').value, 987.4);
  assert.equal(encodeGroup('4PPPP', 987.4), '49874');

  // 17. 40412 -> 1041.2 гПа (PPP=041 < 500)
  assert.equal(decodeGroup('40412', '4PPPP').value, 1041.2);
  assert.equal(encodeGroup('4PPPP', 1041.2), '40412');

  // 18. 52015 -> a=2, deltaP=+1.5 гПа
  const dec52015 = decodeGroup('52015', '5appp');
  assert.deepEqual(dec52015.value, { characteristic: 2, pressureChangeHpa: 1.5, periodHours: 3 });
  assert.equal(encodeGroup('5appp', { characteristic: 2, pressureChangeHpa: 1.5 }), '52015');

  // 19. 57028 -> a=7, deltaP=-2.8 гПа
  const dec57028 = decodeGroup('57028', '5appp');
  assert.deepEqual(dec57028.value, { characteristic: 7, pressureChangeHpa: -2.8, periodHours: 3 });
  assert.equal(encodeGroup('5appp', { characteristic: 7, pressureChangeHpa: -2.8 }), '57028');

  // 20. 54000 -> a=4, deltaP=0.0 гПа
  const dec54000 = decodeGroup('54000', '5appp');
  assert.deepEqual(dec54000.value, { characteristic: 4, pressureChangeHpa: 0.0, periodHours: 3 });
  assert.equal(encodeGroup('5appp', { characteristic: 4, pressureChangeHpa: 0.0 }), '54000');

  // 21. 51004 -> a=1, deltaP=+0.4 гПа
  const dec51004 = decodeGroup('51004', '5appp');
  assert.deepEqual(dec51004.value, { characteristic: 1, pressureChangeHpa: 0.4, periodHours: 3 });
  assert.equal(encodeGroup('5appp', { characteristic: 1, pressureChangeHpa: 0.4 }), '51004');

  // 22. 58032 -> a=8, deltaP=-3.2 гПа
  const dec58032 = decodeGroup('58032', '5appp');
  assert.deepEqual(dec58032.value, { characteristic: 8, pressureChangeHpa: -3.2, periodHours: 3 });
  assert.equal(encodeGroup('5appp', { characteristic: 8, pressureChangeHpa: -3.2 }), '58032');
});

test('Фикстуры Раздел В: Ветер, облачность и идентификаторы (AAXX, YYGGiw, IIiii, Nddff, 00fff)', () => {
  // 23. AAXX 26121 26063
  const aaxx = decodeGroup('AAXX', 'AAXX');
  assert.deepEqual(aaxx.value, { type: 'synop_land_station' });
  assert.equal(encodeGroup('AAXX', {}), 'AAXX');

  const yygiiw = decodeGroup('26121', 'YYGGiw');
  assert.deepEqual(yygiiw.value, {
    day: 26,
    hourUtc: 12,
    windIndicator: 1,
    windUnit: 'm/s',
    windSource: 'anemometer',
  });
  assert.equal(encodeGroup('YYGGiw', { day: 26, hourUtc: 12, windIndicator: 1 }), '26121');

  const iiiii = decodeGroup('26063', 'IIiii');
  assert.deepEqual(iiiii.value, {
    block: '26',
    stationNumber: '063',
    stationId: '26063',
  });
  assert.equal(encodeGroup('IIiii', { block: '26', stationNumber: '063' }), '26063');

  // 24. AAXX 05004 26063 (iw = 4 -> knots, anemometer)
  const yygiiw4 = decodeGroup('05004', 'YYGGiw');
  assert.deepEqual(yygiiw4.value, {
    day: 5,
    hourUtc: 0,
    windIndicator: 4,
    windUnit: 'knots',
    windSource: 'anemometer',
  });

  // 25. 00000 -> N=0, dd=00, ff=00 (calm)
  const decCalm = decodeGroup('00000', 'Nddff');
  assert.deepEqual(decCalm.value, {
    cloudCoverOctas: '0',
    cloudCover: 0,
    windDirectionCode: 0,
    windDirectionDeg: 0,
    windSpeed: 0,
  });
  assert.equal(encodeGroup('Nddff', { cloudCoverOctas: 0, windDirectionDeg: 0, windSpeed: 0 }), '00000');

  // 26. 82708 -> N=8, dd=27 (270°), ff=8
  const decW27 = decodeGroup('82708', 'Nddff');
  assert.deepEqual(decW27.value, {
    cloudCoverOctas: '8',
    cloudCover: 8,
    windDirectionCode: 27,
    windDirectionDeg: 270,
    windSpeed: 8,
  });
  assert.equal(encodeGroup('Nddff', { cloudCoverOctas: 8, windDirectionDeg: 270, windSpeed: 8 }), '82708');

  // 27. 61814 -> N=6, dd=18 (180°), ff=14
  const decW18 = decodeGroup('61814', 'Nddff');
  assert.deepEqual(decW18.value, {
    cloudCoverOctas: '6',
    cloudCover: 6,
    windDirectionCode: 18,
    windDirectionDeg: 180,
    windSpeed: 14,
  });

  // 28. 30903 -> N=3, dd=09 (90°), ff=3
  const decW09 = decodeGroup('30903', 'Nddff');
  assert.deepEqual(decW09.value, {
    cloudCoverOctas: '3',
    cloudCover: 3,
    windDirectionCode: 9,
    windDirectionDeg: 90,
    windSpeed: 3,
  });

  // 29. 73605 -> N=7, dd=36 (360°), ff=5
  const decW36 = decodeGroup('73605', 'Nddff');
  assert.deepEqual(decW36.value, {
    cloudCoverOctas: '7',
    cloudCover: 7,
    windDirectionCode: 36,
    windDirectionDeg: 360,
    windSpeed: 5,
  });

  // 30. 99902 -> N=9, dd=99 (variable), ff=2
  const decW99 = decodeGroup('99902', 'Nddff');
  assert.deepEqual(decW99.value, {
    cloudCoverOctas: '9',
    cloudCover: 9,
    windDirectionCode: 99,
    windDirectionDeg: 'variable',
    windSpeed: 2,
  });
  assert.equal(encodeGroup('Nddff', { cloudCoverOctas: 9, windDirectionDeg: 'variable', windSpeed: 2 }), '99902');

  // Extended wind test (00fff)
  const dec00fff = decodeGroup('00105', '00fff');
  assert.deepEqual(dec00fff.value, { windSpeedExtended: 105 });
  assert.equal(encodeGroup('00fff', 105), '00105');
});

test('31. Полная телеграмма станции 26063 с валидацией инвариантов', () => {
  const raw = 'AAXX 26181 26063 72406 10052 21008 30084 40126 57014=';
  const parsed = parseTelegram(raw, KN01_RULESET_ID);

  assert.equal(parsed.rulesetId, KN01_RULESET_ID);
  assert.equal(parsed.stationId, '26063');
  assert.deepEqual(parsed.dateUtc, { day: 26, hour: 18 });
  assert.equal(parsed.temperature, 5.2);
  assert.equal(parsed.dewpoint, -0.8);
  assert.equal(parsed.pressureStation, 1008.4);
  assert.equal(parsed.pressureSea, 1012.6);
  assert.deepEqual(parsed.tendency, { characteristic: 7, changeHpa: -1.4 });
  assert.deepEqual(parsed.wind, {
    cloudCoverOctas: '7',
    directionDeg: 240,
    speed: 6,
  });
  assert.equal(parsed.groups.length, 9);
  assert.equal(parsed.unparsed.length, 0);
  assert.equal(parsed.invariants.tdLeT, true);
});

test('Физический инвариант Td <= T и детекция нарушения', () => {
  // Валидный случай Td <= T
  const validTelegram = parseTelegram('AAXX 26121 26063 00000 10150 20120=');
  assert.equal(validTelegram.temperature, 15.0);
  assert.equal(validTelegram.dewpoint, 12.0);
  assert.equal(validTelegram.invariants.tdLeT, true);

  // Нарушение инварианта: Td > T (10120 20150 -> T = 12.0, Td = 15.0)
  const invalidTelegram = parseTelegram('AAXX 26121 26063 00000 10120 20150=');
  assert.equal(invalidTelegram.temperature, 12.0);
  assert.equal(invalidTelegram.dewpoint, 15.0);
  assert.equal(invalidTelegram.invariants.tdLeT, false);
});

test('Валидация групп через validateGroup и обработка ошибок', () => {
  assert.deepEqual(validateGroup('10234', '1snTTT'), { valid: true, errors: [] });
  assert.equal(validateGroup('19234', '1snTTT').valid, false); // invalid sign code 9
  assert.deepEqual(validateGroup('40125', '4PPPP'), { valid: true, errors: [] });
  assert.equal(validateGroup('4XXXX', '4PPPP').valid, false);

  // Ошибки некорректных наборов правил и форматов
  assert.throws(() => decodeGroup('10234', '1snTTT', 'UNKNOWN_RULESET'));
  assert.throws(() => decodeGroup(12345, '1snTTT'));
  assert.throws(() => decodeGroup('NOT_AAXX', 'AAXX'));
  assert.throws(() => decodeGroup('123', 'YYGGiw'));
  assert.throws(() => decodeGroup('99121', 'YYGGiw')); // day 99
  assert.throws(() => decodeGroup('26991', 'YYGGiw')); // hour 99
  assert.throws(() => decodeGroup('26129', 'YYGGiw')); // wind indicator 9
  assert.throws(() => decodeGroup('123', 'IIiii'));
  assert.throws(() => decodeGroup('123', 'Nddff'));
  assert.throws(() => decodeGroup('05010', 'Nddff')); // dd 50 invalid
  assert.throws(() => decodeGroup('01123', '00fff')); // not starting with 00
  assert.throws(() => decodeGroup('59012', '5appp')); // characteristic 9
  assert.throws(() => parseGroup('INVALID'));
  assert.throws(() => parseGroup(12345));
  assert.throws(() => parseGroup('99999')); // unsupported prefix
  assert.throws(() => encodeGroup('1snTTT', NaN));
  assert.throws(() => encodeGroup('1snTTT', 1000));
  assert.throws(() => encodeGroup('3PoPoPoPo', 400));
  assert.throws(() => encodeGroup('4PPPP', 700));
  assert.throws(() => encodeGroup('5appp', null));
  assert.throws(() => encodeGroup('5appp', { characteristic: 2, pressureChangeHpa: -5 })); // sign mismatch
  assert.throws(() => parseTelegram(12345));
});
