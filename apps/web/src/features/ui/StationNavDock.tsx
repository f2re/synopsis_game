import { HubIcon } from '../hub/HubIcon';

export type StationDockModalId = 'guide' | 'route' | 'journal' | 'settings' | 'profile' | null;

export interface StationNavDockProps {
  onStartShift: () => void;
  onOpenModal: (modal: Exclude<StationDockModalId, null>) => void;
  onOpenArchive: () => void;
  onOpenProfile: () => void;
  className?: string;
  currentScene?: string;
  sceneReady?: boolean;
}

/** R01: the central amber action is the only primary action on the campus. */
export function StationNavDock({
  onStartShift,
  onOpenModal,
  onOpenArchive,
  onOpenProfile,
  className = '',
  currentScene = 'hub',
  sceneReady = false,
}: StationNavDockProps) {
  const inArchive = currentScene === 'archive';
  return (
    <nav className={`hub-dock ${className}`.trim()} aria-label="Действия кампуса">
      <button type="button" className="hub-dock__button hub-dock__guide" onClick={() => onOpenModal('guide')}>
        <HubIcon name="guide" size={40} />
        <span><strong>Управление</strong><small>Клавиши и помощь</small></span>
        <span className="hub-dock__arrow" aria-hidden="true">›</span>
      </button>
      <button type="button" className="hub-dock__button hub-dock__route" onClick={() => onOpenModal('route')}>
        <HubIcon name="cartography" size={40} />
        <span><strong>Маршрут</strong><small>Помещения и задачи</small></span>
        <span className="hub-dock__arrow" aria-hidden="true">›</span>
      </button>
      <button type="button" className="hub-dock__button hub-dock__primary" onClick={onStartShift}>
        <HubIcon name="weather" size={48} />
        <span><strong>Начать смену</strong><small>КН-01 · приём дежурства</small></span>
        <span className="hub-dock__arrow" aria-hidden="true">›</span>
      </button>
      <button type="button" className="hub-dock__button hub-dock__archive" onClick={onOpenArchive} disabled={!sceneReady}>
        <HubIcon name={inArchive ? 'map' : 'archive'} size={40} />
        <span><strong>{inArchive ? 'На площадь' : 'Архив'}</strong><small>{inArchive ? 'Вернуться в кампус' : 'Открыть читальный зал'}</small></span>
        <span className="hub-dock__arrow" aria-hidden="true">›</span>
      </button>
      <button type="button" className="hub-dock__button hub-dock__profile" onClick={onOpenProfile}>
        <HubIcon name="student" size={40} />
        <span><strong>Инвентарь</strong><small>Персонаж и снаряжение</small></span>
        <span className="hub-dock__arrow" aria-hidden="true">›</span>
      </button>
    </nav>
  );
}
