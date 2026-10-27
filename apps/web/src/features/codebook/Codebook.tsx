import React, { useState, useEffect } from 'react';
import codebookData from '../../../../../content/codebook/kn01_level1.json';
import { Panel, Button, DigitAnatomy } from '../ui';

export interface CodebookProps {
  isOpen: boolean;
  onClose: () => void;
  shiftMode?: 'mentor' | 'solo' | 'blitz' | 'exam';
  onHandbookOpen?: () => void;
}

export function Codebook({
  isOpen,
  onClose,
  shiftMode = 'mentor',
  onHandbookOpen,
}: CodebookProps) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const pages = codebookData.pages;
  const isLockedMode = shiftMode === 'blitz' || shiftMode === 'exam';

  useEffect(() => {
    if (isOpen && !isLockedMode) {
      onHandbookOpen?.();
    }
  }, [isOpen, isLockedMode, onHandbookOpen]);

  if (!isOpen) return null;

  const filteredPages = pages.filter(
    (p) =>
      p.groupId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentPage = pages[selectedPageIndex] || pages[0];

  return (
    <div
      className="pixel-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codebook-title"
      style={{ zIndex: 1200 }}
    >
      <div
        className="pixel-panel pixel-panel--brass_dialog"
        style={{
          width: 'min(760px, 95vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-sky-night-1, #0E1A35)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Верхняя латунная планка заголовка */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            backgroundColor: 'var(--color-sky-night-2, #18284D)',
            borderBottom: '2px solid var(--color-action-accent-1, #F2C75C)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-action-accent-1, #F2C75C)' }}>📖</span>
            <h2 id="codebook-title" style={{ margin: 0, fontSize: '13px', color: 'var(--color-birch-and-snow-3, #F4F7FA)' }}>
              Справочник синоптика: Код КН-01 (Уровень 1)
            </h2>
          </div>
          <button
            type="button"
            className="pixel-dialog-close"
            onClick={onClose}
            aria-label="Закрыть справочник"
            style={{ fontSize: '18px', color: 'var(--color-birch-and-snow-3, #F4F7FA)' }}
          >
            ×
          </button>
        </div>

        {/* Предупреждение о режиме */}
        {isLockedMode ? (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              backgroundColor: 'rgba(214, 94, 94, 0.15)',
              borderBottom: '1px solid var(--color-states-error, #D65E5E)',
              color: 'var(--color-birch-and-snow-3, #F4F7FA)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--color-states-error, #D65E5E)', fontSize: '14px' }}>
              СПРАВОЧНИК ОПЕЧАТАН
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-stone-concrete-4, #B9BDC2)' }}>
              В режиме «{shiftMode === 'exam' ? 'Экзаменационный допуск' : 'Блиц'}» использование наставлений запрещено регламентом.
            </p>
            <div style={{ marginTop: '20px' }}>
              <Button variant="secondary" onClick={onClose}>
                Вернуться к заданию
              </Button>
            </div>
          </div>
        ) : (
          <>
            {shiftMode === 'solo' && (
              <div
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'rgba(216, 154, 82, 0.2)',
                  borderBottom: '1px solid var(--color-action-accent-0, #B88626)',
                  fontSize: '9px',
                  color: 'var(--color-action-accent-2, #FFDD83)',
                }}
              >
                ⚠️ Внимание: в режиме «Самостоятельно» обращение к справочнику фиксируется сервером и применяет множитель освоения 0.6 к текущему заданию.
              </div>
            )}

            {/* Тело справочника (Разворот) */}
            <div style={{ display: 'flex', flex: 1, minHeight: '380px', overflow: 'hidden' }}>
              {/* Левая колонка: Закладки групп и поиск */}
              <div
                style={{
                  width: '210px',
                  backgroundColor: 'var(--color-sky-night-0, #070D1E)',
                  borderRight: '1px solid var(--color-ui-teal-3, #367C8B)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ padding: '8px' }}>
                  <input
                    type="search"
                    placeholder="Поиск группы..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '10px',
                      backgroundColor: 'var(--color-ui-teal-0, #0C2A33)',
                    }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredPages.map((page, idx) => {
                    const isSelected = page.groupId === currentPage.groupId;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setSelectedPageIndex(pages.findIndex((p) => p.id === page.id))}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          borderLeft: isSelected ? '4px solid var(--color-action-accent-1, #F2C75C)' : '4px solid transparent',
                          backgroundColor: isSelected ? 'var(--color-ui-teal-2, #1B5660)' : 'transparent',
                          color: isSelected ? 'var(--color-birch-and-snow-3, #F4F7FA)' : 'var(--color-stone-concrete-4, #B9BDC2)',
                          fontFamily: 'PixCyrillic, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#F2C75C' : 'inherit' }}>
                          {page.groupId}
                        </div>
                        <div style={{ fontSize: '8px', opacity: 0.8, marginTop: '2px' }}>
                          {page.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Правая колонка: Разворот страницы правил */}
              <div
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--color-paper-tape-2, #F3ECD8)',
                  color: 'var(--color-ink-telecode-0, #1E2430)',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--color-paper-tape-0, #BFAF8A)', paddingBottom: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-stone-concrete-2, #656C78)', textTransform: 'uppercase' }}>
                    Группа {currentPage.groupId}
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: '16px', color: 'var(--color-ink-telecode-0, #1E2430)' }}>
                    {currentPage.title}
                  </h3>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-ui-teal-1, #143F4C)', marginTop: '4px' }}>
                    Схема: {currentPage.scheme}
                  </div>
                </div>

                {/* Правило дешифрирования */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '11px', color: 'var(--color-ochre-terracotta-0, #6B3A2C)' }}>
                    Правило кодирования:
                  </h4>
                  <p style={{ margin: 0, fontSize: '10px', lineHeight: 1.5 }}>
                    {currentPage.rule}
                  </p>
                </div>

                {/* Примеры дешифрирования */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '11px', color: 'var(--color-ochre-terracotta-0, #6B3A2C)' }}>
                    Эталонные примеры:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentPage.examples.map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 10px',
                          backgroundColor: 'var(--color-paper-tape-1, #E2D6B6)',
                          border: '1px solid var(--color-paper-tape-0, #BFAF8A)',
                          fontSize: '9px',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontFamily: 'PixCyrillic-Dense, monospace', color: 'var(--color-ui-teal-0, #0C2A33)' }}>
                          Телеграмма: {ex.telegram}
                        </div>
                        <div style={{ marginTop: '2px', color: 'var(--color-ink-telecode-1, #2A303F)' }}>
                          → {ex.decoded}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Источник методики */}
                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-paper-tape-0, #BFAF8A)',
                    fontSize: '8px',
                    color: 'var(--color-stone-concrete-2, #656C78)',
                  }}
                >
                  Источник правила: <strong>{currentPage.sourceId}</strong> · {currentPage.methodNotes}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Подвал */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-sky-night-2, #18284D)',
            borderTop: '1px solid var(--color-ui-teal-3, #367C8B)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Закрыть справочник
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Codebook;
