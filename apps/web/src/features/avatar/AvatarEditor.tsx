import { useState, type FormEvent } from 'react';
import { api, type AvatarProfile, type SessionUser } from '../../api';
import { AvatarPreview, type AvatarDirection, type AvatarAnimation } from './AvatarPreview';
import { worldAudio } from '@synopsis/world-engine';

type TabKey = 'identity' | 'wardrobe' | 'gear' | 'companion';

interface OptionItem {
  id: string;
  name: string;
  icon?: string;
  desc: string;
  color?: string;
}

const TABS: Array<{ id: TabKey; label: string; icon: string }> = [
  { id: 'identity', label: 'Внешность', icon: '👤' },
  { id: 'wardrobe', label: 'Одежда', icon: '🧥' },
  { id: 'gear', label: 'Снаряжение', icon: '🎒' },
  { id: 'companion', label: 'Спутники', icon: '🐦' },
];

const OPTIONS: Record<keyof AvatarProfile, OptionItem[]> = {
  skinTone: [
    { id: 'skin.light', name: 'Светлый', color: '#f4c8ab', desc: 'Северный тон' },
    { id: 'skin.warm', name: 'Тёплый', color: '#dea17b', desc: 'Умеренный тёплый оттенок' },
    { id: 'skin.medium', name: 'Средний', color: '#ab7552', desc: 'Светло-смуглый тон' },
    { id: 'skin.deep', name: 'Тёмный', color: '#764936', desc: 'Глубокий тон' },
  ],
  hairColor: [
    { id: 'haircolor.brown', name: 'Каштановый', color: '#684332', desc: 'Тёмно-ореховый' },
    { id: 'haircolor.black', name: 'Чёрный', color: '#2b2f3d', desc: 'Вороново крыло' },
    { id: 'haircolor.blond', name: 'Светлый', color: '#d8b95f', desc: 'Пшеничный блонд' },
    { id: 'haircolor.auburn', name: 'Рыжий', color: '#a1482d', desc: 'Медный оттенок' },
  ],
  hair: [
    { id: 'hair.short', name: 'Короткая классика', icon: '✂️', desc: 'Аккуратная стрижка синоптика' },
    { id: 'hair.wave', name: 'Волнистая', icon: '〰️', desc: 'Мягкие балтийские волны' },
    { id: 'hair.bob', name: 'Каре', icon: '💇', desc: 'Чёткий прямой силуэт до плеч' },
    { id: 'hair.curl', name: 'Кудри', icon: '🌀', desc: 'Объёмные спирали' },
    { id: 'hair.long', name: 'Длинная', icon: '✨', desc: 'Свободные ниспадающие пряди' },
  ],
  headwear: [
    { id: 'headwear.none', name: 'Без убора', icon: '🚫', desc: 'Открытая причёска' },
    { id: 'headwear.cap', name: 'Кепка центра', icon: '🧢', desc: 'С козырьком от солнца и дождя' },
    { id: 'headwear.beanie', name: 'Вязаная шапка', icon: '🧶', desc: 'Шерстяная бини для ветреных смен' },
  ],
  top: [
    { id: 'top.center-jacket', name: 'Куртка центра', icon: '🧥', desc: 'Форменная синяя с золотым кантом' },
    { id: 'top.field-jacket', name: 'Полевая куртка', icon: '🏕️', desc: 'Штормовка для наружных замеров' },
    { id: 'top.hoodie', name: 'Худи «Циклон»', icon: '👕', desc: 'Уютный плотный трикотаж с капюшоном' },
    { id: 'top.sweater', name: 'Вязаный свитер', icon: '🧣', desc: 'Тёплый скандинавский орнамент' },
    { id: 'top.shirt', name: 'Служебная рубашка', icon: '👔', desc: 'Строгая с галстуком для докладов' },
  ],
  bottom: [
    { id: 'bottom.dark-trousers', name: 'Тёмные брюки', icon: '👖', desc: 'Классические форменные слаксы' },
    { id: 'bottom.field-trousers', name: 'Полевые брюки', icon: '🥾', desc: 'Карго с карманами для бланков' },
    { id: 'bottom.jeans', name: 'Джинсы', icon: '👖', desc: 'Прочный балтийский индиго деним' },
  ],
  footwear: [
    { id: 'footwear.sneakers', name: 'Кроссовки', icon: '👟', desc: 'Лёгкие и тихие для работы в зале' },
    { id: 'footwear.boots', name: 'Полевые ботинки', icon: '🥾', desc: 'Огрублённые берцы с протектором' },
    { id: 'footwear.shoes', name: 'Туфли синоптика', icon: '👞', desc: 'Полированные оксфорды' },
  ],
  backpack: [
    { id: 'backpack.none', name: 'Без рюкзака', icon: '🚫', desc: 'Налегке на короткую вахту' },
    { id: 'backpack.city', name: 'Городской ранец', icon: '🎒', desc: 'Кожаный для атласов и блокнота' },
    { id: 'backpack.field', name: 'Полевой рюкзак', icon: '🧭', desc: 'Экспедиционный с креплением тубуса' },
  ],
  heldItem: [
    { id: 'held.none', name: 'Без предмета', icon: '🚫', desc: 'Свободные руки' },
    { id: 'held.pencil', name: 'Карандаш Кохинор', icon: '✏️', desc: 'Двухцветный 3М (красный / синий)' },
    { id: 'held.tablet', name: 'Планшет погоды', icon: '📱', desc: 'Оперативный радар и схемы КН-01' },
    { id: 'held.map-folder', name: 'Папка карт', icon: '📁', desc: 'Планшет со штормовыми картами' },
  ],
  companion: [
    { id: 'companion.none', name: 'Без спутника', icon: '🚫', desc: 'Сосредоточенное одиночное дежурство' },
    { id: 'companion.tit', name: 'Синичка-лазоревка', icon: '🐦', desc: 'Ручная птица станции, предсказывает оттепель' },
    { id: 'companion.squirrel', name: 'Кампусная белка', icon: '🐿️', desc: 'Обитательница сосен у корпуса архива' },
  ],
  badge: [
    { id: 'badge.none', name: 'Без значка', icon: '🚫', desc: 'Строгий лацкан без регалий' },
    { id: 'badge.meteo', name: 'Знак Метеоролога', icon: '🎖️', desc: 'Золотой барометрический знак отличия' },
    { id: 'badge.aerology', name: 'Знак Аэролога', icon: '🎈', desc: 'Лазурная петличка зондирования атмосферы' },
  ],
};

export function AvatarEditor({
  user,
  onSaved,
  onBack,
}: {
  user: SessionUser;
  onSaved: (user: SessionUser) => void;
  onBack: () => void;
}) {
  const [avatar, setAvatar] = useState<AvatarProfile>({ ...user.avatar });
  const [activeTab, setActiveTab] = useState<TabKey>('identity');
  const [direction, setDirection] = useState<AvatarDirection>('down');
  const [animation, setAnimation] = useState<AvatarAnimation>('idle');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  function playUiSound(soundId: string) {
    try {
      worldAudio.play(soundId);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    playUiSound('audio.equip.paper-turn');
  }

  function updateOption(key: keyof AvatarProfile, value: string) {
    setAvatar((prev) => ({ ...prev, [key]: value }));
    setAnimation('inspect');
    window.setTimeout(() => setAnimation('idle'), 800);

    // Contextual sound reactions
    if (key === 'companion') {
      if (value === 'companion.tit') {
        playUiSound('audio.fauna.tit-chirp');
      } else if (value === 'companion.squirrel') {
        playUiSound('audio.fauna.squirrel-scurry');
      } else {
        playUiSound('audio.ui.click-soft');
      }
    } else {
      playUiSound('audio.ui.click-soft');
    }
  }

  function handleRandomize() {
    playUiSound('audio.interact.door-latch');
    const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randomized: AvatarProfile = {
      skinTone: randomPick(OPTIONS.skinTone).id,
      hair: randomPick(OPTIONS.hair).id,
      hairColor: randomPick(OPTIONS.hairColor).id,
      headwear: randomPick(OPTIONS.headwear).id,
      top: randomPick(OPTIONS.top).id,
      bottom: randomPick(OPTIONS.bottom).id,
      footwear: randomPick(OPTIONS.footwear).id,
      backpack: randomPick(OPTIONS.backpack).id,
      heldItem: randomPick(OPTIONS.heldItem).id,
      companion: randomPick(OPTIONS.companion).id,
      badge: randomPick(OPTIONS.badge).id,
    };
    setAvatar(randomized);
    setAnimation('inspect');
    window.setTimeout(() => setAnimation('idle'), 1000);
  }

  function handleReset() {
    playUiSound('audio.ui.click-soft');
    setAvatar({ ...user.avatar });
    setStatus('Образ возвращён к сохранённому');
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const updated = await api.updateAvatar(avatar);
      onSaved(updated);
      setStatus('Внешность успешно сохранена!');
      playUiSound('audio.feedback.synoptic-chime');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Не удалось сохранить');
      playUiSound('audio.feedback.mistake-thud');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell avatar-shell">
      <section className="panel avatar-panel avatar-game-panel" aria-labelledby="avatar-title">
        {/* Header Bar */}
        <header className="screen-header avatar-customizer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/ui/ui_station_crest_badge_v2.png"
              alt="26063"
              className="overlay-crest"
              style={{ width: 44, height: 44, flexShrink: 0, imageRendering: 'pixelated' }}
            />
            <div>
              <span className="prototype-kicker">26063 · ПЕРСОНАЛЬНЫЙ СИНОПТИК</span>
              <h1 id="avatar-title">Гардеробная синоптика</h1>
              <p className="muted">
                Экипировка наблюдателя: форма, рабочие инструменты и спутники не дают боевых бонусов.
              </p>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              playUiSound('audio.ui.click-soft');
              onBack();
            }}
          >
            ← В центр
          </button>
        </header>

        <form className="avatar-layout avatar-stage-layout" onSubmit={handleSave}>
          {/* LEFT: THE STAGE & CHARACTER CONTROLS */}
          <aside className="avatar-stage-box">
            <div className="avatar-stage-podium">
              <div className="stage-light-glow" />
              <div className="avatar-preview-frame avatar-pixel-frame">
                <AvatarPreview
                  avatar={avatar}
                  size={192}
                  direction={direction}
                  animation={animation}
                  showBackdrop={true}
                />
              </div>

              {/* Direction Rotation Toolbar */}
              <div className="stage-direction-bar" role="group" aria-label="Ракурс персонажа">
                <button
                  type="button"
                  className={`stage-btn ${direction === 'left' ? 'active' : ''}`}
                  onClick={() => {
                    setDirection('left');
                    playUiSound('audio.ui.click-soft');
                  }}
                  title="Повернуть влево"
                >
                  ↶ Влево
                </button>
                <button
                  type="button"
                  className={`stage-btn ${direction === 'down' ? 'active' : ''}`}
                  onClick={() => {
                    setDirection('down');
                    playUiSound('audio.ui.click-soft');
                  }}
                  title="Лицом спереди"
                >
                  ⬇ Спереди
                </button>
                <button
                  type="button"
                  className={`stage-btn ${direction === 'right' ? 'active' : ''}`}
                  onClick={() => {
                    setDirection('right');
                    playUiSound('audio.ui.click-soft');
                  }}
                  title="Повернуть вправо"
                >
                  ↷ Вправо
                </button>
                <button
                  type="button"
                  className={`stage-btn ${direction === 'up' ? 'active' : ''}`}
                  onClick={() => {
                    setDirection('up');
                    playUiSound('audio.ui.click-soft');
                  }}
                  title="Со спины"
                >
                  ⬆ Сзади
                </button>
              </div>

              {/* Animation Cadence Toggles */}
              <div className="stage-anim-bar">
                <span className="stage-anim-label">Режим:</span>
                <button
                  type="button"
                  className={`anim-pill ${animation === 'idle' ? 'active' : ''}`}
                  onClick={() => setAnimation('idle')}
                >
                  Покой
                </button>
                <button
                  type="button"
                  className={`anim-pill ${animation === 'walk' ? 'active' : ''}`}
                  onClick={() => setAnimation('walk')}
                >
                  Шаг
                </button>
                <button
                  type="button"
                  className={`anim-pill ${animation === 'inspect' ? 'active' : ''}`}
                  onClick={() => {
                    setAnimation('inspect');
                    playUiSound('audio.ui.click-soft');
                    window.setTimeout(() => setAnimation('idle'), 1200);
                  }}
                >
                  Примерка
                </button>
              </div>
            </div>

            {/* User Identity Card */}
            <div className="avatar-user-badge">
              <span className="badge-kicker">ДЕЖУРНЫЙ НАБЛЮДАТЕЛЬ</span>
              <strong className="badge-name">{user.displayName}</strong>
              <div className="badge-meta">
                <span>Группа: {user.groupId}</span>
                <span className="badge-dot">•</span>
                <span className="badge-status">Готов к смене</span>
              </div>
            </div>

            {/* Quick Actions & Save CTA */}
            <div className="avatar-quick-actions">
              <div className="quick-buttons-row">
                <button
                  type="button"
                  className="secondary-button quick-btn"
                  onClick={handleRandomize}
                  title="Случайная комбинация одежды и вещей"
                >
                  🎲 Случайно
                </button>
                <button
                  type="button"
                  className="secondary-button quick-btn"
                  onClick={handleReset}
                  title="Сбросить до сохранённого вида"
                >
                  🔄 Сброс
                </button>
              </div>

              <button
                className="primary-button avatar-save-cta"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Сохраняю образ…' : '★ Сохранить образ'}
              </button>

              {status && (
                <div
                  className={`avatar-status-pill ${
                    status.includes('успешно') || status.includes('сохран') ? 'status-ok' : 'status-err'
                  }`}
                  role="status"
                >
                  {status}
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT: THE INTERACTIVE WARDROBE DESK */}
          <section className="avatar-wardrobe-deck" aria-label="Панель выбора одежды и экипировки">
            {/* Category Tabs */}
            <nav className="wardrobe-tabs-nav" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`wardrobe-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-text">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* TAB 1: IDENTITY (SKIN & HAIR) */}
            {activeTab === 'identity' && (
              <div className="wardrobe-tab-content">
                {/* Skin Tone Swatches */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Тон кожи</h3>
                    <span className="section-note">Базовый оттенок персонажа</span>
                  </div>
                  <div className="swatches-grid">
                    {OPTIONS.skinTone.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`swatch-card ${avatar.skinTone === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('skinTone', item.id)}
                      >
                        <span className="swatch-color-box" style={{ backgroundColor: item.color }} />
                        <span className="swatch-name">{item.name}</span>
                        {avatar.skinTone === item.id && <span className="swatch-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color Swatches */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Цвет волос</h3>
                    <span className="section-note">Естественные палитры</span>
                  </div>
                  <div className="swatches-grid">
                    {OPTIONS.hairColor.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`swatch-card ${avatar.hairColor === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('hairColor', item.id)}
                      >
                        <span className="swatch-color-box" style={{ backgroundColor: item.color }} />
                        <span className="swatch-name">{item.name}</span>
                        {avatar.hairColor === item.id && <span className="swatch-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Style Cards */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Причёска</h3>
                    <span className="section-note">Стрижка и укладка</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.hair.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.hair === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('hair', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.hair === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WARDROBE (TOPS, BOTTOMS, FOOTWEAR, HEADWEAR) */}
            {activeTab === 'wardrobe' && (
              <div className="wardrobe-tab-content">
                {/* Tops */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Верхняя одежда</h3>
                    <span className="section-note">Куртки, свитеры и рубашки</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.top.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.top === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('top', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.top === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottoms */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Низ и брюки</h3>
                    <span className="section-note">Штаны и джинсы</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.bottom.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.bottom === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('bottom', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.bottom === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footwear */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Обувь</h3>
                    <span className="section-note">Обувь наблюдателя</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.footwear.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.footwear === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('footwear', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.footwear === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headwear */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Головной убор</h3>
                    <span className="section-note">Защита от ветра и солнца</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.headwear.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.headwear === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('headwear', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.headwear === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GEAR (BACKPACK, HELD ITEM, BADGE) */}
            {activeTab === 'gear' && (
              <div className="wardrobe-tab-content">
                {/* Held Item */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Рабочий инструмент в руках</h3>
                    <span className="section-note">Приборы синоптика</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.heldItem.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.heldItem === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('heldItem', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.heldItem === item.id && <div className="item-card-badge">Выбрано</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backpack */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Рюкзак и сумки</h3>
                    <span className="section-note">Полевое снаряжение</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.backpack.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.backpack === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('backpack', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.backpack === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Badge */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Нагрудный знак и петлицы</h3>
                    <span className="section-note">Служебные регалии</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.badge.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.badge === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('badge', item.id)}
                      >
                        <div className="item-card-icon">{item.icon}</div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.badge === item.id && <div className="item-card-badge">Приколот</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COMPANIONS */}
            {activeTab === 'companion' && (
              <div className="wardrobe-tab-content">
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Спутник на дежурстве</h3>
                    <span className="section-note">Живые обитатели кампуса 26063</span>
                  </div>
                  <div className="companion-cards-grid">
                    {OPTIONS.companion.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`companion-select-card ${avatar.companion === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('companion', item.id)}
                      >
                        <div className="companion-icon-box">{item.icon}</div>
                        <div className="companion-info-box">
                          <strong className="companion-name">{item.name}</strong>
                          <p className="companion-desc">{item.desc}</p>
                          <div className="companion-meta-row">
                            <span className="companion-tag">Кампус 26063</span>
                            {avatar.companion === item.id && (
                              <span className="companion-chosen-badge">Рядом на вахте</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </form>
      </section>
    </main>
  );
}
