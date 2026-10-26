export class SynopHeaderError extends Error {
  constructor(message, code = 'invalid_synop_header') {
    super(message);
    this.name = 'SynopHeaderError';
    this.code = code;
  }
}

export function canonicalizeSynopText(raw) {
  if (typeof raw !== 'string') throw new SynopHeaderError('Телеграмма должна быть строкой', 'invalid_type');
  const withoutBom = raw.replace(/^\uFEFF/, '').trim();
  if (!withoutBom) throw new SynopHeaderError('Пустая телеграмма', 'empty_message');
  const tokens = withoutBom.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new SynopHeaderError('Пустая телеграмма', 'empty_message');
  tokens[tokens.length - 1] = tokens[tokens.length - 1].replace(/=+$/, '');
  return tokens.filter(Boolean).join(' ');
}

export function parseSynopHeader(raw) {
  const canonicalText = canonicalizeSynopText(raw);
  const tokens = canonicalText.split(' ');
  const aaxxIndex = tokens.findIndex((token) => token === 'AAXX');
  if (aaxxIndex < 0) throw new SynopHeaderError('Не найдена секция AAXX', 'aaxx_missing');
  if (tokens.length < aaxxIndex + 3) throw new SynopHeaderError('После AAXX отсутствуют YYGGiw и IIiii', 'header_incomplete');

  const yyggiw = tokens[aaxxIndex + 1];
  const stationId = tokens[aaxxIndex + 2];
  if (!/^\d{5}$/.test(yyggiw)) throw new SynopHeaderError('Группа YYGGiw должна содержать 5 цифр', 'invalid_time_group');
  if (!/^\d{5}$/.test(stationId)) throw new SynopHeaderError('Идентификатор IIiii должен содержать 5 цифр', 'invalid_station_id');

  const day = Number(yyggiw.slice(0, 2));
  const hourUtc = Number(yyggiw.slice(2, 4));
  const windIndicator = Number(yyggiw[4]);
  if (day < 1 || day > 31) throw new SynopHeaderError(`Недопустимый день YY=${String(day).padStart(2, '0')}`, 'invalid_day');
  if (hourUtc < 0 || hourUtc > 23) throw new SynopHeaderError(`Недопустимый срок GG=${String(hourUtc).padStart(2, '0')}`, 'invalid_hour');

  return {
    reportType: 'AAXX',
    timeGroup: yyggiw,
    day,
    hourUtc,
    windIndicator,
    stationId,
    bodyTokens: tokens.slice(aaxxIndex + 3),
    bulletinPrefix: tokens.slice(0, aaxxIndex),
    canonicalText,
  };
}
