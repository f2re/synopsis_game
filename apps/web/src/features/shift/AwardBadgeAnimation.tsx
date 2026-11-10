import { useEffect, useState, type CSSProperties } from 'react';
import { HUB_PREFERENCES_EVENT, readHubPreferences } from '../hub/hubPreferences';
import './AwardBadgeAnimation.css';

/** One short authored SpriteCook gleam, never a continuous task distraction. */
export function AwardBadgeAnimation({ badgeId, image, size = 88 }: { badgeId: string; image: string; size?: number }) {
  const [animate, setAnimate] = useState(false);
  const authored = image === '/assets/items/badge_first_shift.png';
  useEffect(() => {
    if (!authored) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preferences = readHubPreferences();
    setAnimate(!document.hidden && !media.matches && !preferences.reducedMotion && !preferences.lowPower);
    // Preferences/visibility may stop the celebration; they never replay it.
    const stop = () => setAnimate(false);
    const timer = window.setTimeout(stop, 1500);
    media.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    window.addEventListener(HUB_PREFERENCES_EVENT, stop);
    window.addEventListener('storage', stop);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
      window.removeEventListener(HUB_PREFERENCES_EVENT, stop);
      window.removeEventListener('storage', stop);
    };
  }, [authored, badgeId]);
  const style = { '--award-size': `${size}px` } as CSSProperties;
  return <span className={`award-badge ${animate ? 'award-badge--animate' : ''}`} style={style} aria-hidden="true" data-award-animation={animate ? 'playing' : 'still'}>
    <img src={image} alt="" width={size} height={size} />
    {animate && <span className="award-badge__frames" />}
  </span>;
}
