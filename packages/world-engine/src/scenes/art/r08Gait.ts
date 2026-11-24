import walkAssets from '../../assets/characters/r08-walk.json' with { type: 'json' };
import type { WorldCharacterClip } from '../../runtime/characterAssets';

const clips = walkAssets.clips as Record<string, WorldCharacterClip>;
const CYCLE_FRAMES = 8;

/** Resolve the R08 versions of walk, idle and talk without modifying the accepted clip. */
export function r08ActorClip(clip: WorldCharacterClip): WorldCharacterClip {
  return Object.hasOwn(clips, clip.assetId) ? clips[clip.assetId] : clip;
}

/** Phase the planted foot from distance travelled, regardless of route speed. */
export function r08WalkFrame(distancePx: number, frameCount = CYCLE_FRAMES): number {
  if (!Number.isFinite(distancePx) || distancePx <= 0) return 0;
  const progress = (distancePx % walkAssets.cycleDistancePx) / walkAssets.cycleDistancePx;
  return Math.floor(progress * frameCount);
}
