import { useEffect, useRef, useState } from 'react';
import {
  avatarFrameAtTime, avatarPreviewBounds, avatarProfileKey, drawAvatarComposite, modularAvatarCompositor, resolveAvatarPresentation,
  type AvatarAction, type AvatarComposite, type AvatarContext, type AvatarLease, type AvatarPresentation,
} from '@synopsis/world-engine/avatar';
import { HUB_PREFERENCES_EVENT, readHubPreferences } from '../hub/hubPreferences';
import { LegacyAvatarPreview, type AvatarPreviewProps as LegacyPreviewProps } from './LegacyAvatarPreview';

export type { AvatarDirection } from '@synopsis/world-engine/avatar';
export type AvatarAnimation = AvatarAction;
export interface AvatarPreviewProps extends Omit<LegacyPreviewProps, 'animate'> {
  onAvailableAnimations?: (actions: readonly AvatarAction[]) => void;
  context?: AvatarContext;
  equipment?: { heldItem: string } | null;
}

/** The same accepted composite used by Phaser; the old personal image is an explicit fallback. */
export function AvatarPreview(props: AvatarPreviewProps) {
  const { avatar, size = 224, direction, animation = 'idle', showBackdrop = true, context = 'wardrobe', equipment } = props;
  const fallback = resolveAvatarPresentation(avatar, { context, direction, action: animation, equipment });
  const key = `${avatarProfileKey(fallback.profile)}:${context}:${fallback.direction}:${animation}:${fallback.equipmentSource}`;
  const [loaded, setLoaded] = useState<{ key: string; presentation: AvatarPresentation; lease: AvatarLease<AvatarComposite> } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const capabilities = useRef(props.onAvailableAnimations);
  capabilities.current = props.onAvailableAnimations;
  useEffect(() => {
    let active = true;
    let current: AvatarLease<AvatarComposite> | undefined;
    void modularAvatarCompositor.acquirePresentation(avatar, { context, direction, action: animation, equipment }).then(({ lease, presentation }) => {
      if (!active) { lease.release(); return; }
      current = lease;
      setLoaded({ key, lease, presentation });
      setFailure(null);
      capabilities.current?.(presentation.availableActions);
    }).catch((error: unknown) => {
      if (!active) return;
      setFailure({ key, message: error instanceof Error ? error.message : 'Modular avatar unavailable' });
      capabilities.current?.(['idle']);
    });
    return () => { active = false; current?.release(); };
  }, [key]);
  const current = loaded?.key === key ? loaded : null;
  if (!current) return <span className="avatar-renderer" data-avatar-renderer="personal-fallback" data-avatar-context={context}
    data-avatar-equipment-source={fallback.equipmentSource} data-avatar-error={failure?.key === key ? failure.message : 'loading-approved-manifest'} style={{ display: 'contents' }}>
    <LegacyAvatarPreview {...props} avatar={fallback.companionVisible ? fallback.profile : { ...fallback.profile, companion: 'companion.none' }} direction={fallback.direction} animation="idle" animate={false} />
  </span>;
  return <ModularAvatarCanvas composite={current.lease.value} presentation={current.presentation} size={size} showBackdrop={showBackdrop} onAnimationComplete={props.onAnimationComplete} />;
}

function ModularAvatarCanvas({ composite, presentation, size, showBackdrop, onAnimationComplete }: {
  composite: AvatarComposite; presentation: AvatarPresentation; size: number; showBackdrop: boolean; onAnimationComplete?: () => void;
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
    let elapsed = 0, sampledAt = performance.now(), displayedFrame = -1, done = false, disposed = false;
    let inView = typeof IntersectionObserver === 'undefined', playing = false;
    const stop = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; };
    const sample = () => {
      if (disposed) return;
      stop();
      const preferences = readHubPreferences();
      const reduced = preferences.reducedMotion || media?.matches === true;
      const now = performance.now();
      if (playing) elapsed += Math.max(0, now - sampledAt);
      sampledAt = now;
      const visible = !document.hidden && inView;
      const still = reduced || !presentation.animate || (done && !composite.clip.loop);
      const state = avatarFrameAtTime(composite.clip, elapsed, still);
      playing = visible && !still && !state.complete;
      if (state.frame !== displayedFrame) {
        drawAvatarComposite(context, composite, state.frame);
        canvas.dataset.frame = String(state.frame);
        displayedFrame = state.frame;
      }
      canvas.dataset.reducedMotion = String(reduced);
      canvas.dataset.lowPower = String(preferences.lowPower);
      canvas.dataset.animationPaused = String(!playing);
      canvas.dataset.offscreen = String(!inView);
      if ((state.complete || presentation.requestedAction !== composite.action) && !done) {
        done = true;
        complete.current?.();
      }
      if (!playing) return;
      const total = composite.clip.durationsMs.reduce((sum, ms) => sum + ms, 0);
      const until = composite.clip.durationsMs.slice(0, state.frame + 1).reduce((sum, ms) => sum + ms, 0) - elapsed % total;
      timer = window.setTimeout(sample, Math.max(preferences.lowPower ? 250 : 16, until));
    };
    sample();
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      const entry = entries.find((candidate) => candidate.target === canvas);
      if (!entry || disposed) return;
      inView = entry.isIntersecting && entry.intersectionRatio > 0;
      sample();
    });
    observer?.observe(canvas);
    media?.addEventListener('change', sample);
    document.addEventListener('visibilitychange', sample);
    window.addEventListener(HUB_PREFERENCES_EVENT, sample);
    window.addEventListener('storage', sample);
    return () => {
      disposed = true; stop(); observer?.disconnect(); media?.removeEventListener('change', sample);
      document.removeEventListener('visibilitychange', sample);
      window.removeEventListener(HUB_PREFERENCES_EVENT, sample);
      window.removeEventListener('storage', sample);
    };
  }, [composite, presentation]);
  return <canvas ref={canvasRef} className="avatar-preview" width={bounds.width} height={bounds.height}
    style={{ width: size, height: Math.round(size * 1.5), objectFit: 'contain', objectPosition: 'center bottom', imageRendering: 'pixelated', ...(showBackdrop ? { background: 'var(--color-sky-night-1, #122534)' } : {}) }}
    aria-label="Ваш синоптик Станции 26063 в выбранной экипировке"
    data-avatar-renderer="modular-r01" data-avatar-rig={composite.manifest.rigId} data-avatar-revision={composite.manifest.revision}
    data-avatar-context={presentation.context} data-avatar-equipment-source={presentation.equipmentSource}
    data-avatar-companion-visible={presentation.companionVisible} data-avatar-motion={presentation.motion}
    data-avatar-profile={avatarProfileKey(presentation.profile)}
    data-avatar-direction={composite.direction} data-avatar-action={composite.action} data-avatar-requested-action={presentation.requestedAction}
    data-avatar-composite={composite.key} />;
}
