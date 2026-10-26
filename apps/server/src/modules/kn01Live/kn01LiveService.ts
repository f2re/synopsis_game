import { createHash } from 'node:crypto';
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { KN01_RULESET_ID } from '@synopsis/kn01-codec';
import { canonicalizeSynopText, parseSynopHeader, SynopHeaderError } from '@synopsis/kn01-codec/synop-header';

export interface StationRecord {
  wmoId: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationM?: number | null;
  active: boolean;
  aliases?: string[];
  sourceId: string;
  sourceLocator?: string;
}

interface StationRegistryFile {
  schema_version: string;
  stations: StationRecord[];
}

export interface Kn01RawRecord {
  id: string;
  status: 'accepted';
  rawSha256: string;
  canonicalSha256: string;
  receivedAt: string;
  sourceName: string;
  originalName?: string;
  rulesetId: string;
  header: ReturnType<typeof parseSynopHeader>;
  station: StationRecord;
  rawRelativePath: string;
}

export type Kn01IngestResult =
  | { status: 'accepted'; record: Kn01RawRecord }
  | { status: 'duplicate'; record: Kn01RawRecord }
  | { status: 'rejected'; code: string; message: string; rawSha256: string; stationId?: string };

export interface Kn01LiveOptions {
  storageRoot: string;
  stationRegistryPath: string;
  maxBytes?: number;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function validateStation(station: StationRecord): void {
  if (!/^\d{5}$/.test(station.wmoId)) throw new Error(`Некорректный WMO IIiii: ${station.wmoId}`);
  if (!station.name.trim()) throw new Error(`Станция ${station.wmoId}: пустое название`);
  if (!Number.isFinite(station.latitude) || station.latitude < -90 || station.latitude > 90) {
    throw new Error(`Станция ${station.wmoId}: некорректная широта`);
  }
  if (!Number.isFinite(station.longitude) || station.longitude < -180 || station.longitude > 180) {
    throw new Error(`Станция ${station.wmoId}: некорректная долгота`);
  }
  if (!station.sourceId) throw new Error(`Станция ${station.wmoId}: не указан sourceId`);
}

export class Kn01LiveService {
  private readonly stations = new Map<string, StationRecord>();
  private readonly acceptedByCanonicalSha = new Map<string, Kn01RawRecord>();
  private initialized = false;

  constructor(private readonly options: Kn01LiveOptions) {}

  async init(): Promise<void> {
    const registry = JSON.parse(await readFile(this.options.stationRegistryPath, 'utf8')) as StationRegistryFile;
    this.stations.clear();
    for (const station of registry.stations ?? []) {
      validateStation(station);
      if (this.stations.has(station.wmoId)) throw new Error(`Дублирующаяся станция ${station.wmoId}`);
      this.stations.set(station.wmoId, structuredClone(station));
    }

    await Promise.all([
      mkdir(join(this.options.storageRoot, 'raw'), { recursive: true }),
      mkdir(join(this.options.storageRoot, 'records'), { recursive: true }),
      mkdir(join(this.options.storageRoot, 'rejected'), { recursive: true }),
      mkdir(join(this.options.storageRoot, 'inbox/incoming'), { recursive: true }),
      mkdir(join(this.options.storageRoot, 'inbox/accepted'), { recursive: true }),
      mkdir(join(this.options.storageRoot, 'inbox/rejected'), { recursive: true }),
    ]);

    this.acceptedByCanonicalSha.clear();
    const indexPath = join(this.options.storageRoot, 'index.jsonl');
    try {
      const lines = (await readFile(indexPath, 'utf8')).split('\n').filter(Boolean);
      for (const line of lines) {
        const record = JSON.parse(line) as Kn01RawRecord;
        if (record.status === 'accepted' && record.canonicalSha256) {
          this.acceptedByCanonicalSha.set(record.canonicalSha256, record);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    this.initialized = true;
  }

  status() {
    this.requireInit();
    return {
      rulesetId: KN01_RULESET_ID,
      stationCount: this.stations.size,
      acceptedCount: this.acceptedByCanonicalSha.size,
      storageRoot: this.options.storageRoot,
    };
  }

  station(wmoId: string): StationRecord | null {
    this.requireInit();
    const station = this.stations.get(wmoId);
    return station ? structuredClone(station) : null;
  }

  async ingestText(raw: string, sourceName: string, originalName?: string): Promise<Kn01IngestResult> {
    this.requireInit();
    const bytes = Buffer.byteLength(raw, 'utf8');
    const maxBytes = this.options.maxBytes ?? 64 * 1024;
    const rawSha256 = sha256(raw);
    if (bytes === 0) return this.reject(raw, rawSha256, 'empty_message', 'Пустая телеграмма');
    if (bytes > maxBytes) return this.reject(raw, rawSha256, 'message_too_large', `Телеграмма превышает ${maxBytes} байт`);

    let canonicalText: string;
    let header: ReturnType<typeof parseSynopHeader>;
    try {
      canonicalText = canonicalizeSynopText(raw);
      header = parseSynopHeader(raw);
    } catch (error) {
      if (error instanceof SynopHeaderError) return this.reject(raw, rawSha256, error.code, error.message);
      throw error;
    }

    const canonicalSha256 = sha256(canonicalText);
    const duplicate = this.acceptedByCanonicalSha.get(canonicalSha256);
    if (duplicate) return { status: 'duplicate', record: structuredClone(duplicate) };

    const station = this.stations.get(header.stationId);
    if (!station || !station.active) {
      return this.reject(
        raw,
        rawSha256,
        station ? 'inactive_station' : 'unknown_station',
        station ? `Станция ${header.stationId} неактивна` : `Станция ${header.stationId} отсутствует в реестре`,
        header.stationId,
      );
    }

    const rawRelativePath = join('raw', `${rawSha256}.txt`);
    await this.writeImmutable(join(this.options.storageRoot, rawRelativePath), raw);
    const record: Kn01RawRecord = {
      id: rawSha256,
      status: 'accepted',
      rawSha256,
      canonicalSha256,
      receivedAt: new Date().toISOString(),
      sourceName,
      ...(originalName ? { originalName } : {}),
      rulesetId: KN01_RULESET_ID,
      header,
      station: structuredClone(station),
      rawRelativePath,
    };
    await this.writeImmutable(join(this.options.storageRoot, 'records', `${rawSha256}.json`), `${JSON.stringify(record, null, 2)}\n`);
    await appendFile(join(this.options.storageRoot, 'index.jsonl'), `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
    this.acceptedByCanonicalSha.set(canonicalSha256, record);
    return { status: 'accepted', record: structuredClone(record) };
  }

  async processInbox(sourceName = 'file-inbox'): Promise<Kn01IngestResult[]> {
    this.requireInit();
    const incoming = join(this.options.storageRoot, 'inbox/incoming');
    const entries = (await readdir(incoming)).sort();
    const results: Kn01IngestResult[] = [];
    for (const name of entries) {
      const path = join(incoming, name);
      const info = await stat(path);
      if (!info.isFile()) continue;
      const raw = await readFile(path, 'utf8');
      const result = await this.ingestText(raw, sourceName, name);
      results.push(result);
      const rawSha = result.status === 'rejected' ? result.rawSha256 : result.record.rawSha256;
      const bucket = result.status === 'rejected' ? 'rejected' : 'accepted';
      const target = join(this.options.storageRoot, 'inbox', bucket, `${rawSha}.telegram`);
      try {
        await rename(path, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') await unlink(path);
        else throw error;
      }
    }
    return results;
  }

  private async reject(raw: string, rawSha256: string, code: string, message: string, stationId?: string): Promise<Kn01IngestResult> {
    await this.writeImmutable(join(this.options.storageRoot, 'rejected', `${rawSha256}.txt`), raw);
    const metadata = {
      status: 'rejected', rawSha256, occurredAt: new Date().toISOString(), code, message, ...(stationId ? { stationId } : {}),
    };
    await this.writeImmutable(join(this.options.storageRoot, 'rejected', `${rawSha256}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
    return { status: 'rejected', code, message, rawSha256, ...(stationId ? { stationId } : {}) };
  }

  private async writeImmutable(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    try {
      await writeFile(path, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }

  private requireInit(): void {
    if (!this.initialized) throw new Error('Kn01LiveService не инициализирован');
  }
}
