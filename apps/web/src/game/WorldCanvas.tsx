import { useEffect, useRef } from 'react';
import {
  createWorldGame,
  worldBridge,
  type HubRendererMode,
  type PixelPipelineToggles,
} from '@synopsis/world-engine';

function readRendererMode(): HubRendererMode {
  if (typeof window === 'undefined') return 'legacy2d';
  return new URLSearchParams(window.location.search).get('hubRenderer') === 'three2d'
    ? 'three2d'
    : 'legacy2d';
}

function readPipelineToggles(): Partial<PixelPipelineToggles> | undefined {
  if (typeof window === 'undefined') return undefined;
  const style = new URLSearchParams(window.location.search).get('hubStyle');
  switch (style) {
    case 'raw':
      return { palette: false, dithering: false, edges: false };
    case 'palette':
      return { palette: true, dithering: false, edges: false };
    case 'dither':
      return { palette: true, dithering: true, edges: false };
    case 'edges':
      return { palette: true, dithering: true, edges: true };
    default:
      return undefined;
  }
}

function enableHubReviewMode(host: HTMLElement): () => void {
  const viewport = host.closest<HTMLElement>('.game-viewport');
  if (!viewport) return () => undefined;

  const hiddenSiblings = Array.from(viewport.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child !== host,
  );
  const previousDisplays = hiddenSiblings.map((element) => [element, element.style.display] as const);

  for (const element of hiddenSiblings) element.style.display = 'none';
  host.dataset.reviewMode = 'style-lab';

  return () => {
    for (const [element, display] of previousDisplays) element.style.display = display;
    delete host.dataset.reviewMode;
  };
}

export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const disableReviewMode = params.get('hubReview') === '1'
      ? enableHubReviewMode(host)
      : () => undefined;
    const game = createWorldGame({
      parent: host,
      hubRenderer: readRendererMode(),
      hubDebugGeometryLock: params.get('hubGeometryDebug') === '1',
      hubPipelineToggles: readPipelineToggles(),
    });
    const unsubscribeStartShift = worldBridge.on('world:start_shift', () => {
      window.dispatchEvent(new CustomEvent('hub:start-shift'));
    });

    const handleVisibility = () => {
      if (document.hidden) {
        game.loop.sleep();
      } else {
        game.loop.wake();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribeStartShift();
      document.removeEventListener('visibilitychange', handleVisibility);
      disableReviewMode();
      game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="world-canvas-host"
      role="application"
      tabIndex={0}
      aria-label="Интерактивный пиксельный кампус. Tab — переход между локациями, Enter или пробел — выбор, Escape — закрыть выбор."
    />
  );
}
