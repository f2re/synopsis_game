import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../../../', import.meta.url);
const manifestSource = await readFile(new URL('assets/manifests/audio.collection.json', root), 'utf8');
const manifest = JSON.parse(manifestSource);
const definitions = {};
for (const asset of manifest.assets) {
  if (!asset.id || !asset.runtimeUrl?.startsWith('/audio/') || !Number.isFinite(asset.defaultVolume)) {
    throw new Error(`Invalid audio manifest entry: ${asset.id}`);
  }
  for (const url of [asset.runtimeUrl, asset.compressedRuntimeUrl].filter(Boolean)) {
    if (!url.startsWith('/audio/') || url.includes('..')) throw new Error(`Invalid audio URL: ${url}`);
    await access(new URL(`apps/web/public${url}`, root));
  }
  definitions[asset.id] = {
    id: asset.id,
    url: asset.runtimeUrl,
    ...(asset.compressedRuntimeUrl ? { compressedUrl: asset.compressedRuntimeUrl } : {}),
    channel: asset.category === 'ui' ? 'ui' : ['ambient', 'fauna'].includes(asset.category) ? 'ambient' : 'effects',
    defaultVolume: asset.defaultVolume,
    loop: asset.loop === true,
  };
}

const checksum = createHash('sha256').update(manifestSource).digest('hex');
const block = [
  '// BEGIN generated audio definitions',
  '// Source: assets/manifests/audio.collection.json; regenerate with npm run sync:audio in this package.',
  `// Source SHA-256: ${checksum}`,
  `export const SOUND_DEFINITIONS: Record<string, SoundDefinition> = ${JSON.stringify(definitions, null, 2)};`,
  '// END generated audio definitions',
].join('\n');
const target = new URL('packages/world-engine/src/audio/audioDefinitions.ts', root);
const current = await readFile(target, 'utf8');
const pattern = /\/\/ BEGIN generated audio definitions[\s\S]*?\/\/ END generated audio definitions/;
if (!pattern.test(current)) throw new Error('Audio runtime projection markers are missing');
const next = current.replace(pattern, block);
if (process.argv.includes('--check')) {
  if (current !== next) throw new Error('Audio runtime projection is stale; run syncAudioManifest.mjs');
} else if (current !== next) {
  await writeFile(target, next);
}
console.log(`Audio runtime projection ${process.argv.includes('--check') ? 'verified' : 'synchronized'}: ${Object.keys(definitions).length} canonical IDs and public file paths.`);
