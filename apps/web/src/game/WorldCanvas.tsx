import { useEffect, useRef } from 'react';
import { createWorldGame } from '@synopsis/world-engine';

export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const game = createWorldGame({ parent: host });

    const handleVisibility = () => {
      if (document.hidden) {
        game.loop.sleep();
      } else {
        game.loop.wake();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
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
