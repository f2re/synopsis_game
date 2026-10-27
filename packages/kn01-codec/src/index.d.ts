/**
 * Кодек КН-01 (SYNOP) — 26063: Позывной «Синоптик».
 * Реализация по нормативу Росгидромета (ROSHYDROMET_KN01_2013).
 */
export declare const KN01_RULESET_ID = "KN01_RU_ROSHYDROMET_2012_V1";
export type SupportedGroup = 'AAXX' | 'YYGGiw' | 'IIiii' | 'Nddff' | '00fff' | '1snTTT' | '2snTdTdTd' | '3PoPoPoPo' | '4PPPP' | '5appp';
export type SupportedKn01Group = SupportedGroup;
export interface DecodedResult {
    group: SupportedGroup;
    encoded: string;
    value: unknown;
    unit?: string;
}
export interface DecodedTemperature extends DecodedResult {
    group: '1snTTT' | '2snTdTdTd';
    value: number;
    unit: 'degC';
}
export interface DecodedPressure extends DecodedResult {
    group: '3PoPoPoPo' | '4PPPP';
    value: number;
    unit: 'hPa';
}
export interface DecodedTendency extends DecodedResult {
    group: '5appp';
    value: {
        characteristic: number;
        pressureChangeHpa: number;
        periodHours: number;
    };
}
export interface DecodedWind extends DecodedResult {
    group: 'Nddff';
    value: {
        cloudCoverOctas: string;
        cloudCover: number | null;
        windDirectionCode: number;
        windDirectionDeg: number | 'variable';
        windSpeed: number;
    };
}
export interface DecodedExtendedWind extends DecodedResult {
    group: '00fff';
    value: {
        windSpeedExtended: number;
    };
}
export interface DecodedStation extends DecodedResult {
    group: 'IIiii';
    value: {
        block: string;
        stationNumber: string;
        stationId: string;
    };
}
export interface DecodedHeaderTime extends DecodedResult {
    group: 'YYGGiw';
    value: {
        day: number;
        hourUtc: number;
        windIndicator: number;
        windUnit: 'm/s' | 'knots';
        windSource: 'estimated_or_vane' | 'anemometer';
    };
}
export declare function decodeGroup(encoded: string, group: SupportedGroup, rulesetId?: string): DecodedResult;
export declare function parseGroup(encoded: string, rulesetId?: string): DecodedResult;
export declare function validateGroup(encoded: string, group: SupportedGroup, rulesetId?: string): {
    valid: boolean;
    errors: string[];
};
export declare function encodeGroup(group: SupportedGroup, value: unknown, rulesetId?: string): string;
export interface ParsedTelegram {
    rulesetId: string;
    raw: string;
    stationId?: string;
    dateUtc?: {
        day: number;
        hour: number;
    };
    temperature?: number;
    dewpoint?: number;
    pressureStation?: number;
    pressureSea?: number;
    tendency?: {
        characteristic: number;
        changeHpa: number;
    };
    wind?: {
        cloudCoverOctas: string;
        directionDeg: number | 'variable';
        speed: number;
    };
    groups: DecodedResult[];
    unparsed: string[];
    invariants: {
        tdLeT: boolean;
    };
}
export declare function parseTelegram(raw: string, rulesetId?: string): ParsedTelegram;
