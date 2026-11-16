import { useEffect, useState, type CSSProperties } from 'react';
import './station-room-art.css';

export interface StationRoomArtProps {
  /** Decorative weather chosen by the atmosphere settings; never an observation. */
  rain: boolean;
  reducedMotion: boolean;
  className?: string;
  presentation?: 'vignette' | 'scene';
  room?: 'reading' | 'telegraph' | 'synoptic';
}

const DROPS = [48, 52, 56, 61, 65, 69, 73, 77, 81, 85, 90, 95] as const;
const ROOMS = {
  reading: { root: '/assets/atmosphere/station-room-r01', label: 'Тихая читальня станции: книга, тёплый свет лампы', drops: DROPS },
  telegraph: { root: '/assets/atmosphere/workrooms-r01/telegraph', label: 'Телеграфная станции: телетайп, радиоприёмник и тёплая настольная лампа', drops: [18, 21, 24, 28, 31, 35, 39, 42, 46, 50, 54, 57] },
  synoptic: { root: '/assets/atmosphere/workrooms-r01/synoptic', label: 'Синоптическая комната: картографический стол, карты и зелёная лампа', drops: [5, 8, 11, 14, 17, 21, 25, 28, 32, 35, 39, 42] },
};

/** The same layered reading room supports a vignette and a full-screen scene. */
export function StationRoomArt({ rain, reducedMotion, className = '', presentation = 'vignette', room = 'reading' }: StationRoomArtProps) {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const art = ROOMS[room];

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return (
    <div
      className={`station-room-art${presentation === 'scene' ? ' station-room-art--scene' : ''} ${className}`.trim()}
      role="img"
      aria-label={`${art.label} и ${rain ? 'дождь за окном' : 'вид на залив'}.`}
      data-raining={rain ? 'true' : 'false'}
      data-paused={reducedMotion || hidden ? 'true' : 'false'}
      data-library-scene={presentation === 'scene' && room === 'reading' ? 'true' : undefined}
      data-room={room}
      style={{ '--room-glass-mask': `url('${art.root}/window-mask.png')` } as CSSProperties}
    >
      <div className="station-room-art__plane">
        <img className="station-room-art__window" src={`${art.root}/window-view.png`} alt="" width={512} height={288} draggable={false} />
        {rain && (
          <div className="station-room-art__rain" aria-hidden="true">
            {!reducedMotion && art.drops.map((left, index) => (
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
        <img className="station-room-art__interior" src={`${art.root}/room-front.png`} alt="" width={512} height={288} draggable={false} />
      </div>
    </div>
  );
}
