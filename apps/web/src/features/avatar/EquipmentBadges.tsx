import type { EquipmentResponse, EquipmentSnapshot } from '../../api';
import { OPTIONS, wardrobeIcon } from './avatarOptions';

const TRAINING_BADGE_ICONS = new Set(['badge.training_starter', 'badge.first_shift', 'badge.accuracy', 'badge.regular']);

function badgeIcon(badge: { id: string; image: string }): string {
  return TRAINING_BADGE_ICONS.has(badge.id) ? wardrobeIcon(badge.id) : badge.image;
}

interface EquipmentBadgesProps {
  equipment: EquipmentResponse | null;
  loading: boolean;
  error: string;
  selecting: boolean;
  onReload: () => void;
  onSelect: (id: string | null) => void;
}

export function EquipmentBadges({ equipment, loading, error, selecting, onReload, onSelect }: EquipmentBadgesProps) {
  function reload() {
    document.getElementById('badges-panel')?.focus({ preventScroll: true });
    onReload();
  }
  function select(id: string | null) {
    document.getElementById('badges-panel')?.focus({ preventScroll: true });
    onSelect(id);
  }
  if (!equipment) {
    return <section className="equipment-empty" aria-busy={loading}>
      <h2>{loading ? 'Открываем журнал достижений…' : 'Журнал пока недоступен'}</h2>
      <p>{loading ? 'Загружаем ваши значки и подтверждённые результаты смен.' : error || 'Не удалось получить данные профиля.'}</p>
      {!loading && <button type="button" className="inventory-button" onClick={reload}>Повторить загрузку</button>}
    </section>;
  }
  const active = equipment.catalog.find((badge) => badge.id === equipment.loadout.badgeId);
  const count = equipment.catalog.filter((badge) => badge.unlocked).length;
  return <section className="equipment-badges" aria-labelledby="equipment-badges-title" aria-busy={selecting || loading}>
    <header className="equipment-badges__header">
      <div><span className="inventory-eyebrow">Коллекция станции · {count} из {equipment.catalog.length}</span><h2 id="equipment-badges-title">Знаки отличия</h2><p>Выберите один знак для следующей учебной смены. Он добавит заряды к вашему инструменту.</p></div>
      <div className="equipment-active-badge">
        {active && <img src={badgeIcon(active)} alt="" width={64} height={64} />}
        <div><span>Выбран для смены</span><strong>{active?.name ?? 'Без значка'}</strong>{active && <button type="button" disabled={selecting || loading} onClick={() => select(null)}>Снять учебный знак</button>}</div>
      </div>
    </header>
    {error && <div className="equipment-inline-error" role="alert"><span>{error}</span><button type="button" className="inventory-button" disabled={loading || selecting} onClick={reload}>Обновить</button></div>}
    <div className="equipment-badge-grid">
      {equipment.catalog.map((badge) => <article key={badge.id} className={`equipment-badge ${badge.equipped ? 'is-equipped' : ''} ${badge.unlocked ? 'is-unlocked' : 'is-locked'}`} aria-labelledby={`title-${badge.id}`}>
        <div className="equipment-badge__top"><div className="equipment-badge__art"><img src={badgeIcon(badge)} alt="" width={64} height={64} loading="lazy" decoding="async" /></div><span className="equipment-badge__status">{badge.equipped ? '✓ Активен' : badge.unlocked ? 'Получен' : 'Ещё не получен'}</span></div>
        <h3 id={`title-${badge.id}`}>{badge.name}</h3>
        <p className="equipment-badge__description">{badge.description}</p>
        <p className="equipment-badge__effect">{badge.effectDescription}</p>
        <div className="equipment-badge__condition"><span>{badge.unlock.description}</span><strong>{Math.min(badge.unlock.current, badge.unlock.target)} / {badge.unlock.target}</strong><progress value={Math.min(badge.unlock.current, badge.unlock.target)} max={Math.max(1, badge.unlock.target)} aria-label={`${badge.name}: ${badge.unlock.current} из ${badge.unlock.target}`} /></div>
        <button type="button" className={`inventory-button ${badge.unlocked && !badge.equipped ? 'inventory-button--primary' : ''}`} disabled={!badge.unlocked || badge.equipped || selecting || loading} onClick={() => select(badge.id)}>{badge.equipped ? 'Выбран для смены' : badge.unlocked ? 'Выбрать знак' : 'Завершайте учебные смены'}</button>
      </article>)}
    </div>
    <div className="equipment-rules"><strong>Как работают усиления</strong><p>Справка открывает объяснение из учебного задания. Повтор позволяет исправить ответ до показа решения. Оба действия отмечаются как помощь; самостоятельный результат учитывается отдельно.</p><p>Заряды восстанавливаются в новой смене. Максимум — {equipment.rules.chargeCap} каждого вида. Одежда, спутники и декоративные значки отвечают за внешний вид.</p></div>
  </section>;
}

export function EquipmentSummary({ snapshot, dirty, stale, onOpenBadges }: { snapshot: EquipmentSnapshot; dirty: boolean; stale: boolean; onOpenBadges: () => void }) {
  const tool = OPTIONS.heldItem.find((item) => item.id === snapshot.heldItem);
  return <section className="equipment-summary" aria-labelledby="equipment-summary-title">
    <div className="equipment-summary__heading"><span className="inventory-eyebrow">Сохранённое снаряжение</span><h2 id="equipment-summary-title">На следующую смену</h2></div>
    <div className="equipment-summary__tool">{tool?.image && <img src={tool.image} alt="" width={44} height={44} />}<div><strong>{tool?.name ?? 'Без инструмента'}</strong><span>{snapshot.badgeName ?? 'Учебный знак не выбран'}</span></div></div>
    <dl className="equipment-charge-grid"><div><dt>Справка</dt><dd>{snapshot.charges.reference}<span>заряд.</span></dd></div><div><dt>Повтор</dt><dd>{snapshot.charges.retry}<span>заряд.</span></dd></div></dl>
    <p>{stale ? 'Сводка ожидает обновления. Повторите загрузку значков.' : dirty ? 'Сохраните примерку, чтобы новый инструмент действовал в следующей смене.' : 'Снаряжение фиксируется при начале смены. В текущей смене заряды не меняются.'}</p>
    <button type="button" className="inventory-button" onClick={onOpenBadges}>Выбрать учебный знак</button>
  </section>;
}
