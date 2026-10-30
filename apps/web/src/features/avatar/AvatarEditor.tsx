import { useState, useEffect, type FormEvent } from 'react';
import { api, type AvatarProfile, type SessionUser } from '../../api';
import { AvatarPreview, type AvatarDirection, type AvatarAnimation } from './AvatarPreview';
import { worldAudio } from '@synopsis/world-engine';
import { TABS, STYLE_PRESETS, OPTIONS, type TabKey, type StylePreset } from './avatarOptions';
import { AvatarOptionGrid } from './AvatarOptionGrid';

interface AvatarEditorProps {
  user: SessionUser;
  onSaved: (user: SessionUser) => void;
  onBack: () => void;
}

export function AvatarEditor({ user, onSaved, onBack }: AvatarEditorProps) {
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
    } catch {}
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
                Настройте служебную экипировку для несения дежурства на метеоплощадке
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="pixel-btn-secondary" onClick={handleRandomize} title="Случайный выбор">
              🎲 Случайно
            </button>
            <button type="button" className="pixel-btn-secondary" onClick={handleReset} title="Сбросить изменения">
              ↺ Сброс
            </button>
            <button type="button" className="pixel-btn-secondary" onClick={onBack}>
              ← В хаб
            </button>
          </div>
        </header>

        <div className="avatar-stage-layout">
          <aside className="avatar-stage-box">
            <div className="stage-card">
              <div className="stage-top-meta">
                <span className="station-code">СТАНЦИЯ 26063</span> · <span className="observer-role">{user.displayName}</span>
              </div>

              <div className="pixel-viewport">
                <AvatarPreview avatar={avatar} direction={direction} animation={animation} size={160} />
              </div>

              <div className="stage-controls">
                <div className="control-group">
                  <span className="control-label">Ракурс (A / D):</span>
                  <div className="btn-group-segmented">
                    {(['down', 'left', 'up', 'right'] as AvatarDirection[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`btn-seg ${direction === d ? 'active' : ''}`}
                        onClick={() => {
                          setDirection(d);
                          playUiSound('audio.ui.click-soft');
                        }}
                      >
                        {d === 'down' ? 'Юг' : d === 'left' ? 'Запад' : d === 'up' ? 'Север' : 'Восток'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label">Действие (Пробел / E):</span>
                  <div className="btn-group-segmented">
                    <button
                      type="button"
                      className={`btn-seg ${animation === 'idle' ? 'active' : ''}`}
                      onClick={() => {
                        setAnimation('idle');
                        playUiSound('audio.ui.click-soft');
                      }}
                    >
                      Стойка
                    </button>
                    <button
                      type="button"
                      className={`btn-seg ${animation === 'walk' ? 'active' : ''}`}
                      onClick={() => {
                        setAnimation('walk');
                        playUiSound('audio.ui.click-soft');
                      }}
                    >
                      Шаг
                    </button>
                    <button
                      type="button"
                      className={`btn-seg ${animation === 'inspect' ? 'active' : ''}`}
                      onClick={() => {
                        setAnimation('inspect');
                        playUiSound('audio.feedback.synoptic-chime');
                        window.setTimeout(() => setAnimation('idle'), 1200);
                      }}
                    >
                      Осмотр
                    </button>
                  </div>
                </div>
              </div>

              <div className="presets-block">
                <span className="presets-label">Готовые комплекты службы:</span>
                <div className="presets-list">
                  {STYLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="preset-btn"
                      onClick={() => applyPreset(p)}
                      title={p.desc}
                    >
                      <span className="preset-icon">{p.icon}</span>
                      <span className="preset-name">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSave} className="save-form">
                <button type="submit" className="pixel-btn-primary save-btn" disabled={saving}>
                  {saving ? 'Сохранение…' : '✔ Утвердить форму'}
                </button>
                {status && (
                  <p className={`status-msg ${status.includes('Не удалось') ? 'error' : 'success'}`} role="status">
                    {status}
                  </p>
                )}
              </form>
            </div>
          </aside>

          <main className="avatar-wardrobe-deck">
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

            <AvatarOptionGrid
              activeTab={activeTab}
              avatar={avatar}
              onSelectOption={updateOption}
            />
          </main>
        </div>
      </section>
    </main>
  );
}
