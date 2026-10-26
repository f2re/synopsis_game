import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Kn01LiveService } from './kn01LiveService.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'synopsis-kn01-live-'));
  const storageRoot = join(root, 'storage');
  const stationRegistryPath = join(root, 'stations.json');
  await writeFile(stationRegistryPath, JSON.stringify({
    schema_version: '0.1.0',
    stations: [
      {
        wmoId: '26063',
        name: 'Тестовая станция 26063',
        latitude: 55.75,
        longitude: 37.62,
        elevationM: 150,
        active: true,
        aliases: ['TEST-26063'],
        sourceId: 'TEST_FIXTURE',
        sourceLocator: 'unit-test only; not production data',
      },
    ],
  }), 'utf8');
  return { root, storageRoot, stationRegistryPath };
}

const TELEGRAM = 'AAXX 26061 26063 11560 82405 10124 20079 40162=';

test('принимает известную станцию и сохраняет неизменяемый raw и provenance', async () => {
  const env = await fixture();
  try {
    const service = new Kn01LiveService(env);
    await service.init();
    const result = await service.ingestText(TELEGRAM, 'unit-test', '26063.synop');
    assert.equal(result.status, 'accepted');
    if (result.status !== 'accepted') return;
    assert.equal(result.record.header.stationId, '26063');
    assert.equal(result.record.station.sourceId, 'TEST_FIXTURE');
    assert.equal(result.record.sourceName, 'unit-test');
    assert.equal(result.record.originalName, '26063.synop');
    const stored = await readFile(join(env.storageRoot, result.record.rawRelativePath), 'utf8');
    assert.equal(stored, TELEGRAM);
    assert.equal(service.status().acceptedCount, 1);
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

test('канонически одинаковая телеграмма не создаёт второй raw-record', async () => {
  const env = await fixture();
  try {
    const service = new Kn01LiveService(env);
    await service.init();
    const first = await service.ingestText(TELEGRAM, 'first');
    const duplicate = await service.ingestText('  AAXX\n26061\t26063 11560 82405 10124 20079 40162  ', 'second');
    assert.equal(first.status, 'accepted');
    assert.equal(duplicate.status, 'duplicate');
    assert.equal(service.status().acceptedCount, 1);
    if (first.status === 'accepted' && duplicate.status === 'duplicate') {
      assert.equal(first.record.id, duplicate.record.id);
      assert.equal(first.record.canonicalSha256, duplicate.record.canonicalSha256);
    }
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

test('дедупликация восстанавливается после перезапуска сервиса', async () => {
  const env = await fixture();
  try {
    const firstService = new Kn01LiveService(env);
    await firstService.init();
    const first = await firstService.ingestText(TELEGRAM, 'before-restart');
    assert.equal(first.status, 'accepted');

    const restarted = new Kn01LiveService(env);
    await restarted.init();
    const duplicate = await restarted.ingestText(TELEGRAM, 'after-restart');
    assert.equal(duplicate.status, 'duplicate');
    assert.equal(restarted.status().acceptedCount, 1);
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

test('неизвестная станция отклоняется без выдумывания координат', async () => {
  const env = await fixture();
  try {
    const service = new Kn01LiveService(env);
    await service.init();
    const result = await service.ingestText('AAXX 26061 99999 11560=', 'unknown');
    assert.equal(result.status, 'rejected');
    if (result.status !== 'rejected') return;
    assert.equal(result.code, 'unknown_station');
    assert.equal(result.stationId, '99999');
    assert.equal(service.station('99999'), null);
    assert.equal(service.status().stationCount, 1);
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

test('повреждённый заголовок сохраняется в rejected с диагностикой', async () => {
  const env = await fixture();
  try {
    const service = new Kn01LiveService(env);
    await service.init();
    const result = await service.ingestText('AAXX 32601 26063 11560=', 'broken');
    assert.equal(result.status, 'rejected');
    if (result.status !== 'rejected') return;
    assert.equal(result.code, 'invalid_day');
    await access(join(env.storageRoot, 'rejected', `${result.rawSha256}.txt`));
    const metadata = JSON.parse(await readFile(join(env.storageRoot, 'rejected', `${result.rawSha256}.json`), 'utf8'));
    assert.equal(metadata.code, 'invalid_day');
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

test('file inbox перемещает принятые и отклонённые сообщения в разные корзины', async () => {
  const env = await fixture();
  try {
    const service = new Kn01LiveService(env);
    await service.init();
    const incoming = join(env.storageRoot, 'inbox', 'incoming');
    await mkdir(incoming, { recursive: true });
    await writeFile(join(incoming, 'ok.telegram'), TELEGRAM, 'utf8');
    await writeFile(join(incoming, 'bad.telegram'), 'AAXX 26061 99999 11560=', 'utf8');

    const results = await service.processInbox('fixture-inbox');
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((item) => item.status).sort(), ['accepted', 'rejected']);
    assert.equal((await readdirSafe(incoming)).length, 0);
    assert.equal((await readdirSafe(join(env.storageRoot, 'inbox', 'accepted'))).length, 1);
    assert.equal((await readdirSafe(join(env.storageRoot, 'inbox', 'rejected'))).length, 1);
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

async function readdirSafe(path: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  return readdir(path);
}
