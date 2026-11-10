import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_ACTIONS, avatarFrameAtTime, avatarPreviewBounds, avatarProfileKey, drawAvatarComposite, modularAvatarCompositor,
  type AvatarAction, type AvatarComposite, type AvatarLease,
} from '@synopsis/world-engine/avatar';
import { HUB_PREFERENCES_EVENT, readHubPreferences } from '../hub/hubPreferences';
import { LegacyAvatarPreview, type AvatarPreviewProps as LegacyPreviewProps } from './LegacyAvatarPreview';

export type { AvatarDirection } from '@synopsis/world-engine/avatar';
export type AvatarAnimation = AvatarAction;
export interface AvatarPreviewProps extends LegacyPreviewProps {
  onAvailableAnimations?: (actions: readonly AvatarAction[]) => void;
}

/** The same accepted composite used by Phaser; the old personal image is an explicit fallback. */
export function AvatarPreview(props: AvatarPreviewProps) {
  const { avatar, size = 224, direction = 'down', animation = 'idle', showBackdrop = true } = props;
  const key = `${avatarProfileKey(avatar)}:${direction}:${animation}`;
  const [loaded, setLoaded] = useState<{ key: string; lease: AvatarLease<AvatarComposite> } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const capabilities = useRef(props.onAvailableAnimations);
  capabilities.current = props.onAvailableAnimations;
  useEffect(() => {
    let active = true;
    let current: AvatarLease<AvatarComposite> | undefined;
    void modularAvatarCompositor.acquire(avatar, direction, animation).then((lease) => {
      if (!active) { lease.release(); return; }
      current = lease;
      setLoaded({ key, lease });
      setFailure(null);
      capabilities.current?.(AVATAR_ACTIONS.filter((action) => Boolean(lease.value.manifest.clips[action])));
    }).catch((error: unknown) => {
      if (!active) return;
      setFailure({ key, message: error instanceof Error ? error.message : 'Modular avatar unavailable' });
      capabilities.current?.(AVATAR_ACTIONS);
    });
    return () => { active = false; current?.release(); };
  }, [key]);
  const composite = loaded?.key === key ? loaded.lease.value : null;
  if (!composite) return <span className="avatar-renderer" data-avatar-renderer="personal-fallback" data-avatar-error={failure?.key === key ? failure.message : 'loading-approved-manifest'} style={{ display: 'contents' }}>
    <LegacyAvatarPreview {...props} />
  </span>;
  return <ModularAvatarCanvas composite={composite} size={size} requestedAction={animation} showBackdrop={showBackdrop} onAnimationComplete={props.onAnimationComplete} />;
}

function ModularAvatarCanvas({ composite, size, requestedAction, showBackdrop, onAnimationComplete }: {
  composite: AvatarComposite; size: number; requestedAction: AvatarAction; showBackdrop: boolean; onAnimationComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const complete = useRef(onAnimationComplete);
  complete.current = onAnimationComplete;
  const bounds = avatarPreviewBounds(composite);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let timer: number | undefined;
    let elapsed = 0, sampledAt = performance.now(), displayedFrame = -1, done = false;
    let visible = !document.hidden, moving = false;
    const stop = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; };
    const sample = () => {
      stop();
      const preferences = readHubPreferences();
      const reduced = preferences.reducedMotion || media?.matches === true;
      const now = performance.now();
      if (visible && moving) elapsed += Math.max(0, now - sampledAt);
      sampledAt = now;
      visible = !document.hidden;
      moving = !reduced;
      const state = avatarFrameAtTime(composite.clip, elapsed, reduced);
      if (state.frame !== displayedFrame) {
        drawAvatarComposite(context, composite, state.frame);
        canvas.dataset.frame = String(state.frame);
        displayedFrame = state.frame;
      }
      canvas.dataset.reducedMotion = String(reduced);
      canvas.dataset.lowPower = String(preferences.lowPower);
      if ((state.complete || requestedAction !== composite.action) && !done) {
        done = true;
        complete.current?.();
      }
      if (!visible || reduced || state.complete) return;
      const total = composite.clip.durationsMs.reduce((sum, ms) => sum + ms, 0);
      const until = composite.clip.durationsMs.slice(0, state.frame + 1).reduce((sum, ms) => sum + ms, 0) - elapsed % total;
      timer = window.setTimeout(sample, Math.max(preferences.lowPower ? 250 : 16, until));
    };
    sample();
    media?.addEventListener('change', sample);
    document.addEventListener('visibilitychange', sample);
    window.addEventListener(HUB_PREFERENCES_EVENT, sample);
    window.addEventListener('storage', sample);
    return () => {
      stop(); media?.removeEventListener('change', sample);
      document.removeEventListener('visibilitychange', sample);
      window.removeEventListener(HUB_PREFERENCES_EVENT, sample);
      window.removeEventListener('storage', sample);
    };
  }, [composite, requestedAction]);
  return <canvas ref={canvasRef} className="avatar-preview" width={bounds.width} height={bounds.height}
    style={{ width: size, height: Math.round(size * 1.5), objectFit: 'contain', objectPosition: 'center bottom', imageRendering: 'pixelated', ...(showBackdrop ? { background: 'var(--color-sky-night-1, #122534)' } : {}) }}
    aria-label="Ваш синоптик Станции 26063 в выбранной экипировке"
    data-avatar-renderer="modular-r01" data-avatar-rig={composite.manifest.rigId} data-avatar-revision={composite.manifest.revision}
    data-avatar-direction={composite.direction} data-avatar-action={composite.action} data-avatar-requested-action={requestedAction}
    data-avatar-composite={composite.key} />;
}
