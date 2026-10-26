import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = path.join(root, 'packages/contracts/hub-main-screen.contract.json');
const manifestPath = path.join(root, 'assets/manifests/hub.production.json');

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const errors = [];
const notes = [];
const minWidth = contract.runtime.sourceTexture.minimumWidth;
const minHeight = contract.runtime.sourceTexture.minimumHeight;

if (manifest.scene !== contract.scene) {
  errors.push(`scene mismatch: contract=${contract.scene}, manifest=${manifest.scene}`);
}

const master = manifest.assets.find((asset) => asset.id === 'hub.master.approved');
if (!master) {
  errors.push('missing hub.master.approved in hub.production.json');
} else {
  if (master.sourceSha256 !== contract.master.sha256) {
    errors.push('approved master SHA-256 does not match hub-main-screen contract');
  }
  if (master.sourceWidth !== contract.master.width || master.sourceHeight !== contract.master.height) {
    errors.push('approved master dimensions do not match hub-main-screen contract');
  }
}

for (const asset of manifest.assets) {
  const isFullscreenRaster =
    asset.kind === 'scene-base' ||
    asset.kind === 'candidate-high-fidelity-fallback' ||
    asset.kind === 'production-environment-plate';
  if (!isFullscreenRaster || asset.deprecated) continue;

  if ((asset.runtimeWidth ?? 0) < minWidth || (asset.runtimeHeight ?? 0) < minHeight) {
    errors.push(
      `${asset.id}: fullscreen texture ${asset.runtimeWidth}x${asset.runtimeHeight} is below ${minWidth}x${minHeight}`,
    );
  }
}

const legacy = manifest.assets.find((asset) => asset.id === 'hub.runtime.legacy-960');
if (legacy && !legacy.deprecated) {
  errors.push('hub.runtime.legacy-960 must remain deprecated');
}

if (manifest.status === 'production') {
  const acceptedRaster = manifest.assets.find(
    (asset) =>
      !asset.deprecated &&
      (asset.kind === 'production-environment-plate' || asset.kind === 'candidate-high-fidelity-fallback') &&
      (asset.runtimeWidth ?? 0) >= minWidth &&
      (asset.runtimeHeight ?? 0) >= minHeight &&
      asset.status !== 'awaiting-repository-import-and-art-review',
  );
  if (!acceptedRaster) {
    errors.push('production manifest has no accepted native-resolution fullscreen raster');
  }
} else {
  notes.push(`Hub manifest status is ${manifest.status}; final ART_ACCEPTED is intentionally blocked.`);
}

const runtimeUi = manifest.assets.find((asset) => asset.id === 'hub.ui.runtime');
if (!runtimeUi?.mustNotBeBakedIntoEnvironmentPlate) {
  errors.push('hub.ui.runtime must explicitly forbid baking UI into the environment plate');
}

if (errors.length) {
  console.error('Hub art contract: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Hub art contract: PASS');
for (const note of notes) console.log(`- ${note}`);
