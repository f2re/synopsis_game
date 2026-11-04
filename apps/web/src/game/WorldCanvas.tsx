import { useEffect, useRef } from 'react';
import { createWorldGame, HUB_BUILDINGS, worldBridge } from '@synopsis/world-engine';

export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const game = createWorldGame({ parent: host });
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
      game.destroy(true);
    };
  }, []);

  return (
    <>
      <div
        ref={hostRef}
        className="world-canvas-host"
        role="application"
        tabIndex={0}
        aria-label="Интерактивный пиксельный кампус. Нажмите Tab для выбора здания. Enter или пробел — перейти, Escape — закрыть досье."
      />
      <nav className="hub-keyboard-locations" aria-label="Клавиатурная навигация по зданиям кампуса">
        <span className="hub-keyboard-locations-title">Выберите здание</span>
        {HUB_BUILDINGS.map((building) => (
          <button
            key={building.id}
            type="button"
            className="hub-keyboard-location"
            data-hub-building-id={building.id}
            onClick={() => {
              worldBridge.emit('hub:visit_building', building.id);
              // Return focus to the Hub after keyboard selection so its
              // animation remains visible; the next Tab reopens the list.
              hostRef.current?.focus();
            }}
          >
            {building.name}
          </button>
        ))}
      </nav>
    </>
  );
}
