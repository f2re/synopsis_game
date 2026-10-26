import { GAME_MARK, GAME_TITLE } from './brand';
import { WorldCanvas } from './game/WorldCanvas';

function ArenaTvPlaceholder() {
  return (
    <main className="arena-tv-placeholder" aria-labelledby="arena-title">
      <section>
        <span>{GAME_MARK} · режим большого экрана</span>
        <h1 id="arena-title">Arena TV</h1>
        <p>Зрительский экран будет подключён после первого игрового среза.</p>
      </section>
    </main>
  );
}

export function App() {
  if (window.location.pathname === '/arena-tv') {
    return <ArenaTvPlaceholder />;
  }

  return (
    <main className="game-viewport" aria-label={GAME_TITLE}>
      <WorldCanvas />
    </main>
  );
}
