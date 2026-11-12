import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import codebookData from '../../../../../content/codebook/kn01_level1.json';
import sources from '../../../../../content/sources/sources.json';
import { PixelIcon } from '../ui';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import { keepTabInDialog } from '../ui/modalFocus';
import { normalizeLibraryQuery } from '../library/librarySearch';
import './codebook.css';

export interface CodebookProps {
  isOpen: boolean;
  onClose: () => void;
  shiftMode?: 'mentor' | 'solo' | 'blitz' | 'exam';
  onHandbookOpen?: () => void;
}

export function Codebook({ isOpen, onClose, shiftMode = 'mentor', onHandbookOpen }: CodebookProps) {
  const [selectedId, setSelectedId] = useState(codebookData.pages[0].id);
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusArticle = useRef(false);
  const [selection, setSelection] = useState(0);
  const titleId = useId();
  const pageTitleId = useId();
  const searchId = useId();
  const notified = useRef(false);
  const locked = shiftMode === 'blitz' || shiftMode === 'exam';
  const normalized = normalizeLibraryQuery(query);
  const pages = codebookData.pages.filter(page => normalizeLibraryQuery(`${page.groupId} ${page.title} ${page.rule}`).includes(normalized));
  const current = pages.find(page => page.id === selectedId) ?? pages[0];
  const source = sources.sources.find(item => item.id === current?.sourceId);

  useEffect(() => {
    if (!isOpen) { notified.current = false; return; }
    if (!locked && !notified.current) { notified.current = true; onHandbookOpen?.(); }
  }, [isOpen, locked, onHandbookOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus(); };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !focusArticle.current || !headingRef.current) return;
    focusArticle.current = false;
    // Only explicit selection moves focus; typing in search keeps its caret.
    headingRef.current.focus({ preventScroll: true });
    const viewport = viewportRef.current;
    if (viewport) {
      const article = headingRef.current.closest('article');
      if (article) viewport.scrollTo({ top: viewport.scrollTop + article.getBoundingClientRect().top - viewport.getBoundingClientRect().top, behavior: 'instant' });
    }
  }, [isOpen, selection]);

  if (!isOpen) return null;
  return (
    <dialog ref={dialogRef} className="codebook-dialog" tabIndex={-1} aria-labelledby={titleId} onKeyDown={keepTabInDialog}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="codebook-header">
        <div><PixelIcon name="manuals" size={32} alt="" /><h2 id={titleId}>Наставление КН-01</h2></div>
        <button type="button" onClick={onClose} className="codebook-button" aria-label="Закрыть справочник" autoFocus>Закрыть ×</button>
      </header>
      {locked ? <PixelScrollArea label="Условия доступа к справочнику" className="codebook-scroll"><section className="codebook-locked">
        <PixelIcon name="archive" size={64} alt="" />
        <h3>Справочник закрыт на время задания</h3>
        <p>В режиме «{shiftMode === 'exam' ? 'Экзаменационный допуск' : 'Блиц'}» подсказки недоступны.</p>
        <button type="button" className="codebook-button" onClick={onClose}>Вернуться к заданию</button>
      </section></PixelScrollArea> : <>
        {shiftMode === 'solo' && <p className="codebook-notice">В самостоятельном режиме обращение к справочнику учитывается сервером при оценке текущего задания.</p>}
        <p className="codebook-scope">КН-01 · Издание 2013 года · Национальная практика Росгидромета</p>
        <PixelScrollArea label="Наставление КН-01" className="codebook-scroll" contentClassName="codebook-layout" viewportRef={viewportRef}>
          <nav className="codebook-nav" aria-label="Группы кода">
            <label htmlFor={searchId}>Найти группу</label>
            <input id={searchId} type="search" value={query} maxLength={120} autoComplete="off"
              placeholder="Температура, 1snTTT…" onChange={event => setQuery(event.target.value)} />
            <PixelScrollArea label="Группы кода" orientation="horizontal" contentClassName="codebook-page-links">
              {pages.map(page => <button type="button" key={page.id} aria-current={current?.id === page.id ? 'page' : undefined}
                onClick={() => { focusArticle.current = true; setSelectedId(page.id); setSelection(value => value + 1); }}><strong>{page.groupId}</strong><span>{page.title}</span></button>)}
            </PixelScrollArea>
            {!pages.length && <p role="status">Групп по такому запросу нет.</p>}
          </nav>
          {current ? <article className="codebook-page" aria-labelledby={pageTitleId}>
            <p className="codebook-page-group">Группа {current.groupId}</p>
            <h3 ref={headingRef} id={pageTitleId} tabIndex={-1}>{current.title}</h3>
            <div className="codebook-scheme">{current.scheme}</div>
            <h4>Как читать</h4>
            <p>{current.rule}</p>
            <h4>Примеры чтения кода</h4>
            <dl className="codebook-examples">{current.examples.map((example, index) => <div key={`${current.id}-${index}`}>
              <dt>{example.telegram}</dt><dd>{example.decoded}</dd>
            </div>)}</dl>
            <aside className="codebook-method"><h4>Уточнение</h4><p>{current.methodNotes}</p></aside>
            <section className="codebook-source"><h4>Источник</h4>
              {source?.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : <span>{source?.title ?? current.sourceId}</span>}
              <p>{current.sourceLocator}</p>
            </section>
          </article> : <section className="codebook-page codebook-empty"><h3>Попробуйте другой запрос</h3><p>Можно искать по названию, обозначению или тексту правила.</p><button type="button" className="codebook-button" onClick={() => setQuery('')}>Все группы</button></section>}
        </PixelScrollArea>
      </>}
    </dialog>
  );
}

export default Codebook;
