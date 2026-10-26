import { useState, type FormEvent } from 'react';
import { api, type AvatarProfile, type SessionUser } from '../../api';
import { AvatarPreview } from './AvatarPreview';

const OPTIONS: Record<keyof AvatarProfile, Array<[string, string]>> = {
  skinTone: [['skin.light', 'Светлый'], ['skin.warm', 'Тёплый'], ['skin.medium', 'Средний'], ['skin.deep', 'Тёмный']],
  hair: [['hair.short', 'Короткая'], ['hair.wave', 'Волнистая'], ['hair.bob', 'Каре'], ['hair.curl', 'Кудри'], ['hair.long', 'Длинная']],
  hairColor: [['haircolor.brown', 'Каштановый'], ['haircolor.black', 'Чёрный'], ['haircolor.blond', 'Светлый'], ['haircolor.auburn', 'Рыжий']],
  headwear: [['headwear.none', 'Без головного убора'], ['headwear.cap', 'Кепка'], ['headwear.beanie', 'Шапка']],
  top: [['top.center-jacket', 'Куртка центра'], ['top.field-jacket', 'Полевая куртка'], ['top.hoodie', 'Худи'], ['top.sweater', 'Свитер'], ['top.shirt', 'Рубашка']],
  bottom: [['bottom.dark-trousers', 'Тёмные брюки'], ['bottom.field-trousers', 'Полевые брюки'], ['bottom.jeans', 'Джинсы']],
  footwear: [['footwear.sneakers', 'Кроссовки'], ['footwear.boots', 'Ботинки'], ['footwear.shoes', 'Туфли']],
  backpack: [['backpack.none', 'Без рюкзака'], ['backpack.city', 'Городской'], ['backpack.field', 'Полевой']],
  heldItem: [['held.none', 'Без предмета'], ['held.tablet', 'Планшет'], ['held.map-folder', 'Папка карт'], ['held.pencil', 'Синоптический карандаш']],
  companion: [['companion.none', 'Без спутника'], ['companion.tit', 'Синичка'], ['companion.squirrel', 'Белка']],
  badge: [['badge.none', 'Без значка'], ['badge.meteo', 'Метеорология'], ['badge.aerology', 'Аэрология']],
};

const LABELS: Record<keyof AvatarProfile, string> = {
  skinTone: 'Тон кожи',
  hair: 'Причёска',
  hairColor: 'Цвет волос',
  headwear: 'Головной убор',
  top: 'Верх',
  bottom: 'Низ',
  footwear: 'Обувь',
  backpack: 'Рюкзак',
  heldItem: 'Предмет',
  companion: 'Спутник',
  badge: 'Значок',
};

export function AvatarEditor({ user, onSaved, onBack }: { user: SessionUser; onSaved: (user: SessionUser) => void; onBack: () => void }) {
  const [avatar, setAvatar] = useState<AvatarProfile>({ ...user.avatar });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const updated = await api.updateAvatar(avatar);
      onSaved(updated);
      setStatus('Внешность сохранена');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof AvatarProfile, value: string) {
    setAvatar((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app-shell avatar-shell">
      <section className="panel avatar-panel" aria-labelledby="avatar-title">
        <header className="screen-header">
          <div>
            <span className="prototype-kicker">26063 · Персональный синоптик</span>
            <h1 id="avatar-title">Внешний вид</h1>
            <p className="muted">Базовые варианты доступны сразу и не дают игрового преимущества.</p>
          </div>
          <button className="secondary-button" onClick={onBack}>В центр</button>
        </header>

        <form className="avatar-layout" onSubmit={save}>
          <aside className="avatar-stage">
            <div className="avatar-preview-frame">
              <AvatarPreview avatar={avatar} />
            </div>
            <strong>{user.displayName}</strong>
            <span className="muted">{user.groupId}</span>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Сохраняю…' : 'Сохранить образ'}</button>
            {status && <div className={status === 'Внешность сохранена' ? 'form-success' : 'form-error'} role="status">{status}</div>}
          </aside>

          <div className="avatar-controls">
            {(Object.keys(OPTIONS) as Array<keyof AvatarProfile>).map((key) => (
              <label className="avatar-control" key={key}>
                <span>{LABELS[key]}</span>
                <select value={avatar[key]} onChange={(e) => update(key, e.target.value)}>
                  {OPTIONS[key].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            ))}
          </div>
        </form>
      </section>
    </main>
  );
}
