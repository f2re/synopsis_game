import { useEffect, useMemo, useRef, useState } from 'react';
import libraryData from '../../../../../content/library/synoptic_library.json';
import sourceRegistry from '../../../../../content/sources/sources.json';
import { PixelIcon } from '../ui';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import { Codebook } from '../codebook/Codebook';
import { parseLibraryFavorites, searchLibrary } from './librarySearch';
import './library.css';
import { StationRoomArt } from '../atmosphere/StationRoomArt';
import { useAmbientWeather } from '../atmosphere/AtmosphereProvider';
import { usePresentationPreferences } from '../settings/settingsStore';

export interface LibraryScreenProps {
  onBack: () => void;
  initialQuery?: string;
  onOpenCodebook?: () => void;
}

const FAVORITES_KEY = 'synopsis_26063_library_favorites_v1';
const articleIds = new Set(libraryData.articles.map(article => article.id));
const sourceById = new Map(sourceRegistry.sources.map(source => [source.id, source]));
const articles = libraryData.articles;
type Article = (typeof articles)[number];

function loadFavorites(): string[] {
  try { return parseLibraryFavorites(localStorage.getItem(FAVORITES_KEY), articleIds); }
  catch { return []; }
}

function SourceList({ article }: { article: Article }) {
  return (
    <section className="library-sources" aria-labelledby="library-sources-heading">
      <h3 id="library-sources-heading">Источники и область применения</h3>
      <ul>
        {article.sources.map((reference, index) => {
          const source = sourceById.get(reference.source_id);
          if (!source) return null;
          const url = source.url || (source.id === 'ZVEREV_1977' ? 'https://djvu.online/file/xhZZFjpf3uPUm' : undefined);
          return (
            <li key={`${reference.source_id}-${index}`}>
              {url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.title}<span className="library-external" aria-label="Откроется в новой вкладке"> ↗</span></a> : <strong>{source.title}</strong>}
              <span>{'year' in source && source.year ? `Издание ${source.year} · ` : ''}{reference.locator}</span>
            </li>
          );
        })}
      </ul>
      {article.scope && <p>{article.scope}</p>}
    </section>
  );
}

export function LibraryScreen({ onBack, initialQuery = '', onOpenCodebook }: LibraryScreenProps) {
  const weather = useAmbientWeather();
  const preferences = usePresentationPreferences();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(loadFavorites);
  const [selectedId, setSelectedId] = useState(() => searchLibrary(articles, initialQuery)[0]?.id ?? articles[0].id);
  const [readerOpen, setReaderOpen] = useState(false);
  const [codebookOpen, setCodebookOpen] = useState(false);
  const [status, setStatus] = useState('');
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const catalogViewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setCategory('all');
    setFavoritesOnly(false);
    setReaderOpen(false);
  }, [initialQuery]);

  useEffect(() => {
    if (catalogViewport.current) catalogViewport.current.scrollTop = 0;
  }, [query, category, favoritesOnly]);

  const results = useMemo(() => searchLibrary(articles, query).filter(article =>
    (category === 'all' || article.category === category) && (!favoritesOnly || favoriteIds.includes(article.id)),
  ), [query, category, favoritesOnly, favoriteIds]);
  const selected = results.find(article => article.id === selectedId) ?? results[0];
  const selectedCategory = libraryData.categories.find(item => item.id === selected?.category);

  function readArticle(id: string) {
    setSelectedId(id);
    setReaderOpen(true);
    // Focus follows the explicit reading action; typing in search never steals focus.
    window.requestAnimationFrame(() => articleHeading.current?.focus());
  }

  function openRelated(id: string) {
    setQuery('');
    setCategory('all');
    setFavoritesOnly(false);
    readArticle(id);
  }

  function toggleFavorite(id: string) {
    const removing = favoriteIds.includes(id);
    const next = removing ? favoriteIds.filter(value => value !== id) : [...favoriteIds, id];
    setFavoriteIds(next);
    if (removing && favoritesOnly && results.length === 1) {
      setReaderOpen(false);
      window.requestAnimationFrame(() => searchInput.current?.focus());
    }
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setStatus(removing ? 'Закладка удалена.' : 'Закладка сохранена в этом браузере.');
    } catch {
      setStatus('Закладка действует до закрытия страницы: браузер не разрешил её сохранить.');
    }
  }

  function resetFilters() {
    setQuery(''); setCategory('all'); setFavoritesOnly(false); setReaderOpen(false);
    searchInput.current?.focus();
  }

  return (
    <main className="library-screen" aria-labelledby="library-title" data-reading={readerOpen && Boolean(selected)}>
      <div className="library-shell">
        <header className="library-header">
          <div className="library-heading-group">
            <PixelIcon name="library" size={64} alt="" />
            <div>
              <p className="library-eyebrow">26063 · Читальный зал</p>
              <h1 id="library-title">Библиотека синоптика</h1>
              <p className="library-lead">Найдите понятие, разберите обозначение или спокойно почитайте перед сменой.</p>
            </div>
          </div>
          <button type="button" className="library-button library-back" onClick={onBack}>← Назад</button>
        </header>

        <section className="library-controls" aria-label="Поиск по библиотеке">
          <div className="library-search-line">
            <label className="library-search-label" htmlFor="library-search">
              <span>Что хотите найти?</span>
              <input id="library-search" ref={searchInput} type="search" value={query}
                placeholder="Например: точка росы, Td, АТ500…" autoComplete="off" maxLength={160}
                onChange={event => { setQuery(event.target.value); setReaderOpen(false); }} />
            </label>
            <button type="button" className="library-button library-bookmarks" aria-pressed={favoritesOnly}
              onClick={() => { setFavoritesOnly(value => !value); setReaderOpen(false); }}>
              <span aria-hidden="true">{favoritesOnly ? '★' : '☆'}</span> Избранное <span className="library-count">{favoriteIds.length}</span>
            </button>
          </div>
          <nav className="library-categories" aria-label="Разделы библиотеки">
            <button type="button" aria-pressed={category === 'all'} onClick={() => { setCategory('all'); setReaderOpen(false); }}>Все темы</button>
            {libraryData.categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id}
              onClick={() => { setCategory(item.id); setReaderOpen(false); }}>{item.title}</button>)}
          </nav>
        </section>

        <div className="library-body">
          <section className="library-catalog" aria-labelledby="library-catalog-heading">
            <div className="library-catalog-heading">
              <h2 id="library-catalog-heading">{favoritesOnly ? 'Ваши закладки' : 'Каталог'}</h2>
              <span role="status" aria-live="polite">{results.length} из {articles.length}</span>
            </div>
            <div className="library-catalog-scene"><StationRoomArt rain={weather === 'rain'} reducedMotion={preferences.reducedMotion || preferences.lowPower} /></div>
            {results.length ? <PixelScrollArea className="library-catalog-scroll" label="Каталог библиотеки" viewportRef={catalogViewport}><ul className="library-results">
              {results.map(article => <li key={article.id}>
                <button type="button" className="library-result" aria-current={selected?.id === article.id ? 'true' : undefined}
                  onClick={() => readArticle(article.id)}>
                  <span className="library-result-title">{article.title}{favoriteIds.includes(article.id) && <span aria-label="В избранном"> ★</span>}</span>
                  <span className="library-result-description">{article.summary}</span>
                </button>
              </li>)}
            </ul></PixelScrollArea> : <div className="library-empty">
              <PixelIcon name="archive" size={48} alt="" />
              <h3>{favoritesOnly && !query ? 'Здесь будут ваши закладки' : 'Ничего не найдено'}</h3>
              <p>{favoritesOnly && !query ? 'Откройте статью и нажмите «В избранное». Она останется под рукой в этом браузере.' : 'Попробуйте короткое название, обозначение или другой раздел.'}</p>
              <button type="button" className="library-button" onClick={resetFilters}>Показать все темы</button>
            </div>}
          </section>

          {selected ? <article className="library-reader" aria-labelledby="library-article-heading">
            <button type="button" className="library-reader-back" onClick={() => { setReaderOpen(false); searchInput.current?.focus(); }}>← К каталогу</button>
            <div className="library-article-topline">
              <span>{selectedCategory?.title}</span>
              <button type="button" className="library-favorite" aria-pressed={favoriteIds.includes(selected.id)}
                onClick={() => toggleFavorite(selected.id)}>
                <span aria-hidden="true">{favoriteIds.includes(selected.id) ? '★' : '☆'}</span>
                {favoriteIds.includes(selected.id) ? 'В избранном' : 'В избранное'}
              </button>
            </div>
            <h2 id="library-article-heading" ref={articleHeading} tabIndex={-1}>{selected.title}</h2>
            <p className="library-definition">{selected.summary}</p>
            {selected.symbol && <div className="library-symbol" aria-label="Обозначение">{selected.symbol}</div>}
            <div className="library-explanation">{selected.paragraphs.map((paragraph, index) => <p key={`${selected.id}-${index}`}>{paragraph}</p>)}</div>
            <aside className="library-tip" aria-label="Приём работы">
              <PixelIcon name="help" size={32} alt="" />
              <div><h3>Приём работы</h3><p>{selected.tip}</p></div>
            </aside>
            <SourceList article={selected} />
            <nav className="library-related" aria-label="Связанные понятия">
              <h3>Рядом на полке</h3>
              <div>{selected.related.map(id => {
                const related = articles.find(article => article.id === id);
                return related ? <button key={id} type="button" onClick={() => openRelated(id)}>{related.title} →</button> : null;
              })}</div>
            </nav>
          </article> : <div className="library-reader library-reader-placeholder" aria-hidden="true"><PixelIcon name="library" size={128} alt="" /></div>}
        </div>

        <footer className="library-footer">
          <p>Статьи доступны без входа. Закладки хранятся в этом браузере.</p>
          <button type="button" className="library-button" onClick={onOpenCodebook ?? (() => setCodebookOpen(true))}>Открыть таблицы КН-01 →</button>
        </footer>
        <p className="library-save-status" role="status" aria-live="polite">{status}</p>
      </div>
      {codebookOpen && <Codebook isOpen onClose={() => setCodebookOpen(false)} />}
    </main>
  );
}
