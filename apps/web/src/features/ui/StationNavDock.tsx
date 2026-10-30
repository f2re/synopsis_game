import React, { useEffect, useState } from 'react';
import { PixelIcon, type PixelIconName } from './PixelIcon';
import { PixelCard } from './PixelCard';
import { PixelSwitch } from './PixelSwitch';
import { GAME_CALLSIGN, GAME_MARK } from '../../brand';

export type StationDockModalId =
  | 'cartography'
  | 'radar'
  | 'archive'
  | 'schedule'
  | 'dispatch'
  | 'settings'
  | null;

export interface StationNavDockProps {
  onStartShift?: () => void;
  className?: string;
  activeRoute?: string;
}

interface DockItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: PixelIconName;
  description: string;
  isPrimary?: boolean;
  modalId?: StationDockModalId;
  action?: () => void;
}

export function StationNavDock({
  onStartShift,
  className = '',
  activeRoute = '/',
}: StationNavDockProps) {
  const [activeModal, setActiveModal] = useState<StationDockModalId>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Настройки станции
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSmooth, setFontSmooth] = useState(true);
  const [deviceGlow, setDeviceGlow] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  const handleStartShift = () => {
    setActiveModal(null);
    if (onStartShift) {
      onStartShift();
    } else {
      window.history.pushState({}, '', '/shift');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const dockItems: DockItem[] = [
    {
      id: 'blitz',
      label: 'Блиц',
      shortLabel: 'Блиц',
      icon: 'rank-up',
      description: 'Скоростной синоптический блиц-турнир по коду КН-01',
      action: () => alert('Режим «Блиц»: скоростная дешифровка телеграмм. Открывается на 2-м уровне допуска.'),
    },
    {
      id: 'duel',
      label: 'Дуэль',
      shortLabel: 'Дуэль',
      icon: 'chart',
      description: 'Синоптическая дуэль один на один по анализу барических систем',
      action: () => alert('Режим «Дуэль»: противостояние синоптиков в реальном времени.'),
    },
    {
      id: 'shift',
      label: 'НАЧАТЬ СМЕНУ',
      shortLabel: 'НАЧАТЬ СМЕНУ',
      icon: 'kn01',
      description: 'Оперативный зал дешифровки телеграмм КН-01 SYNOP станции 26063',
      isPrimary: true,
      action: handleStartShift,
    },
    {
      id: 'inventory',
      label: 'Инвентарь',
      shortLabel: 'Инвентарь',
      icon: 'doc',
      description: 'Метеорологические приборы, формуляры и снаряжение дежурного',
      modalId: 'cartography',
      action: () => setActiveModal('cartography'),
    },
    {
      id: 'tournament',
      label: 'Турнир',
      shortLabel: 'Турнир',
      icon: 'trophy-gold',
      description: 'Кубок Северо-Запада по синоптическому анализу и прогнозированию',
      action: () => alert('Кубок Северо-Запада: регистрация на следующий открытый этап.'),
    },
    {
      id: 'archive',
      label: 'Архив',
      shortLabel: 'Архив',
      icon: 'library',
      description: 'Научно-исторический архив и журналы погоды КМ-1',
      modalId: 'archive',
      action: () => setActiveModal('archive'),
    },
    {
      id: 'tasks',
      label: 'Задания',
      shortLabel: 'Задания',
      icon: 'schedule',
      description: 'Реестр учебных дежурств, предписаний и сменных нормативов',
      modalId: 'schedule',
      action: () => setActiveModal('schedule'),
    },
  ];

  return (
    <>
      <nav
        className={`station-nav-dock ${className}`.trim()}
        aria-label="Навигационная панель гидрометеостанции 26063"
      >
        <div className="dock-shell">
          <div className="dock-left-decor" aria-hidden="true">
            <img src="/ui/frames/decor_divider_bar.png" alt="" className="dock-decor-bar" />
          </div>

          <div className="dock-items-track">
            {dockItems.map((item) => {
              const isActive = activeModal === item.modalId || (item.id === 'shift' && activeRoute === '/shift');
              const isHovered = hoveredItem === item.id;

              return (
                <div key={item.id} className="dock-btn-wrapper">
                  <button
                    type="button"
                    className={`dock-btn ${item.isPrimary ? 'dock-btn-primary' : ''} ${isActive ? 'is-active' : ''}`}
                    onClick={item.action}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem((curr) => (curr === item.id ? null : curr))}
                    onFocus={() => setHoveredItem(item.id)}
                    onBlur={() => setHoveredItem((curr) => (curr === item.id ? null : curr))}
                    aria-label={`${item.label} — ${item.description}`}
                  >
                    <PixelIcon name={item.icon} size={28} className="dock-btn-icon" />
                    <span className="dock-btn-text">{item.shortLabel}</span>
                    {isActive && (
                      <img
                        src="/ui/frames/decor_indicator_pip.png"
                        className="dock-active-pip"
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {isHovered && (
                    <div className="dock-tooltip" role="tooltip">
                      <strong className="dock-tooltip-title">{item.label}</strong>
                      <span className="dock-tooltip-desc">{item.description}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="dock-right-decor" aria-hidden="true">
            <img src="/ui/frames/decor_divider_bar.png" alt="" className="dock-decor-bar" />
          </div>
        </div>
      </nav>

      {/* Модальные окна с информацией */}
      {activeModal && (
        <div className="station-modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="station-modal-container" onClick={(e) => e.stopPropagation()}>
            {activeModal === 'cartography' && (
              <PixelCard
                variant="dialog"
                cornerBrackets
                icon="cartography"
                title="КАРТОГРАФИЧЕСКИЙ КЛАСС И АНАЛИЗ ПОГОДЫ"
                subtitle="Учебный полигон синоптической картографии и нанесения планшетов"
                onClose={() => setActiveModal(null)}
                footer={
                  <div className="modal-actions-bar">
                    <button type="button" className="pixel-btn-primary" onClick={handleStartShift}>
                      Приступить к смене КН-01 →
                    </button>
                    <button type="button" className="pixel-btn-secondary" onClick={() => setActiveModal(null)}>
                      Закрыть
                    </button>
                  </div>
                }
              >
                <div className="dossier-content">
                  <div className="dossier-badge-locked">
                    🔒 ДОСТУП ОГРАНИЧЕН · ТРЕБУЕТСЯ АТТЕСТАЦИЯ КН-01
                  </div>
                  <p className="dossier-lead">
                    Для работы с кольцевыми картами погоды и нанесения метеорологических планшетов
                    необходимо подтвердить практический навык дешифровки телеграмм КН-01 SYNOP.
                  </p>
                  <table className="dossier-specs-table">
                    <tbody>
                      <tr>
                        <th>Картографическая проекция</th>
                        <td>Полярная стереографическая (М 1:2 500 000, 1:5 000 000)</td>
                      </tr>
                      <tr>
                        <th>Станционная модель</th>
                        <td>Кольцевая синоптическая схема КН-01 SYNOP (РД 52.27.759-2011)</td>
                      </tr>
                      <tr>
                        <th>Аналитические дисциплины</th>
                        <td>Барический анализ, поле давления, приведение изобар, фронтогенез</td>
                      </tr>
                      <tr>
                        <th>Оперативный статус</th>
                        <td>Аттестационный тренажер дежурных инженеров-синоптиков станции 26063</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </PixelCard>
            )}

            {activeModal === 'radar' && (
              <PixelCard
                variant="dialog"
                cornerBrackets
                icon="radar"
                title="РАДАРНЫЙ КОМПЛЕКС ДМРЛ-С"
                subtitle="Доплеровский двухполяризационный метеорологический радиолокатор"
                onClose={() => setActiveModal(null)}
                footer={
                  <div className="modal-actions-bar">
                    <button type="button" className="pixel-btn-primary" onClick={handleStartShift}>
                      Начать с дешифровки КН-01 →
                    </button>
                    <button type="button" className="pixel-btn-secondary" onClick={() => setActiveModal(null)}>
                      Закрыть
                    </button>
                  </div>
                }
              >
                <div className="dossier-content">
                  <div className="dossier-badge-locked">
                    🔒 ДОСТУП ЗАБЛОКИРОВАН · 2 УРОВЕНЬ КВАЛИФИКАЦИИ
                  </div>
                  <p className="dossier-lead">
                    Доплеровский локатор C-диапазона доступен со 2-го уровня допуска после
                    успешного завершения первой дежурной смены по первичному коду КН-01.
                  </p>
                  <table className="dossier-specs-table">
                    <tbody>
                      <tr>
                        <th>Диапазон волн</th>
                        <td>C-band (5.6 ГГц), двойная поляризация (Dual-Pol)</td>
                      </tr>
                      <tr>
                        <th>Радиус обзора</th>
                        <td>250 км (радиальная скорость ветра до 125 км/ч)</td>
                      </tr>
                      <tr>
                        <th>Период сканирования</th>
                        <td>10 минут (14 углов места 0.5°–30°)</td>
                      </tr>
                      <tr>
                        <th>Измеряемые поля</th>
                        <td>Z (отражаемость), V (скорость), W (турбулентность), ZDR, KDP</td>
                      </tr>
                      <tr>
                        <th>Назначение</th>
                        <td>Обнаружение шквалов, грозовых очагов, града и ливней</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </PixelCard>
            )}

            {activeModal === 'archive' && (
              <PixelCard
                variant="dialog"
                cornerBrackets
                icon="library"
                title="НАУЧНО-ИСТОРИЧЕСКИЙ АРХИВ"
                subtitle="Хранилище приземных журналов и исторических синоптических планшетов"
                onClose={() => setActiveModal(null)}
                footer={
                  <div className="modal-actions-bar">
                    <button type="button" className="pixel-btn-primary" onClick={handleStartShift}>
                      Открыть смену КН-01 →
                    </button>
                    <button type="button" className="pixel-btn-secondary" onClick={() => setActiveModal(null)}>
                      Закрыть
                    </button>
                  </div>
                }
              >
                <div className="dossier-content">
                  <div className="dossier-badge-locked">
                    🔒 ДОСТУП ОГРАНИЧЕН · ТРЕБУЕТСЯ КН-01
                  </div>
                  <p className="dossier-lead">
                    Доступ к историческим фондам и архивным журналам наблюдений КМ-1 открывается
                    после подтверждения квалификации наблюдателя.
                  </p>
                  <table className="dossier-specs-table">
                    <tbody>
                      <tr>
                        <th>Фонд наблюдений</th>
                        <td>Журналы погоды КМ-1 с 1950 г., микрофиши, карты погоды</td>
                      </tr>
                      <tr>
                        <th>Эталонные архивы</th>
                        <td>Ураганы, наводнения Санкт-Петербурга, блокирующие антициклоны</td>
                      </tr>
                      <tr>
                        <th>Учебные планшеты</th>
                        <td>Интерактивные тренировочные схемы нанесения станций</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </PixelCard>
            )}

            {activeModal === 'schedule' && (
              <PixelCard
                variant="dialog"
                cornerBrackets
                icon="calendar"
                title="ГРАФИК СИНОПТИЧЕСКИХ СРОКОВ"
                subtitle="Международная шкала наблюдений станции 26063 (Всемирное координированное время UTC)"
                onClose={() => setActiveModal(null)}
                footer={
                  <div className="modal-actions-bar">
                    <button type="button" className="pixel-btn-secondary" onClick={() => setActiveModal(null)}>
                      Закрыть
                    </button>
                  </div>
                }
              >
                <div className="schedule-content">
                  <p className="schedule-lead">
                    Наблюдения на метеорологической площадке производятся строго за 10 минут до срока.
                    Телеграмма КН-01 передаётся в сеть связи не позднее +15 минут от часа срока.
                  </p>
                  <div className="schedule-grid">
                    <div className="schedule-row schedule-row-major">
                      <span className="schedule-time">00:00 UTC</span>
                      <span className="schedule-type">Основной синоптический срок</span>
                      <span className="schedule-desc">Полная сводка КН-01 SYNOP + суточные экстремумы</span>
                    </div>
                    <div className="schedule-row">
                      <span className="schedule-time">03:00 UTC</span>
                      <span className="schedule-type">Промежуточный срок</span>
                      <span className="schedule-desc">Приземная сводка КН-01 + барическая тенденция (p24)</span>
                    </div>
                    <div className="schedule-row schedule-row-major">
                      <span className="schedule-time">06:00 UTC</span>
                      <span className="schedule-type">Основной синоптический срок</span>
                      <span className="schedule-desc">Полная сводка КН-01 SYNOP + осадки за ночь (группа 6)</span>
                    </div>
                    <div className="schedule-row">
                      <span className="schedule-time">09:00 UTC</span>
                      <span className="schedule-type">Промежуточный срок</span>
                      <span className="schedule-desc">Приземная сводка КН-01 + тенденция давления</span>
                    </div>
                    <div className="schedule-row schedule-row-major">
                      <span className="schedule-time">12:00 UTC</span>
                      <span className="schedule-type">Основной синоптический срок</span>
                      <span className="schedule-desc">Полная сводка КН-01 SYNOP + дневной прогрев</span>
                    </div>
                    <div className="schedule-row">
                      <span className="schedule-time">15:00 UTC</span>
                      <span className="schedule-type">Промежуточный срок</span>
                      <span className="schedule-desc">Приземная сводка КН-01 + барическая тенденция</span>
                    </div>
                    <div className="schedule-row schedule-row-major">
                      <span className="schedule-time">18:00 UTC</span>
                      <span className="schedule-type">Основной синоптический срок</span>
                      <span className="schedule-desc">Полная сводка КН-01 SYNOP + осадки за день</span>
                    </div>
                    <div className="schedule-row">
                      <span className="schedule-time">21:00 UTC</span>
                      <span className="schedule-type">Промежуточный срок</span>
                      <span className="schedule-desc">Приземная сводка КН-01 + ночное выхолаживание</span>
                    </div>
                  </div>
                </div>
              </PixelCard>
            )}

            {activeModal === 'dispatch' && (
              <PixelCard
                variant="dialog"
                cornerBrackets
                icon="telegram"
                title="ТЕЛЕГРАММЫ И СВОДКИ НАБЛЮДЕНИЙ"
                subtitle="Оперативная телеграфная лента связи станции 26063"
                onClose={() => setActiveModal(null)}
                footer={
                  <div className="modal-actions-bar">
                    <button type="button" className="pixel-btn-primary" onClick={handleStartShift}>
                      Дешифровать в смене →
                    </button>
                    <button type="button" className="pixel-btn-secondary" onClick={() => setActiveModal(null)}>
                      Закрыть
                    </button>
                  </div>
                }
              >
                <div className="dispatches-content">
                  <div className="dispatch-entry dispatch-storm">
                    <div className="dispatch-header">
                      <PixelIcon name="bell" size="sm" />
                      <strong>ШТОРМОВОЕ ОПОВЕЩЕНИЕ № 14</strong>
                      <span className="dispatch-time">17:45 UTC</span>
                    </div>
                    <p className="dispatch-text">
                      Внимание: Ожидается усиление северо-западного ветра в порывах до 18–22 м/с.
                      В створе Невской губы и Финского залива прогнозируется нагонная волна.
                    </p>
                  </div>

                  <div className="dispatch-entry">
                    <div className="dispatch-header">
                      <PixelIcon name="kn01" size="sm" />
                      <strong>СВОДКА КН-01 СТАНЦИИ 26063</strong>
                      <span className="dispatch-time">18:00 UTC</span>
                    </div>
                    <code className="dispatch-code">
                      AAXX 26181 26063 41515 10123 20084 40228 52014 70282 82560 333 81820=
                    </code>
                    <ul className="dispatch-decoded-list">
                      <li>Температура воздуха: <strong>+12.3°C</strong>, точка росы: <strong>+8.4°C</strong></li>
                      <li>Давление на уровне моря: <strong>1022.8 гПа</strong></li>
                      <li>Барическая тенденция: <strong>рост на 1.4 гПа</strong> за последние 3 часа</li>
                      <li>Явление погоды: <strong>умеренный ливневый дождь</strong>, облачность <strong>8/8</strong></li>
                    </ul>
                  </div>
                </div>
              </PixelCard>
            )}

            {activeModal === 'settings' && (
              <PixelCard
                variant="dialog"
                cornerBrackets
                icon="settings"
                title="ПАРАМЕТРЫ СТАНЦИИ И ИНТЕРФЕЙСА"
                subtitle={`${GAME_MARK} · ${GAME_CALLSIGN}`}
                onClose={() => setActiveModal(null)}
                footer={
                  <div className="modal-actions-bar">
                    <button type="button" className="pixel-btn-primary" onClick={() => setActiveModal(null)}>
                      Сохранить и закрыть
                    </button>
                  </div>
                }
              >
                <div className="settings-content">
                  <div className="settings-group">
                    <h4 className="settings-group-title">Интерфейс и доступность</h4>
                    <div className="settings-row">
                      <PixelSwitch
                        checked={soundEnabled}
                        onChange={setSoundEnabled}
                        label="Звуковые эффекты телетайпа и консоли"
                      />
                    </div>
                    <div className="settings-row">
                      <PixelSwitch
                        checked={reducedMotion}
                        onChange={setReducedMotion}
                        label="Режим пониженного движения (prefers-reduced-motion)"
                      />
                    </div>
                    <div className="settings-row">
                      <PixelSwitch
                        checked={fontSmooth}
                        onChange={setFontSmooth}
                        label="Сглаживание пиксельного шрифта PixCyrillic"
                      />
                    </div>
                    <div className="settings-row">
                      <PixelSwitch
                        checked={deviceGlow}
                        onChange={setDeviceGlow}
                        label="Фосфорное свечение приборных панелей"
                      />
                    </div>
                  </div>

                  <div className="settings-group">
                    <h4 className="settings-group-title">Методический профиль</h4>
                    <p className="settings-meta-note">
                      Российская синоптическая школа (РД 52.27.759-2011, Наставление гидрометеослужбам).
                      Серверная проверка ответов и независимая методическая валидация.
                    </p>
                  </div>
                </div>
              </PixelCard>
            )}
          </div>
        </div>
      )}
    </>
  );
}
