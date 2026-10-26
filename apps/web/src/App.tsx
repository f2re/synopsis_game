import { GAME_MARK, GAME_TITLE } from './brand';
import { WorldCanvas } from './game/WorldCanvas';

function ArenaTvPlaceholder() {
  return (
    <main className="app-shell">
      <section className="prototype-card prototype-placeholder" aria-labelledby="arena-title">
        <span className="prototype-kicker">{GAME_MARK} · режим большого экрана</span>
        <h1 id="arena-title">Arena TV</h1>
        <p>Маршрут закреплён архитектурой. Зрительский экран будет подключён после первого игрового среза.</p>
      </section>
    </main>
  );
}

export function App() {
  if (window.location.pathname === '/arena-tv') {
    return <ArenaTvPlaceholder />;
  }

  return (
    <main className="app-shell">
      <section className="prototype-card" aria-labelledby="prototype-title">
        <header className="prototype-header">
          <div>
            <span className="prototype-kicker">Прототип 0.1 · {GAME_MARK}</span>
            <h1 id="prototype-title">{GAME_TITLE}</h1>
          </div>
          <div className="prototype-status" aria-label="Состояние первого среза">
            <span className="status-dot" aria-hidden="true" />
            Главный мир → Архив
          </div>
        </header>

        <WorldCanvas />

        <footer className="prototype-footer">
          <p>
            Архив доступен. Остальные локации показывают условия открытия. До появления финальных
            спрайтов сцена использует процедурные пиксельные объекты с постоянными идентификаторами.
          </p>
          <p className="prototype-help">Нажмите Архив или закрытую локацию, чтобы проверить состояния.</p>
        </footer>
      </section>
    </main>
  );
}
