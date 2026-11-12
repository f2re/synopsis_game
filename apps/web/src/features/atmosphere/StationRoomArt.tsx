import { useEffect, useState, type CSSProperties } from 'react';
import './station-room-art.css';

export interface StationRoomArtProps {
  /** Decorative weather chosen by the atmosphere settings; never an observation. */
  rain: boolean;
  reducedMotion: boolean;
  className?: string;
}

const ASSET_ROOT = '/assets/atmosphere/station-room-r01';
const DROPS = [48, 52, 56, 61, 65, 69, 73, 77, 81, 85, 90, 95] as const;

/** A reusable reading-room vignette. Weather remains behind its actual window. */
export function StationRoomArt({ rain, reducedMotion, className = '' }: StationRoomArtProps) {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return (
    <div
      className={`station-room-art ${className}`.trim()}
      role="img"
      aria-label={rain
        ? 'Тихая читальня станции: книга, тёплый свет лампы и дождь за окном.'
        : 'Тихая читальня станции: книга, тёплый свет лампы и вид на залив.'}
      data-raining={rain ? 'true' : 'false'}
      data-paused={reducedMotion || hidden ? 'true' : 'false'}
    >
      <img className="station-room-art__window" src={`${ASSET_ROOT}/window-view.png`} alt="" width={512} height={288} draggable={false} />
      {rain && (
        <div className="station-room-art__rain" aria-hidden="true">
          {!reducedMotion && DROPS.map((left, index) => (
            <i
              key={left}
              className="station-room-art__drop"
              style={{
                left: `${left}%`,
                '--drop-delay': `${-(index * 0.23)}s`,
                '--drop-duration': `${1.6 + (index % 4) * 0.19}s`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}
      <img className="station-room-art__interior" src={`${ASSET_ROOT}/room-front.png`} alt="" width={512} height={288} draggable={false} />
    </div>
  );
}
