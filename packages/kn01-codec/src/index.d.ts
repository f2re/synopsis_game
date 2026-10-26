export const KN01_RULESET_ID: 'KN01_RU_ROSHYDROMET_2012_V1';
export type SupportedKn01Group = '1snTTT' | '2snTdTdTd' | '3PoPoPoPo' | '5appp';
export interface NumericDecodedGroup { group: SupportedKn01Group; encoded: string; value: number; unit: 'degC' | 'hPa'; }
export interface TendencyDecodedGroup { group: '5appp'; encoded: string; value: { characteristic: number; pressureChangeHpa: number; periodHours: 3 }; }
export type DecodedGroup = NumericDecodedGroup | TendencyDecodedGroup;
export function decodeGroup(encoded: string, group: SupportedKn01Group, rulesetId: string): DecodedGroup;
export function parseGroup(encoded: string, rulesetId: string): DecodedGroup;
export function validateGroup(encoded: string, group: SupportedKn01Group, rulesetId: string): { valid: boolean; errors: string[] };
export function encodeGroup(group: SupportedKn01Group, value: number | { characteristic: number; pressureChangeHpa: number }, rulesetId: string): string;
export function parseTelegram(raw: string, rulesetId: string): { rulesetId: string; raw: string; groups: DecodedGroup[]; unparsed: string[] };
