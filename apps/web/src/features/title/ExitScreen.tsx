import { GAME_MARK } from '../../brand';
import { HubIcon } from '../hub/HubIcon';
import './station-screens.css';

export function ExitScreen({ onReturn, notice }: { onReturn: () => void; notice?: string }) {
  return <main className="station-page station-exit" aria-labelledby="exit-title"><section className="station-exit__card">
    <div className="station-exit__mark" aria-hidden="true">{GAME_MARK}</div>
    <h1 id="exit-title" tabIndex={-1}>До следующей смены</h1>
    <p>Вы вышли из игры. Музыка и фоновые звуки остановлены.<br />Теперь можно закрыть вкладку браузера.</p>
    <p>Результаты и сохранённый персонаж остаются в вашем профиле.</p>
    {notice && <p className="station-notice" role="status">{notice}</p>}
    <button type="button" className="station-menu-button station-menu-button--primary" onClick={onReturn}><HubIcon name="map" size={36} /><span>Вернуться на станцию</span></button>
  </section></main>;
}
