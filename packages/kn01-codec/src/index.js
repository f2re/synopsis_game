export const KN01_RULESET_ID = 'KN01_RU_ROSHYDROMET_2012_V1';

const GROUP_BY_PREFIX = Object.freeze({
  '1': '1snTTT',
  '2': '2snTdTdTd',
  '3': '3PoPoPoPo',
  '5': '5appp',
});

function assertRuleset(rulesetId) {
  if (rulesetId !== KN01_RULESET_ID) {
    throw new Error(`Неизвестный набор правил КН-01: ${rulesetId}`);
  }
}

function assertEncoded(encoded, prefix) {
  if (!new RegExp(`^${prefix}\\d{4}$`).test(encoded)) {
    throw new Error(`Группа ${encoded} не соответствует ожидаемой структуре ${prefix}dddd`);
  }
}

function decodeSignedTenths(encoded, group) {
  const signCode = Number(encoded[1]);
  if (signCode !== 0 && signCode !== 1) {
    throw new Error(`Недопустимый знак sn=${encoded[1]} в группе ${encoded}`);
  }
  const magnitude = Number(encoded.slice(2)) / 10;
  return {
    group,
    encoded,
    value: signCode === 1 ? -magnitude : magnitude,
    unit: 'degC',
  };
}

export function decodeGroup(encoded, group, rulesetId) {
  assertRuleset(rulesetId);
  if (typeof encoded !== 'string' || typeof group !== 'string') {
    throw new TypeError('encoded и group должны быть строками');
  }

  if (group === '1snTTT') {
    assertEncoded(encoded, '1');
    return decodeSignedTenths(encoded, group);
  }
  if (group === '2snTdTdTd') {
    assertEncoded(encoded, '2');
    return decodeSignedTenths(encoded, group);
  }
  if (group === '3PoPoPoPo') {
    assertEncoded(encoded, '3');
    const abbreviatedTenths = Number(encoded.slice(1));
    const fullTenths = abbreviatedTenths < 5000 ? abbreviatedTenths + 10000 : abbreviatedTenths;
    return { group, encoded, value: fullTenths / 10, unit: 'hPa' };
  }
  if (group === '5appp') {
    assertEncoded(encoded, '5');
    const characteristic = Number(encoded[1]);
    if (characteristic < 0 || characteristic > 8) {
      throw new Error(`Недопустимая характеристика барической тенденции a=${encoded[1]}`);
    }
    const magnitude = Number(encoded.slice(2)) / 10;
    const sign = characteristic < 4 ? 1 : characteristic === 4 ? 0 : -1;
    return {
      group,
      encoded,
      value: {
        characteristic,
        pressureChangeHpa: sign * magnitude,
        periodHours: 3,
      },
    };
  }
  throw new Error(`Группа ${group} пока не поддерживается набором ${rulesetId}`);
}

export function parseGroup(encoded, rulesetId) {
  assertRuleset(rulesetId);
  if (typeof encoded !== 'string' || encoded.length !== 5) {
    throw new Error('Кодовая группа должна состоять из пяти знаков');
  }
  const group = GROUP_BY_PREFIX[encoded[0]];
  if (!group) throw new Error(`Группа с идентификатором ${encoded[0]} пока не поддерживается`);
  return decodeGroup(encoded, group, rulesetId);
}

export function validateGroup(encoded, group, rulesetId) {
  try {
    decodeGroup(encoded, group, rulesetId);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

function encodeSignedTenths(prefix, value) {
  if (!Number.isFinite(value)) throw new Error('Температура должна быть конечным числом');
  const tenths = Math.round(Math.abs(value) * 10);
  if (tenths > 999) throw new Error('Значение не помещается в поле TTT');
  const sign = value < 0 ? '1' : '0';
  return `${prefix}${sign}${String(tenths).padStart(3, '0')}`;
}

export function encodeGroup(group, value, rulesetId) {
  assertRuleset(rulesetId);
  if (group === '1snTTT') return encodeSignedTenths('1', Number(value));
  if (group === '2snTdTdTd') return encodeSignedTenths('2', Number(value));
  if (group === '3PoPoPoPo') {
    const pressure = Number(value);
    if (!Number.isFinite(pressure) || pressure < 500 || pressure >= 1500) {
      throw new Error('Давление должно быть в диапазоне 500…1499,9 гПа');
    }
    const fullTenths = Math.round(pressure * 10);
    const abbreviated = fullTenths >= 10000 ? fullTenths - 10000 : fullTenths;
    if (abbreviated < 0 || abbreviated > 9999) throw new Error('Давление не помещается в PoPoPoPo');
    return `3${String(abbreviated).padStart(4, '0')}`;
  }
  if (group === '5appp') {
    if (!value || typeof value !== 'object') throw new Error('Для 5appp требуется объект с characteristic и pressureChangeHpa');
    const characteristic = Number(value.characteristic);
    const change = Number(value.pressureChangeHpa);
    if (!Number.isInteger(characteristic) || characteristic < 0 || characteristic > 8 || !Number.isFinite(change)) {
      throw new Error('Некорректные параметры 5appp');
    }
    const expectedSign = characteristic < 4 ? 1 : characteristic === 4 ? 0 : -1;
    if ((expectedSign > 0 && change < 0) || (expectedSign < 0 && change > 0) || (expectedSign === 0 && Math.abs(change) > 0.049)) {
      throw new Error('Знак изменения давления не согласован с характеристикой a');
    }
    const ppp = Math.round(Math.abs(change) * 10);
    if (ppp > 999) throw new Error('Изменение давления не помещается в ppp');
    return `5${characteristic}${String(ppp).padStart(3, '0')}`;
  }
  throw new Error(`Кодирование группы ${group} пока не поддерживается`);
}

export function parseTelegram(raw, rulesetId) {
  assertRuleset(rulesetId);
  if (typeof raw !== 'string') throw new TypeError('Телеграмма должна быть строкой');
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const groups = [];
  const unparsed = [];
  for (const token of tokens) {
    const normalized = token.endsWith('=') ? token.slice(0, -1) : token;
    if (/^[1235]\d{4}$/.test(normalized)) {
      try {
        groups.push(parseGroup(normalized, rulesetId));
      } catch {
        unparsed.push(token);
      }
    } else {
      unparsed.push(token);
    }
  }
  return { rulesetId, raw, groups, unparsed };
}
