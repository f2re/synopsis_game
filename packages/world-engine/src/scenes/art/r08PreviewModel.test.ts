import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseR08PreviewManifest, r08ArchiveTarget, r08ObserverPose, r08Viewport,
  R08_SOURCE_SCALE,
} from './r08PreviewModel.ts';
import { getR08StationLayout } from './r08StationLayout.ts';

const actualManifest = () => JSON.parse(readFileSync(new URL('../../../../../apps/web/public/hub/r08-preview/manifest.json', import.meta.url), 'utf8'));

test('in-game R08 entrance targets are separated and clear the HUD in all supported orientations', () => {
  for (const [width, height, header, dock] of [[1366, 768, 84, 92], [390, 844, 72, 152], [844, 390, 68, 68]]) {
    const normal = getR08StationLayout(width, height, 1).targets;
    const retina = getR08StationLayout(width * 2, height * 2, 2).targets;
    assert.deepEqual(normal.map(({ id }) => id), ['radar', 'lab', 'codepost', 'cartography', 'archive', 'hall']);
    for (const [index, target] of normal.entries()) {
      assert.equal(target.width, 44);
      assert.equal(target.height, 44);
      assert.ok(target.x >= 0 && target.x + target.width <= width);
      assert.ok(target.y >= header && target.y + target.height <= height - dock);
      assert.ok(Math.abs(target.x - retina[index].x) <= .5);
      assert.ok(Math.abs(target.y - retina[index].y) <= .5);
      for (const other of normal.slice(0, index)) {
        assert.ok(target.x >= other.x + other.width || other.x >= target.x + target.width ||
          target.y >= other.y + other.height || other.y >= target.y + target.height);
      }
    }
  }
});

test('published candidate keeps original layer coordinates and honest acceptance status', () => {
  const manifest = parseR08PreviewManifest(actualManifest());
  assert.equal(manifest.review.productionReady, false);
  assert.deepEqual(manifest.assets.find((asset) => asset.role === 'archive-facade')?.originalSceneXY, [290, 141]);
  assert.deepEqual(manifest.assets.find((asset) => asset.role === 'archive-porch-steps')?.originalSceneXY, [292, 206]);
  assert.equal(manifest.assets.find((asset) => asset.role === 'foreground-occluder')?.depthSourceY, 245);
  assert.ok(manifest.lightRegions.length >= 6);
  assert.ok(manifest.lightRegions.find((region) => region.id.endsWith('central-entry'))!.suggestedAlpha >
    manifest.lightRegions.find((region) => region.id.endsWith('hall'))!.suggestedAlpha);
});

test('unsafe paths, independent-fit bases and duplicate additive light regions cannot enter the loader', () => {
  const remote = actualManifest(); remote.assets[0].url = 'https://example.com/other.png';
  assert.throws(() => parseR08PreviewManifest(remote), /путь/);
  const fit = actualManifest(); fit.assets.find((asset: {role: string}) => asset.role === 'archive-local-ground').width = 480;
  assert.throws(() => parseR08PreviewManifest(fit), /композицию/);
  const overlap = actualManifest(); overlap.lightRegions.push({ ...overlap.lightRegions[0], id: 'another-emitter' });
  assert.throws(() => parseR08PreviewManifest(overlap), /повторно/);
  const unreviewedRelease = actualManifest(); unreviewedRelease.review.productionReady = true;
  assert.throws(() => parseR08PreviewManifest(unreviewedRelease), /геометрии/);
});

test('one camera projects the archive into the same CSS target at DPR1 and DPR2', () => {
  const bounds = parseR08PreviewManifest(actualManifest()).archive.sourceBounds;
  for (const [width, height] of [[960, 540], [358, 330], [780, 440]]) {
    for (const framing of ['station', 'archive'] as const) {
      const normal = r08ArchiveTarget(bounds, r08Viewport(width, height, framing), 1, width, height);
      const retina = r08ArchiveTarget(bounds, r08Viewport(width * 2, height * 2, framing), 2, width, height);
      assert.deepEqual(retina, normal);
      assert.ok(normal.width >= 44 && normal.height >= 44);
      assert.ok(normal.left >= 0 && normal.top >= 0 && normal.left + normal.width <= width && normal.top + normal.height <= height);
    }
  }
  assert.deepEqual(r08ArchiveTarget(bounds, r08Viewport(960, 540, 'station'), 1, 960, 540), {
    left: 543.75, top: 264.375, width: 135, height: 140.625,
  });
});

test('observer route stays in front of the facade and behind the authored foreground depth line', () => {
  const manifest = parseR08PreviewManifest(actualManifest());
  const foregroundY = manifest.assets.find((asset) => asset.role === 'foreground-occluder')!.depthSourceY! * R08_SOURCE_SCALE;
  const facadeBase = (141 + 64) * R08_SOURCE_SCALE;
  for (let time = 0; time <= 60_000; time += 125) {
    const actor = r08ObserverPose('walk', time);
    assert.ok(actor.x >= 277 * R08_SOURCE_SCALE && actor.x <= 355 * R08_SOURCE_SCALE);
    assert.ok(actor.y > facadeBase && actor.y < foregroundY);
  }
  const turn = (355 - 277) * R08_SOURCE_SCALE / 22 * 1000;
  assert.ok(Math.abs(r08ObserverPose('walk', turn - 1).x - r08ObserverPose('walk', turn + 1).x) < 1e-9);
  assert.equal(r08ObserverPose('walk', turn - 1).facing, 'right');
  assert.equal(r08ObserverPose('walk', turn + 1).facing, 'left');
  assert.deepEqual(r08ObserverPose('foreground', 0), r08ObserverPose('foreground', 50_000));
});
