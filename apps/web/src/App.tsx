import { WorldCanvas } from './WorldCanvas';

export function App() {
  return (
    <main className="app-shell">
      <section className="prototype-card" aria-labelledby="prototype-title">
        <header className="prototype-header">
          <div>
            <span className="prototype-kicker">Прототип 0.1</span>
            <h1 id="prototype-title">Живой кампус</h1>
          </div>
          <div className="prototype-status" aria-label="Состояние первого среза">
            <span className="status-dot" aria-hidden="true" />
            Hub → Архив
          </div>
        </header>

        <WorldCanvas />

        <footer className="prototype-footer">
          <p>
            Архив доступен. Остальные локации показывают условия открытия. Графика пока использует
            процедурные пиксельные прототипы с постоянными идентификаторами ресурсов.
          </p>
          <p className="prototype-help">Кликните по Архиву или по закрытой локации, чтобы проверить состояния.</p>
        </footer>
      </section>
    </main>
  );
}
