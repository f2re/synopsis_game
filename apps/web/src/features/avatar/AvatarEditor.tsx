import { useState, useEffect, type FormEvent } from 'react';
import { api, type AvatarProfile, type SessionUser } from '../../api';
import { AvatarPreview, type AvatarDirection, type AvatarAnimation } from './AvatarPreview';
import { worldAudio } from '@synopsis/world-engine';

type TabKey = 'identity' | 'wardrobe' | 'gear' | 'companion';

interface OptionItem {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  desc: string;
  styleTag?: string;
  color?: string;
}

interface StylePreset {
  id: string;
  name: string;
  icon: string;
  desc: string;
  avatar: Partial<AvatarProfile>;
}

const TABS: Array<{ id: TabKey; label: string; icon: string }> = [
  { id: 'identity', label: 'Внешность', icon: '👤' },
  { id: 'wardrobe', label: 'Одежда', icon: '🧥' },
  { id: 'gear', label: 'Снаряжение', icon: '🎒' },
  { id: 'companion', label: 'Спутники', icon: '🐦' },
];

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'preset.field',
    name: 'Полевой замер',
    icon: '🏕️',
    desc: 'Штормовка, карго, берцы и походный рюкзак с карандашом',
    avatar: {
      headwear: 'headwear.cap',
      top: 'top.field-jacket',
      bottom: 'bottom.field-trousers',
      footwear: 'footwear.boots',
      backpack: 'backpack.field',
      heldItem: 'held.pencil',
      badge: 'badge.meteo',
      companion: 'companion.squirrel',
    },
  },
  {
    id: 'preset.center',
    name: 'Дежурный синоптик',
    icon: '🏢',
    desc: 'Синяя форменная куртка центра, строгие слаксы, оксфорды и папка карт',
    avatar: {
      headwear: 'headwear.cap',
      top: 'top.center-jacket',
      bottom: 'bottom.dark-trousers',
      footwear: 'footwear.shoes',
      backpack: 'backpack.city',
      heldItem: 'held.map-folder',
      badge: 'badge.meteo',
      companion: 'companion.none',
    },
  },
  {
    id: 'preset.aerology',
    name: 'Оператор-аэролог',
    icon: '📡',
    desc: 'Служебная сорочка с галстуком, терминал погоды и знак зондирования',
    avatar: {
      headwear: 'headwear.none',
      top: 'top.shirt',
      bottom: 'bottom.dark-trousers',
      footwear: 'footwear.shoes',
      backpack: 'backpack.none',
      heldItem: 'held.tablet',
      badge: 'badge.aerology',
      companion: 'companion.tit',
    },
  },
  {
    id: 'preset.cozy',
    name: 'Кампусный уют',
    icon: '☕',
    desc: 'Скандинавский вязаный свитер, тёплый шарф, джинсы, кроссовки и ручная синичка',
    avatar: {
      headwear: 'headwear.scarf',
      top: 'top.sweater',
      bottom: 'bottom.jeans',
      footwear: 'footwear.sneakers',
      backpack: 'backpack.none',
      heldItem: 'held.none',
      badge: 'badge.none',
      companion: 'companion.tit',
    },
  },
  {
    id: 'preset.sport',
    name: 'Спортивный вахтовик',
    icon: '🏃',
    desc: 'Худи «Циклон», деним, лёгкие раннеры и городской кожаный ранец',
    avatar: {
      headwear: 'headwear.none',
      top: 'top.hoodie',
      bottom: 'bottom.jeans',
      footwear: 'footwear.sneakers',
      backpack: 'backpack.city',
      heldItem: 'held.tablet',
      badge: 'badge.none',
      companion: 'companion.squirrel',
    },
  },
  {
    id: 'preset.polar',
    name: 'Полярная метель',
    icon: '❄️',
    desc: 'Защитные очки, полевая штормовка, карго, берцы и походный ранец',
    avatar: {
      headwear: 'headwear.goggles',
      top: 'top.field-jacket',
      bottom: 'bottom.field-trousers',
      footwear: 'footwear.boots',
      backpack: 'backpack.field',
      heldItem: 'held.tablet',
      badge: 'badge.meteo',
      companion: 'companion.squirrel',
    },
  },
];

const OPTIONS: Record<keyof AvatarProfile, OptionItem[]> = {
  skinTone: [
    { id: 'skin.light', name: 'Светлый северный', color: '#f4c8ab', desc: 'Прохладный фарфоровый тон Балтики' },
    { id: 'skin.warm', name: 'Тёплый песочный', color: '#dea17b', desc: 'Умеренный тёплый оттенок побережья' },
    { id: 'skin.medium', name: 'Золотистый загар', color: '#ab7552', desc: 'Светло-смуглый тон после полевых смен' },
    { id: 'skin.deep', name: 'Глубокий каштановый', color: '#764936', desc: 'Глубокий насыщенный южный оттенок' },
  ],
  hairColor: [
    { id: 'haircolor.brown', name: 'Каштановый', color: '#684332', desc: 'Тёмно-ореховый оттенок коры' },
    { id: 'haircolor.black', name: 'Вороново крыло', color: '#2b2f3d', desc: 'Глубокий антрацитовый цвет' },
    { id: 'haircolor.blond', name: 'Северный блонд', color: '#d8b95f', desc: 'Пшеничный золотистый оттенок' },
    { id: 'haircolor.auburn', name: 'Медный рыжий', color: '#a1482d', desc: 'Яркий осенний кленовый тон' },
  ],
  hair: [
    { id: 'hair.short', name: 'Короткая классика', image: '/assets/items/hair_short.png', desc: 'Аккуратная стрижка офицера-наблюдателя' },
    { id: 'hair.wave', name: 'Балтийские волны', image: '/assets/items/hair_wave.png', desc: 'Мягкие пряди с естественной укладкой' },
    { id: 'hair.bob', name: 'Каре синоптика', image: '/assets/items/hair_bob.png', desc: 'Чёткий графичный силуэт до линии плеч' },
    { id: 'hair.curl', name: 'Объёмные кудри', image: '/assets/items/hair_curl.png', desc: 'Пружинистые спирали, обрамляющие лицо' },
    { id: 'hair.long', name: 'Длинные пряди', image: '/assets/items/hair_long.png', desc: 'Свободно ниспадающие за плечи волосы' },
  ],
  headwear: [
    { id: 'headwear.none', name: 'Без убора', icon: '🚫', desc: 'Открытая аккуратная причёска' },
    {
      id: 'headwear.cap',
      name: 'Кепка центра',
      image: '/assets/items/headwear_cap.png',
      styleTag: 'Служебный',
      desc: 'Тёмно-синяя бейсболка с золотым шевроном солнца и волн',
    },
    {
      id: 'headwear.beanie',
      name: 'Вязаная бини',
      image: '/assets/items/headwear_beanie.png',
      styleTag: 'Уютный',
      desc: 'Шерстяная шапка крупной вязки с отворотом от морского ветра',
    },
    {
      id: 'headwear.scarf',
      name: 'Балтийский шарф',
      image: '/assets/items/headwear_scarf.png',
      styleTag: 'Уютный',
      desc: 'Плотный шерстяной шарф крупной вязки с бахромой от балтийских ветров',
    },
    {
      id: 'headwear.goggles',
      name: 'Защитные очки',
      image: '/assets/items/headwear_goggles.png',
      styleTag: 'Полевой',
      desc: 'Авиационные поляризационные очки от снежной слепоты и штормовой пыли',
    },
  ],
  top: [
    {
      id: 'top.center-jacket',
      name: 'Куртка центра',
      image: '/assets/items/top_center_jacket.png',
      styleTag: 'Служебный',
      desc: 'Форменная синяя с золотым рангом и эмблемой Станции 26063',
    },
    {
      id: 'top.field-jacket',
      name: 'Полевая штормовка',
      image: '/assets/items/top_field_jacket.png',
      styleTag: 'Полевой',
      desc: 'Ветрозащитная куртка защитного цвета с накладными карманами',
    },
    {
      id: 'top.hoodie',
      name: 'Худи «Циклон»',
      image: '/assets/items/top_hoodie.png',
      styleTag: 'Спортивный',
      desc: 'Плотный трикотаж с капюшоном, карманом-кенгуру и барической вышивкой',
    },
    {
      id: 'top.sweater',
      name: 'Вязаный свитер',
      image: '/assets/items/top_sweater.png',
      styleTag: 'Уютный',
      desc: 'Бордовая шерсть с традиционным нордическим снежным орнаментом',
    },
    {
      id: 'top.shirt',
      name: 'Служебная рубашка',
      image: '/assets/items/top_shirt.png',
      styleTag: 'Академический',
      desc: 'Строгая сорочка с форменным галстуком, зажимом и ручками в кармане',
    },
  ],
  bottom: [
    {
      id: 'bottom.dark-trousers',
      name: 'Тёмные слаксы',
      image: '/assets/items/bottom_dark_trousers.png',
      styleTag: 'Служебный',
      desc: 'Классические форменные шерстяные брюки со стрелками',
    },
    {
      id: 'bottom.field-trousers',
      name: 'Полевые карго',
      image: '/assets/items/bottom_field_trousers.png',
      styleTag: 'Полевой',
      desc: 'Прочные штаны с усиленными наколенниками и боковыми карманами',
    },
    {
      id: 'bottom.jeans',
      name: 'Джинсы индиго',
      image: '/assets/items/bottom_jeans.png',
      styleTag: 'Спортивный',
      desc: 'Балтийский хлопковый деним с оранжевой двойной отстрочкой',
    },
  ],
  footwear: [
    {
      id: 'footwear.sneakers',
      name: 'Кроссовки раннеры',
      image: '/assets/items/footwear_sneakers.png',
      styleTag: 'Спортивный',
      desc: 'Бело-бирюзовая обувь на тихой подошве для дежурства в зале',
    },
    {
      id: 'footwear.boots',
      name: 'Полевые берцы',
      image: '/assets/items/footwear_boots.png',
      styleTag: 'Полевой',
      desc: 'Толстая кожа, латунные петли и глубокий тракторный протектор',
    },
    {
      id: 'footwear.shoes',
      name: 'Туфли оксфорды',
      image: '/assets/items/footwear_shoes.png',
      styleTag: 'Служебный',
      desc: 'Полированная тёмно-коричневая кожа для докладов и комиссий',
    },
  ],
  backpack: [
    { id: 'backpack.none', name: 'Без рюкзака', icon: '🚫', desc: 'Налегке на короткое дежурство' },
    {
      id: 'backpack.field',
      name: 'Полевой рюкзак',
      image: '/assets/items/backpack_field.png',
      styleTag: 'Полевой',
      desc: 'Брезентовый экспедиционный ранец с тубусом для карт на клапане',
    },
    {
      id: 'backpack.city',
      name: 'Городской ранец',
      image: '/assets/items/backpack_city.png',
      styleTag: 'Служебный',
      desc: 'Классический кожаный портфель-рюкзак с латунными замками',
    },
  ],
  heldItem: [
    { id: 'held.none', name: 'Без предмета', icon: '🚫', desc: 'Свободные руки дежурного' },
    {
      id: 'held.pencil',
      name: 'Карандаш Кохинор',
      image: '/assets/items/held_pencil.png',
      styleTag: 'Инструмент',
      desc: 'Легендарный 3М (красный/синий грифель) для разметки фронтов',
    },
    {
      id: 'held.tablet',
      name: 'Планшет погоды',
      image: '/assets/items/held_tablet.png',
      styleTag: 'Инструмент',
      desc: 'Ударопрочный терминал с живым доплеровским радаром и КН-01',
    },
    {
      id: 'held.map-folder',
      name: 'Папка синоптика',
      image: '/assets/items/held_map_folder.png',
      styleTag: 'Инструмент',
      desc: 'Планшет с кольцевыми синоптическими картами и вычерченными изобарами',
    },
  ],
  companion: [
    { id: 'companion.none', name: 'Без спутника', icon: '🚫', desc: 'Сосредоточенное уединённое дежурство' },
    {
      id: 'companion.tit',
      name: 'Синичка-лазоревка',
      image: '/assets/items/companion_tit.png',
      styleTag: 'Спутник',
      desc: 'Ручная птица станции 26063, безошибочно чувствует скачки давления',
    },
    {
      id: 'companion.squirrel',
      name: 'Кампусная белка',
      image: '/assets/items/companion_squirrel.png',
      styleTag: 'Спутник',
      desc: 'Любопытная жительница вековых сосен у корпуса метеорологического архива',
    },
  ],
  badge: [
    { id: 'badge.none', name: 'Без знака', icon: '🚫', desc: 'Лацкан без внешних знаков отличия' },
    {
      id: 'badge.meteo',
      name: 'Знак Метеоролога',
      image: '/assets/items/badge_meteo.png',
      styleTag: 'Регалия',
      desc: 'Золотой барометрический знак за штормовую бдительность',
    },
    {
      id: 'badge.aerology',
      name: 'Знак Аэролога',
      image: '/assets/items/badge_aerology.png',
      styleTag: 'Регалия',
      desc: 'Лазурная петличка исследователя высотных слоёв тропосферы',
    },
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

  useEffect(() => {
    const ROTATION_CLOCKWISE: Record<AvatarDirection, AvatarDirection> = {
      down: 'right',
      right: 'up',
      up: 'left',
      left: 'down',
    };
    const ROTATION_COUNTER: Record<AvatarDirection, AvatarDirection> = {
      down: 'left',
      left: 'up',
      up: 'right',
      right: 'down',
    };

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        setDirection((prev) => ROTATION_CLOCKWISE[prev]);
        try { worldAudio.play('audio.ui.click-soft'); } catch {}
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setDirection((prev) => ROTATION_COUNTER[prev]);
        try { worldAudio.play('audio.ui.click-soft'); } catch {}
      } else if (e.code === 'Space') {
        e.preventDefault();
        setAnimation((prev) => (prev === 'walk' ? 'idle' : 'walk'));
        try { worldAudio.play('audio.ui.click-soft'); } catch {}
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        setAnimation('inspect');
        try { worldAudio.play('audio.feedback.synoptic-chime'); } catch {}
        window.setTimeout(() => setAnimation('idle'), 1200);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    window.setTimeout(() => setAnimation('idle'), 900);

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

  function applyPreset(preset: StylePreset) {
    setAvatar((prev) => ({ ...prev, ...preset.avatar }));
    setAnimation('inspect');
    playUiSound('audio.feedback.synoptic-chime');
    setStatus(`Применён комплект: «${preset.name}»`);
    window.setTimeout(() => setAnimation('idle'), 1100);
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
    setStatus('Образ возвращён к сохранённому виду');
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const updated = await api.updateAvatar(avatar);
      onSaved(updated);
      setStatus('Внешность синоптика сохранена на Станции 26063!');
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
                Экипировка наблюдателя Станции 26063: форменные куртки, полевая экипировка, приборы и ручные спутники.
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

        {/* Style Presets Bar */}
        <section className="style-preset-toolbar" aria-label="Готовые комплекты экипировки">
          <span className="preset-toolbar-title">Готовые комплекты:</span>
          <div className="preset-chips-row">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="preset-chip-btn"
                onClick={() => applyPreset(preset)}
                title={preset.desc}
              >
                <span className="preset-chip-icon">{preset.icon}</span>
                <span className="preset-chip-label">{preset.name}</span>
              </button>
            ))}
          </div>
        </section>

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

              <span className="stage-shortcut-hint">
                ← / → или A / D — поворот • Пробел — шаг
              </span>

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
                  title="Осмотреть образ и примерить детали"
                >
                  Примерка ✨
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
                    status.includes('успешно') || status.includes('сохран') || status.includes('Применён') ? 'status-ok' : 'status-err'
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
                    <span className="section-note">Естественные северные оттенки</span>
                  </div>
                  <div className="swatches-grid">
                    {OPTIONS.skinTone.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`swatch-card ${avatar.skinTone === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('skinTone', item.id)}
                        title={item.desc}
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
                    <span className="section-note">Канонические палитры станции</span>
                  </div>
                  <div className="swatches-grid">
                    {OPTIONS.hairColor.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`swatch-card ${avatar.hairColor === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('hairColor', item.id)}
                        title={item.desc}
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
                    <span className="section-note">Стрижка и силуэт</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.hair.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.hair === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('hair', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <strong className="item-card-name">{item.name}</strong>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.hair === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headwear */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Головной убор</h3>
                    <span className="section-note">Защита от балтийского ветра</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.headwear.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.headwear === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('headwear', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.headwear === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WARDROBE (TOPS, BOTTOMS, FOOTWEAR) */}
            {activeTab === 'wardrobe' && (
              <div className="wardrobe-tab-content">
                {/* Tops */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Верхняя одежда</h3>
                    <span className="section-note">Форменные куртки, свитеры и рубашки</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.top.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.top === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('top', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
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
                    <h3>Брюки и штаны</h3>
                    <span className="section-note">Форменные слаксы, карго и деним</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.bottom.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.bottom === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('bottom', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
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
                    <h3>Обувь синоптика</h3>
                    <span className="section-note">Для зала, аппаратной и внешних замеров</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.footwear.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.footwear === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('footwear', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.footwear === item.id && <div className="item-card-badge">Надето</div>}
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
                    <span className="section-note">Приборы оперативного анализа</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.heldItem.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.heldItem === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('heldItem', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
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
                    <span className="section-note">Вместимость для атласов и бланков</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.backpack.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.backpack === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('backpack', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.backpack === item.id && <div className="item-card-badge">Надето</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Badges */}
                <div className="wardrobe-section">
                  <div className="section-title-row">
                    <h3>Нагрудный знак отличия</h3>
                    <span className="section-note">Регалии за квалификацию</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.badge.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.badge === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('badge', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.badge === item.id && <div className="item-card-badge">Прикреплён</div>}
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
                    <h3>Фауна Станции 26063</h3>
                    <span className="section-note">Приручённые спутники синоптика</span>
                  </div>
                  <div className="item-cards-grid">
                    {OPTIONS.companion.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`item-select-card ${avatar.companion === item.id ? 'active' : ''}`}
                        onClick={() => updateOption('companion', item.id)}
                      >
                        <div className="item-card-preview">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="item-card-image" />
                          ) : (
                            <span className="item-card-emoji">{item.icon}</span>
                          )}
                        </div>
                        <div className="item-card-info">
                          <div className="item-card-top-row">
                            <strong className="item-card-name">{item.name}</strong>
                            {item.styleTag && <span className="item-style-tag">{item.styleTag}</span>}
                          </div>
                          <span className="item-card-desc">{item.desc}</span>
                        </div>
                        {avatar.companion === item.id && <div className="item-card-badge">Рядом</div>}
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
