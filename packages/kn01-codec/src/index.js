/**
 * Кодек КН-01 (SYNOP) — 26063: Позывной «Синоптик».
 * Реализация по нормативу Росгидромета (ROSHYDROMET_KN01_2013).
 */
export const KN01_RULESET_ID = 'KN01_RU_ROSHYDROMET_2012_V1';
function assertRuleset(rulesetId) {
    const effective = rulesetId ?? KN01_RULESET_ID;
    if (effective !== KN01_RULESET_ID) {
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
export function decodeGroup(encoded, group, rulesetId = KN01_RULESET_ID) {
    assertRuleset(rulesetId);
    if (typeof encoded !== 'string' || typeof group !== 'string') {
        throw new TypeError('encoded и group должны быть строками');
    }
    if (group === 'AAXX') {
        if (encoded !== 'AAXX')
            throw new Error(`Ожидался маркер AAXX, получено ${encoded}`);
        return {
            group: 'AAXX',
            encoded,
            value: { type: 'synop_land_station' },
        };
    }
    if (group === 'YYGGiw') {
        if (!/^\d{5}$/.test(encoded)) {
            throw new Error(`Группа YYGGiw должна состоять из пяти цифр: ${encoded}`);
        }
        const day = Number(encoded.slice(0, 2));
        const hourUtc = Number(encoded.slice(2, 4));
        const windIndicator = Number(encoded[4]);
        if (day < 1 || day > 31)
            throw new Error(`Недопустимый день YY=${day}`);
        if (hourUtc < 0 || hourUtc > 23)
            throw new Error(`Недопустимый срок GG=${hourUtc}`);
        if (![0, 1, 3, 4].includes(windIndicator)) {
            throw new Error(`Недопустимый указатель ветра iw=${windIndicator}`);
        }
        return {
            group: 'YYGGiw',
            encoded,
            value: {
                day,
                hourUtc,
                windIndicator,
                windUnit: (windIndicator === 3 || windIndicator === 4) ? 'knots' : 'm/s',
                windSource: (windIndicator === 0 || windIndicator === 3) ? 'estimated_or_vane' : 'anemometer',
            },
        };
    }
    if (group === 'IIiii') {
        if (!/^\d{5}$/.test(encoded)) {
            throw new Error(`Группа индекса IIiii должна состоять из пяти цифр: ${encoded}`);
        }
        const block = encoded.slice(0, 2);
        const stationNumber = encoded.slice(2, 5);
        return {
            group: 'IIiii',
            encoded,
            value: {
                block,
                stationNumber,
                stationId: encoded,
            },
        };
    }
    if (group === 'Nddff') {
        if (!/^[0-9/]\d{4}$/.test(encoded)) {
            throw new Error(`Группа Nddff должна иметь формат Nddff: ${encoded}`);
        }
        const cloudChar = encoded[0];
        const dd = Number(encoded.slice(1, 3));
        const ff = Number(encoded.slice(3, 5));
        if (dd > 36 && dd !== 99) {
            throw new Error(`Недопустимое направление ветра dd=${dd}`);
        }
        let directionDeg = 0;
        if (dd === 99) {
            directionDeg = 'variable';
        }
        else if (dd === 0) {
            directionDeg = 0;
        }
        else {
            directionDeg = dd * 10;
        }
        return {
            group: 'Nddff',
            encoded,
            value: {
                cloudCoverOctas: cloudChar,
                cloudCover: cloudChar === '/' ? null : Number(cloudChar),
                windDirectionCode: dd,
                windDirectionDeg: directionDeg,
                windSpeed: ff,
            },
        };
    }
    if (group === '00fff') {
        if (!/^00\d{3}$/.test(encoded)) {
            throw new Error(`Группа расширенного ветра должна иметь формат 00fff: ${encoded}`);
        }
        const speed = Number(encoded.slice(2));
        return {
            group: '00fff',
            encoded,
            value: {
                windSpeedExtended: speed,
            },
        };
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
    if (group === '4PPPP') {
        assertEncoded(encoded, '4');
        const ppppTenths = Number(encoded.slice(1));
        // Правило восстановления старшего разряда давления:
        // если первые две цифры < 50 (т.е. ppppTenths < 5000), прибавляется 1000 гПа (старшая единица опущена)
        // если первые две цифры >= 50, давление меньше 1000 гПа, тысячи не добавляются (например 987,4 гПа)
        const fullTenths = ppppTenths < 5000 ? 10000 + ppppTenths : ppppTenths;
        return {
            group: '4PPPP',
            encoded,
            value: fullTenths / 10,
            unit: 'hPa',
        };
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
const PREFIX_TO_GROUP = {
    '1': '1snTTT',
    '2': '2snTdTdTd',
    '3': '3PoPoPoPo',
    '4': '4PPPP',
    '5': '5appp',
};
export function parseGroup(encoded, rulesetId = KN01_RULESET_ID) {
    assertRuleset(rulesetId);
    if (typeof encoded !== 'string') {
        throw new Error('Кодовая группа должна быть строкой');
    }
    if (encoded === 'AAXX') {
        return decodeGroup(encoded, 'AAXX', rulesetId);
    }
    if (encoded.startsWith('00') && encoded.length === 5) {
        return decodeGroup(encoded, '00fff', rulesetId);
    }
    if (encoded.length !== 5) {
        throw new Error('Кодовая группа должна состоять из пяти знаков');
    }
    const prefix = encoded[0];
    const group = PREFIX_TO_GROUP[prefix];
    if (group) {
        return decodeGroup(encoded, group, rulesetId);
    }
    throw new Error(`Не удалось определить тип группы по знаку: ${encoded}`);
}
export function validateGroup(encoded, group, rulesetId = KN01_RULESET_ID) {
    try {
        decodeGroup(encoded, group, rulesetId);
        return { valid: true, errors: [] };
    }
    catch (error) {
        return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
}
function encodeSignedTenths(prefix, value) {
    if (!Number.isFinite(value))
        throw new Error('Температура должна быть конечным числом');
    const tenths = Math.round(Math.abs(value) * 10);
    if (tenths > 999)
        throw new Error('Значение не помещается в поле TTT');
    const sign = value < 0 ? '1' : '0';
    return `${prefix}${sign}${String(tenths).padStart(3, '0')}`;
}
export function encodeGroup(group, value, rulesetId = KN01_RULESET_ID) {
    assertRuleset(rulesetId);
    if (group === 'AAXX')
        return 'AAXX';
    if (group === 'YYGGiw') {
        const v = value;
        const day = String(v.day).padStart(2, '0');
        const hour = String(v.hourUtc).padStart(2, '0');
        const iw = String(v.windIndicator ?? 1);
        return `${day}${hour}${iw}`;
    }
    if (group === 'IIiii') {
        if (typeof value === 'string' && /^\d{5}$/.test(value))
            return value;
        const v = value;
        const b = String(v.block).padStart(2, '0');
        const s = String(v.stationNumber).padStart(3, '0');
        return `${b}${s}`;
    }
    if (group === 'Nddff') {
        const v = value;
        const n = String(v.cloudCoverOctas ?? '0');
        let dd = '00';
        if (v.windDirectionDeg === 'variable') {
            dd = '99';
        }
        else if (typeof v.windDirectionDeg === 'number' && v.windDirectionDeg > 0) {
            dd = String(Math.round(v.windDirectionDeg / 10)).padStart(2, '0');
        }
        const ff = String(Math.round(v.windSpeed)).padStart(2, '0');
        return `${n}${dd}${ff}`;
    }
    if (group === '00fff') {
        const speed = typeof value === 'number' ? value : value.windSpeedExtended;
        return `00${String(Math.round(speed)).padStart(3, '0')}`;
    }
    if (group === '1snTTT')
        return encodeSignedTenths('1', Number(value));
    if (group === '2snTdTdTd')
        return encodeSignedTenths('2', Number(value));
    if (group === '3PoPoPoPo') {
        const pressure = Number(value);
        if (!Number.isFinite(pressure) || pressure < 500 || pressure >= 1500) {
            throw new Error('Давление должно быть в диапазоне 500…1499,9 гПа');
        }
        const fullTenths = Math.round(pressure * 10);
        const abbreviated = fullTenths >= 10000 ? fullTenths - 10000 : fullTenths;
        if (abbreviated < 0 || abbreviated > 9999)
            throw new Error('Давление не помещается в PoPoPoPo');
        return `3${String(abbreviated).padStart(4, '0')}`;
    }
    if (group === '4PPPP') {
        const pressure = Number(value);
        if (!Number.isFinite(pressure) || pressure < 870 || pressure > 1085) {
            throw new Error('Давление на уровне моря должно быть в диапазоне 870…1085 гПа');
        }
        const fullTenths = Math.round(pressure * 10);
        const abbreviated = fullTenths >= 10000 ? fullTenths - 10000 : fullTenths;
        return `4${String(abbreviated).padStart(4, '0')}`;
    }
    if (group === '5appp') {
        if (!value || typeof value !== 'object') {
            throw new Error('Для 5appp требуется объект с characteristic и pressureChangeHpa');
        }
        const v = value;
        const characteristic = Number(v.characteristic);
        const change = Number(v.pressureChangeHpa);
        if (!Number.isInteger(characteristic) || characteristic < 0 || characteristic > 8 || !Number.isFinite(change)) {
            throw new Error('Некорректные параметры 5appp');
        }
        const expectedSign = characteristic < 4 ? 1 : characteristic === 4 ? 0 : -1;
        if ((expectedSign > 0 && change < 0) ||
            (expectedSign < 0 && change > 0) ||
            (expectedSign === 0 && Math.abs(change) > 0.049)) {
            throw new Error('Знак изменения давления не согласован с характеристикой a');
        }
        const ppp = Math.round(Math.abs(change) * 10);
        if (ppp > 999)
            throw new Error('Изменение давления не помещается в ppp');
        return `5${characteristic}${String(ppp).padStart(3, '0')}`;
    }
    throw new Error(`Кодирование группы ${group} пока не поддерживается`);
}
export function parseTelegram(raw, rulesetId = KN01_RULESET_ID) {
    assertRuleset(rulesetId);
    if (typeof raw !== 'string')
        throw new TypeError('Телеграмма должна быть строкой');
    const tokens = raw.trim().split(/\s+/).filter(Boolean);
    const groups = [];
    const unparsed = [];
    let stationId;
    let dateUtc;
    let temperature;
    let dewpoint;
    let pressureStation;
    let pressureSea;
    let tendency;
    let wind;
    for (let i = 0; i < tokens.length; i++) {
        const rawToken = tokens[i];
        const token = rawToken.endsWith('=') ? rawToken.slice(0, -1) : rawToken;
        if (token === 'AAXX') {
            groups.push(decodeGroup(token, 'AAXX', rulesetId));
        }
        else if (i === 1 && /^\d{5}$/.test(token)) {
            const decoded = decodeGroup(token, 'YYGGiw', rulesetId);
            groups.push(decoded);
            dateUtc = { day: decoded.value.day, hour: decoded.value.hourUtc };
        }
        else if (i === 2 && /^\d{5}$/.test(token)) {
            const decoded = decodeGroup(token, 'IIiii', rulesetId);
            groups.push(decoded);
            stationId = decoded.value.stationId;
        }
        else if (!wind && /^[0-9/]\d{4}$/.test(token)) {
            const decoded = decodeGroup(token, 'Nddff', rulesetId);
            groups.push(decoded);
            wind = {
                cloudCoverOctas: decoded.value.cloudCoverOctas,
                directionDeg: decoded.value.windDirectionDeg,
                speed: decoded.value.windSpeed,
            };
        }
        else if (/^00\d{3}$/.test(token)) {
            const decoded = decodeGroup(token, '00fff', rulesetId);
            groups.push(decoded);
            if (wind) {
                wind.speed = decoded.value.windSpeedExtended;
            }
        }
        else if (/^[12345]\d{4}$/.test(token)) {
            try {
                const decoded = parseGroup(token, rulesetId);
                groups.push(decoded);
                if (decoded.group === '1snTTT')
                    temperature = decoded.value;
                if (decoded.group === '2snTdTdTd')
                    dewpoint = decoded.value;
                if (decoded.group === '3PoPoPoPo')
                    pressureStation = decoded.value;
                if (decoded.group === '4PPPP')
                    pressureSea = decoded.value;
                if (decoded.group === '5appp') {
                    const val = decoded.value;
                    tendency = { characteristic: val.characteristic, changeHpa: val.pressureChangeHpa };
                }
            }
            catch {
                unparsed.push(rawToken);
            }
        }
        else {
            unparsed.push(rawToken);
        }
    }
    const tdLeT = (temperature !== undefined && dewpoint !== undefined) ? dewpoint <= temperature : true;
    return {
        rulesetId,
        raw,
        stationId,
        dateUtc,
        temperature,
        dewpoint,
        pressureStation,
        pressureSea,
        tendency,
        wind,
        groups,
        unparsed,
        invariants: {
            tdLeT,
        },
    };
}
