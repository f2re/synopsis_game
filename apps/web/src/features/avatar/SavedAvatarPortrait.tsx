import type { AvatarPortrait } from '../../api';
import './saved-avatar-portrait.css';

interface SavedAvatarPortraitProps {
  portrait?: AvatarPortrait | null;
  size?: 40 | 80 | 160;
  label?: string;
  missingLabel?: string;
  unavailableLabel?: string;
}

/** No generation, profile conversion, asset loading or animation belongs here. */
export function isSavedAvatarPortrait(portrait: AvatarPortrait | null | undefined): portrait is AvatarPortrait {
  return Boolean(portrait && portrait.version === 1 && portrait.width === 160 && portrait.height === 160 &&
    typeof portrait.sha256 === 'string' && /^[a-f0-9]{64}$/.test(portrait.sha256) &&
    typeof portrait.pngDataUrl === 'string' && portrait.pngDataUrl.length <= 175_000 &&
    /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(portrait.pngDataUrl));
}

/** Gameplay renders exactly the server snapshot. A failed image stays a neutral placeholder. */
export function SavedAvatarPortrait({ portrait, size = 80, label = 'Сохранённый портрет',
  missingLabel = 'Портрет не сохранён. Сохраните персонажа в гардеробе.',
  unavailableLabel = 'Сохранённый портрет недоступен.' }: SavedAvatarPortraitProps) {
  const saved = isSavedAvatarPortrait(portrait) ? portrait : null;
  return <span key={saved?.sha256 ?? 'missing'} className="saved-avatar-portrait" role="img"
    aria-label={saved ? label : missingLabel} title={saved ? label : missingLabel}
    data-portrait-state={saved ? 'saved' : 'missing'} data-portrait-sha={saved?.sha256}
    data-portrait-revision={saved?.sourceRevision} style={{ width: size, height: size }}>
    {saved && <img src={saved.pngDataUrl} alt="" aria-hidden="true" width={size} height={size} draggable={false}
      onError={(event) => {
        const image = event.currentTarget;
        image.hidden = true;
        const container = image.parentElement;
        container?.setAttribute('data-portrait-state', 'unavailable');
        container?.setAttribute('aria-label', unavailableLabel);
        container?.setAttribute('title', unavailableLabel);
      }} />}
    <span className="saved-avatar-portrait__placeholder" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor" shapeRendering="crispEdges">
        <path d="M2 1h12v14H2V1Zm2 2v10h8V3H4Zm2 2h4v2H6V5ZM5 9h6v2H5V9Z" />
      </svg>
    </span>
  </span>;
}
