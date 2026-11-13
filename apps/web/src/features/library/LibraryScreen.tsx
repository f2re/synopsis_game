import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react';
import libraryData from '../../../../../content/library/synoptic_library.json';
import sourceRegistry from '../../../../../content/sources/sources.json';
import { PixelIcon } from '../ui';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import { Codebook } from '../codebook/Codebook';
import { parseLibraryFavorites, searchLibrary } from './librarySearch';
import { StationRoomArt } from '../atmosphere/StationRoomArt';
import { useAmbientWeather } from '../atmosphere/AtmosphereProvider';
import { usePresentationPreferences, useSettings, updateSettings } from '../settings/settingsStore';
import './library.css';

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
interface ReadingPosition { block: string | null; offset: number; scrollTop: number }

function loadFavorites(): string[] {
  try { return parseLibraryFavorites(localStorage.getItem(FAVORITES_KEY), articleIds); }
  catch { return []; }
}

function SourceList({ article, headingRef }: { article: Article; headingRef: Ref<HTMLHeadingElement> }) {
  return <section className="library-sources" aria-labelledby="library-sources-heading" data-reading-block="sources">
    <h3 id="library-sources-heading" ref={headingRef} tabIndex={-1}>Источники и область применения</h3>
    <ul>
      {article.sources.map((reference, index) => {
        const source = sourceById.get(reference.source_id);
        if (!source) return null;
        const url = source.url || (source.id === 'ZVEREV_1977' ? 'https://djvu.online/file/xhZZFjpf3uPUm' : undefined);
        return <li key={`${reference.source_id}-${index}`}>
          {url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.title}<span className="library-external" aria-label="Откроется в новой вкладке"> ↗</span></a> : <strong>{source.title}</strong>}
          <span>{'year' in source && source.year ? `Издание ${source.year} · ` : ''}{reference.locator}</span>
        </li>;
      })}
    </ul>
    {article.scope && <p>{article.scope}</p>}
  </section>;
}

export function LibraryScreen({ onBack, initialQuery = '', onOpenCodebook }: LibraryScreenProps) {
  const weather = useAmbientWeather();
  const preferences = usePresentationPreferences();
  const settings = useSettings();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(loadFavorites);
  const [selectedId, setSelectedId] = useState(() => searchLibrary(articles, initialQuery)[0]?.id ?? articles[0].id);
  const [readerOpen, setReaderOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [codebookOpen, setCodebookOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [storageError, setStorageError] = useState(false);
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const sourceHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const catalogViewport = useRef<HTMLDivElement>(null);
  const readerViewport = useRef<HTMLDivElement>(null);
  const catalogPosition = useRef(0);
  const catalogSelection = useRef<string | null>(null);
  const readingPositions = useRef(new Map<string, ReadingPosition>());
  const previousReaderState = useRef({ open: false, id: '', expanded: false });

  const results = useMemo(() => searchLibrary(articles, query).filter(article =>
    (category === 'all' || article.category === category) && (!favoritesOnly || favoriteIds.includes(article.id)),
  ), [query, category, favoritesOnly, favoriteIds]);
  const selected = articles.find(article => article.id === selectedId) ?? articles[0];
  const selectedCategory = libraryData.categories.find(item => item.id === selected.category);

  useEffect(() => {
    setQuery(initialQuery);
    setCategory('all');
    setFavoritesOnly(false);
    setReaderOpen(false);
    setExpanded(false);
    catalogPosition.current = 0;
    catalogSelection.current = null;
  }, [initialQuery]);

  useLayoutEffect(() => {
    catalogPosition.current = 0;
    if (catalogViewport.current) catalogViewport.current.scrollTop = 0;
  }, [query, category, favoritesOnly]);

  // Restore a visible paragraph, rather than only a pixel offset: expanding the
  // book changes line wrapping. Each article keeps its own reading position.
  useLayoutEffect(() => {
    const previous = previousReaderState.current;
    previousReaderState.current = { open: readerOpen, id: selected.id, expanded };
    if (!readerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const viewport = readerViewport.current;
      if (!viewport) return;
      const position = readingPositions.current.get(selected.id);
      viewport.scrollTop = position?.scrollTop ?? 0;
      if (position?.block) {
        const block = viewport.querySelector<HTMLElement>(`[data-reading-block="${position.block}"]`);
        if (block) viewport.scrollTop += block.getBoundingClientRect().top - viewport.getBoundingClientRect().top - position.offset;
      }
      if (!previous.open || previous.id !== selected.id) {
        if (position && viewport.scrollTop > 1) {
          // The heading may be above the restored paragraph. Keep keyboard
          // focus in the visible reading area instead of off screen.
          if (!viewport.hasAttribute('tabindex')) viewport.tabIndex = -1;
          viewport.focus({ preventScroll: true });
        } else articleHeading.current?.focus({ preventScroll: true });
      }
      else if (previous.expanded !== expanded) expandButton.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [readerOpen, selected.id, expanded]);

  function rememberReadingPosition() {
    const viewport = readerViewport.current;
    if (!readerOpen || !viewport) return;
    const top = viewport.getBoundingClientRect().top;
    const block = [...viewport.querySelectorAll<HTMLElement>('[data-reading-block]')]
      .find(element => element.getBoundingClientRect().bottom > top + 1);
    readingPositions.current.set(selected.id, {
      block: block?.dataset.readingBlock ?? null,
      offset: block ? block.getBoundingClientRect().top - top : 0,
      scrollTop: viewport.scrollTop,
    });
  }

  function readArticle(id: string, fromCatalog = true) {
    rememberReadingPosition();
    if (fromCatalog) {
      catalogPosition.current = catalogViewport.current?.scrollTop ?? 0;
      catalogSelection.current = id;
      setExpanded(false);
    }
    setSelectedId(id);
    setReaderOpen(true);
    setStatus('');
    setStorageError(false);
  }

  function returnToCatalog() {
    rememberReadingPosition();
    setReaderOpen(false);
    setExpanded(false);
    window.requestAnimationFrame(() => {
      const viewport = catalogViewport.current;
      if (viewport) viewport.scrollTop = catalogPosition.current;
      const button = catalogSelection.current
        ? viewport?.querySelector<HTMLButtonElement>(`[data-article-id="${catalogSelection.current}"]`)
        : null;
      (button ?? searchInput.current)?.focus({ preventScroll: true });
    });
  }

  function toggleExpanded() {
    rememberReadingPosition();
    setExpanded(value => !value);
  }

  function showSources() {
    const heading = sourceHeading.current;
    const viewport = readerViewport.current;
    if (!heading || !viewport) return;
    viewport.scrollTop += heading.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 8;
    heading.focus({ preventScroll: true });
  }

  function toggleFavorite(id: string) {
    const removing = favoriteIds.includes(id);
    const next = removing ? favoriteIds.filter(value => value !== id) : [...favoriteIds, id];
    setFavoriteIds(next);
    if (removing && favoritesOnly && results.length === 1) {
      rememberReadingPosition();
      setReaderOpen(false);
      setExpanded(false);
      window.requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
    }
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setStorageError(false);
      setStatus(removing ? 'Закладка удалена.' : 'Закладка сохранена в этом браузере.');
    } catch {
      setStorageError(true);
      setStatus('Браузер не разрешил сохранить закладки. Изменение действует, пока открыта библиотека.');
    }
  }

  function resetFilters() {
    setQuery(''); setCategory('all'); setFavoritesOnly(false);
    searchInput.current?.focus({ preventScroll: true });
  }

  return <main className="station-interior-screen library-screen" aria-labelledby="library-title"
    data-reading={readerOpen} data-expanded={expanded}
    onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || codebookOpen) return;
      if (expanded) { event.preventDefault(); toggleExpanded(); }
      else if (readerOpen) { event.preventDefault(); returnToCatalog(); }
    }}>
    <StationRoomArt presentation="scene" rain={weather === 'rain'} reducedMotion={preferences.reducedMotion || preferences.lowPower} />
    <nav className="station-interior-nav" aria-label="Читальный зал" data-scene-occluder>
      <button type="button" className="station-interior-button library-back" onClick={onBack}>← Назад</button>
      <button type="button" className="station-interior-button station-sound-button" aria-pressed={settings.soundEnabled}
        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}>
        {settings.soundEnabled ? 'Выключить звук' : 'Включить звук'}
      </button>
    </nav>

    <section className="station-interior-desk library-desk" aria-label="Картотека и книга" data-scene-occluder data-storage-error={storageError}>
      <header className="library-header">
        <h1 id="library-title">Библиотека синоптика</h1>
        <span className="library-desk-label" aria-hidden="true">{readerOpen ? 'КНИГА НА СТОЛЕ' : 'КАРТОТЕКА'}</span>
      </header>

      <div className="library-catalog-pane" hidden={readerOpen}>
        <section className="library-controls" aria-label="Поиск по библиотеке">
          <label className="library-search-label" htmlFor="library-search">
            <span className="library-visually-hidden">Что хотите найти?</span>
            <input id="library-search" ref={searchInput} type="search" value={query}
              placeholder="Понятие или обозначение…" autoComplete="off" maxLength={160}
              onChange={event => setQuery(event.target.value)} />
          </label>
          <button type="button" className="library-button library-bookmarks" aria-label={`Избранное: ${favoriteIds.length}`}
            aria-pressed={favoritesOnly} title="Избранное" onClick={() => setFavoritesOnly(value => !value)}>
            <span aria-hidden="true">{favoritesOnly ? '★' : '☆'}</span><span className="library-count" aria-hidden="true">{favoriteIds.length}</span>
          </button>
        </section>
        <PixelScrollArea className="library-catalog-scroll" label="Каталог библиотеки" viewportRef={catalogViewport}>
          <div className="library-catalog-heading">
            <label className="library-category-label">
              <span id="library-category-label" className="library-visually-hidden">Раздел библиотеки</span>
              <select aria-labelledby="library-category-label" value={category} onChange={event => setCategory(event.target.value)}>
                <option value="all">Все темы</option>
                {libraryData.categories.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <span className="library-result-count" role="status" aria-live="polite">{results.length} из {articles.length}</span>
          </div>
          {results.length ? <ul className="library-results">
            {results.map(article => <li key={article.id}>
              <button type="button" className="library-result" data-article-id={article.id}
                aria-current={selected.id === article.id ? 'true' : undefined} onClick={() => readArticle(article.id)}>
                <span className="library-result-title">{article.title}{favoriteIds.includes(article.id) && <span aria-label="В избранном"> ★</span>}</span>
                <span className="library-result-description">{article.summary}</span>
              </button>
            </li>)}
          </ul> : <div className="library-empty">
            <h2>{favoritesOnly && !query ? 'Здесь будут ваши закладки' : 'Ничего не найдено'}</h2>
            <p>{favoritesOnly && !query ? 'Откройте статью и нажмите «В избранное».' : 'Попробуйте другое название или раздел.'}</p>
            <button type="button" className="library-button" onClick={resetFilters}>Показать все темы</button>
          </div>}
        </PixelScrollArea>
      </div>

      <div className="library-reading-pane" hidden={!readerOpen}>
        <div className="library-reader-toolbar">
          <button type="button" className="library-button library-reader-back" onClick={returnToCatalog}>← К каталогу</button>
          <button type="button" ref={expandButton} className="library-button library-expand" aria-expanded={expanded}
            aria-controls="library-book" onClick={toggleExpanded}>
            {expanded ? 'Свернуть чтение' : 'Развернуть чтение'}
          </button>
        </div>
        <PixelScrollArea className="library-reader-scroll" label="Статья библиотеки" viewportRef={readerViewport}>
          <article id="library-book" className="library-reader" aria-labelledby="library-article-heading">
            <p className="library-article-category" data-reading-block="category">{selectedCategory?.title}</p>
            <h2 id="library-article-heading" ref={articleHeading} tabIndex={-1} data-reading-block="heading">{selected.title}</h2>
            <p className="library-definition" data-reading-block="definition">{selected.summary}</p>
            {selected.symbol && <div className="library-symbol" aria-label="Обозначение" data-reading-block="symbol">{selected.symbol}</div>}
            <div className="library-explanation">{selected.paragraphs.map((paragraph, index) => <p key={`${selected.id}-${index}`} data-reading-block={`paragraph-${index}`}>{paragraph}</p>)}</div>
            <aside className="library-tip" aria-label="Приём работы" data-reading-block="tip">
              <PixelIcon name="help" size={24} alt="" />
              <div><h3>Приём работы</h3><p>{selected.tip}</p></div>
            </aside>
            <SourceList article={selected} headingRef={sourceHeading} />
            <nav className="library-related" aria-label="Связанные понятия" data-reading-block="related">
              <h3>Рядом на полке</h3>
              <div>{selected.related.map(id => {
                const related = articles.find(article => article.id === id);
                return related ? <button key={id} type="button" className="library-button" onClick={() => readArticle(id, false)}>{related.title} →</button> : null;
              })}</div>
            </nav>
          </article>
        </PixelScrollArea>
      </div>

      <footer className="library-footer">
        {readerOpen ? <>
          <button type="button" className="library-button library-favorite" aria-pressed={favoriteIds.includes(selected.id)}
            onClick={() => toggleFavorite(selected.id)}>
            <span aria-hidden="true">{favoriteIds.includes(selected.id) ? '★' : '☆'}</span>
            {favoriteIds.includes(selected.id) ? 'В избранном' : 'В избранное'}
          </button>
          <button type="button" className="library-button library-sources-link" onClick={showSources}>Источники</button>
        </> : <>
          <span className="library-footer-note">{favoritesOnly ? 'Ваши закладки' : 'Полка синоптика'}</span>
          <button type="button" className="library-button library-codebook" onClick={onOpenCodebook ?? (() => setCodebookOpen(true))}>Таблицы КН-01 →</button>
        </>}
      </footer>
      <p className={`library-save-status ${storageError ? 'library-storage-error' : 'library-visually-hidden'}`} role="status" aria-live="polite">{status}</p>
    </section>
    {codebookOpen && <Codebook isOpen onClose={() => setCodebookOpen(false)} />}
  </main>;
}
