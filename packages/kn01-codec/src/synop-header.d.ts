export interface SynopHeader {
  reportType: 'AAXX';
  timeGroup: string;
  day: number;
  hourUtc: number;
  windIndicator: number;
  stationId: string;
  bodyTokens: string[];
  bulletinPrefix: string[];
  canonicalText: string;
}

export class SynopHeaderError extends Error {
  readonly code: string;
  constructor(message: string, code?: string);
}

export function canonicalizeSynopText(raw: string): string;
export function parseSynopHeader(raw: string): SynopHeader;
