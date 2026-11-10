import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { worldAudio } from '@synopsis/world-engine';
import { api, type AvatarProfile, type EquipmentResponse, type SessionUser } from '../../api';
import { AvatarPreview, type AvatarDirection, type AvatarAnimation } from './AvatarPreview';
import { AvatarAppearance, AvatarOptionGrid } from './AvatarOptionGrid';
import { EQUIPMENT_SLOTS, INVENTORY_ITEMS, OPTIONS, STYLE_PRESETS, type InventoryCategory, type InventoryItem } from './avatarOptions';
import { readHubPreferences } from '../hub/hubPreferences';
import { EquipmentBadges, EquipmentSummary } from './EquipmentBadges';
import './inventory.css';

interface AvatarEditorProps {
  user: SessionUser;
  onSaved: (user: SessionUser) => void;
  onBack: () => void;
  initialSection?: 'inventory' | 'badges';
}

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;
const DIRECTIONS: AvatarDirection[] = ['down', 'left', 'up', 'right'];
const DIRECTION_LABELS: Record<AvatarDirection, string> = { down: 'Спереди', left: 'Слева', up: 'Сзади', right: 'Справа' };
const SECTIONS = ['inventory', 'badges', 'appearance'] as const;

export function AvatarEditor({ user, onSaved, onBack, initialSection = 'inventory' }: AvatarEditorProps) {
  const [avatar, setAvatar] = useState<AvatarProfile>({ ...user.avatar });
  const [savedAvatar, setSavedAvatar] = useState<AvatarProfile>({ ...user.avatar });
  const [section, setSection] = useState<typeof SECTIONS[number]>(initialSection);
  const [category, setCategory] = useState<InventoryCategory>('all');
  const [query, setQuery] = useState('');
  const [equippedOnly, setEquippedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(user.avatar.heldItem !== 'held.none' ? user.avatar.heldItem : user.avatar.top);
  const [direction, setDirection] = useState<AvatarDirection>('down');
  const [animation, setAnimation] = useState<AvatarAnimation>('idle');
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentResponse | null>(null);
  const [equipmentOwner, setEquipmentOwner] = useState('');
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentError, setEquipmentError] = useState('');
  const [selectingBadge, setSelectingBadge] = useState(false);
  const equipmentRequest = useRef(0);
  const avatarRequest = useRef(0);
  const accountId = useRef(user.id);
  accountId.current = user.id;
  const inspectTimer = useRef<number | null>(null);
  const exitDialog = useRef<HTMLDialogElement>(null);
  const dirty = (Object.keys(avatar) as Array<keyof AvatarProfile>).some((slot) => avatar[slot] !== savedAvatar[slot]);
  const visibleEquipment = equipmentOwner === user.id ? equipment : null;
  const busy = saving || selectingBadge;

  useEffect(() => {
    setAvatar({ ...user.avatar });
    setSavedAvatar({ ...user.avatar });
    setSelectedId(user.avatar.heldItem !== 'held.none' ? user.avatar.heldItem : user.avatar.top);
    setQuery(''); setEquippedOnly(false);
    setCategory('all'); setSection(initialSection);
    setConfirmExit(false);
    setSaving(false); setDirection('down'); setAnimation('idle');
    if (inspectTimer.current !== null) window.clearTimeout(inspectTimer.current);
    inspectTimer.current = null;
    setNotice(null);
    // A different account must never inherit an unsaved outfit from the previous one.
    return () => { avatarRequest.current += 1; };
  }, [user.id]);

  useEffect(() => {
    setEquipment(null); setEquipmentOwner(''); setSelectingBadge(false);
    void loadEquipment();
    return () => { equipmentRequest.current += 1; };
  }, [user.id]);

  useEffect(() => () => { if (inspectTimer.current !== null) window.clearTimeout(inspectTimer.current); }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (confirmExit) exitDialog.current?.showModal();
    else exitDialog.current?.close();
  }, [confirmExit]);

  function playClick() {
    if (!readHubPreferences().soundEnabled) return;
    try { worldAudio.play('audio.ui.click-soft'); } catch { /* Optional audio never blocks equipment. */ }
  }

  async function loadEquipment() {
    const requestId = ++equipmentRequest.current;
    const owner = user.id;
    setEquipmentLoading(true); setEquipmentError('');
    try {
      const result = await api.equipment();
      if (requestId !== equipmentRequest.current || accountId.current !== owner) return;
      setEquipment(result); setEquipmentOwner(owner);
    } catch (reason) {
      if (requestId !== equipmentRequest.current || accountId.current !== owner) return;
      setEquipmentError(reason instanceof Error ? reason.message : 'Не удалось загрузить знаки отличия.');
    } finally {
      if (requestId === equipmentRequest.current && accountId.current === owner) setEquipmentLoading(false);
    }
  }

  async function selectBadge(badgeId: string | null) {
    if (busy || equipmentLoading) return;
    const owner = user.id;
    const requestId = ++equipmentRequest.current;
    setSelectingBadge(true); setEquipmentError(''); setNotice(null);
    try {
      const result = await api.selectEquipmentBadge(badgeId);
      if (requestId !== equipmentRequest.current || accountId.current !== owner) return;
      setEquipment(result); setEquipmentOwner(owner);
      setNotice({ kind: 'success', text: badgeId ? 'Учебный знак выбран. Его эффект будет доступен в новой смене.' : 'Учебный знак снят. Текущая смена сохраняет прежние заряды.' });
      playClick();
    } catch (reason) {
      if (requestId !== equipmentRequest.current || accountId.current !== owner) return;
      setEquipmentError(reason instanceof Error ? reason.message : 'Не удалось выбрать знак. Повторите действие.');
    } finally {
      if (requestId === equipmentRequest.current && accountId.current === owner) setSelectingBadge(false);
    }
  }

  function openBadges() {
    setSection('badges');
    window.requestAnimationFrame(() => document.getElementById('badges-tab')?.focus());
  }

  function setMotion(value: AvatarAnimation) {
    if (inspectTimer.current !== null) window.clearTimeout(inspectTimer.current);
    inspectTimer.current = null;
    setAnimation(value);
    if (value === 'inspect') inspectTimer.current = window.setTimeout(() => { setAnimation('idle'); inspectTimer.current = null; }, 1200);
  }

  function updateOption(slot: keyof AvatarProfile, value: string) {
    setAvatar((current) => ({ ...current, [slot]: value }));
    setNotice(null);
    playClick();
  }

  function selectItem(item: InventoryItem) { setSelectedId(item.id); playClick(); }

  function focusSlot(slotId: typeof EQUIPMENT_SLOTS[number]['id']) {
    const slot = EQUIPMENT_SLOTS.find((entry) => entry.id === slotId)!;
    const selected = INVENTORY_ITEMS.find((item) => item.id === avatar[slotId]) ?? INVENTORY_ITEMS.find((item) => item.slot === slotId)!;
    setSection('inventory'); setCategory(slot.category); setQuery(''); setEquippedOnly(false); setSelectedId(selected.id);
  }

  function handlePreviewKeys(event: KeyboardEvent<HTMLDivElement>) {
    // Shortcuts belong to the preview, so Space and arrows keep their normal form behavior elsewhere.
    if (event.altKey || event.ctrlKey || event.metaKey || saving) return;
    const current = DIRECTIONS.indexOf(direction);
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') { event.preventDefault(); setDirection(DIRECTIONS[(current + 1) % 4]); }
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') { event.preventDefault(); setDirection(DIRECTIONS[(current + 3) % 4]); }
    else if (event.code === 'Space') { event.preventDefault(); setMotion(animation === 'walk' ? 'idle' : 'walk'); }
    else if (event.code === 'KeyE') { event.preventDefault(); setMotion('inspect'); }
  }

  function handleSectionKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = SECTIONS.indexOf(section);
    const next = event.key === 'Home' ? SECTIONS[0] : event.key === 'End' ? SECTIONS.at(-1)! : SECTIONS[(index + (event.key === 'ArrowRight' ? 1 : -1) + SECTIONS.length) % SECTIONS.length];
    setSection(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#${next}-tab`)?.focus();
  }

  async function save(exitAfter = false) {
    if (busy) return;
    if (!dirty) { if (exitAfter) onBack(); return; }
    const requestId = ++avatarRequest.current;
    const owner = user.id;
    setSaving(true); setNotice(null);
    try {
      const updated = await api.updateAvatar({ ...avatar });
      if (requestId !== avatarRequest.current || accountId.current !== owner) return;
      setAvatar({ ...updated.avatar }); setSavedAvatar({ ...updated.avatar });
      onSaved(updated);
      void loadEquipment();
      setNotice({ kind: 'success', text: 'Образ и снаряжение сохранены в вашем профиле.' });
      if (exitAfter) { setConfirmExit(false); onBack(); }
    } catch (reason) {
      if (requestId !== avatarRequest.current || accountId.current !== owner) return;
      setConfirmExit(false);
      const message = reason instanceof Error ? reason.message : '';
      setNotice({ kind: 'error', text: /failed to fetch|networkerror|load failed/i.test(message)
        ? 'Нет связи с сервером. Изменения остались в примерке. Проверьте соединение и сохраните образ ещё раз.'
        : message || 'Не удалось сохранить. Изменения остались в примерке. Попробуйте ещё раз.' });
    } finally { if (requestId === avatarRequest.current && accountId.current === owner) setSaving(false); }
  }

  return (
    <main className="inventory-screen" aria-labelledby="inventory-title">
      <div className="inventory-shell">
        <header className="inventory-header">
          <div className="inventory-heading"><img src="/assets/ui/hub-r01/icon-observer.png" alt="" width={44} height={44} /><div><span className="inventory-eyebrow">26063 · {user.displayName}</span><h1 id="inventory-title">Персонаж и инвентарь</h1></div></div>
          <button type="button" className="inventory-button" disabled={busy} onClick={() => dirty ? setConfirmExit(true) : onBack()}>← В кампус</button>
        </header>

        <section className="equipment-ledger" aria-label="Ваш учебный журнал">
          <div><img src="/assets/items/held_tablet.png" alt="" width={44} height={44} /><span>Завершено смен<strong>{visibleEquipment ? visibleEquipment.stats.completedShifts : '—'}</strong></span></div>
          <div><img src="/assets/items/held_pencil.png" alt="" width={44} height={44} /><span>Верно самостоятельно<strong>{visibleEquipment ? visibleEquipment.stats.unassistedCorrect : '—'}</strong></span></div>
          <div><img src="/assets/items/badge_meteo_reviewed.png" alt="" width={44} height={44} /><span>Знаки отличия<strong>{visibleEquipment ? `${visibleEquipment.catalog.filter((badge) => badge.unlocked).length} / ${visibleEquipment.catalog.length}` : '—'}</strong></span></div>
          <p>{equipmentLoading ? 'Обновляем журнал…' : equipmentError ? 'Журнал требует обновления' : 'Личный учебный прогресс'}<span>Рейтинговый режим — без усилений</span></p>
        </section>

        <fieldset className="inventory-workspace" disabled={busy} aria-label="Настройка персонажа">
          <aside className="inventory-observer" aria-label="Ваш персонаж и надетые вещи">
            <div className="inventory-observer__heading"><span className="inventory-eyebrow">Дежурный синоптик</span><strong>{user.displayName}</strong></div>
            <div className="inventory-portrait" tabIndex={0} role="group" aria-label="Предпросмотр персонажа. Стрелки — поворот, пробел — шаг, E — осмотр" onKeyDown={handlePreviewKeys}>
              <AvatarPreview avatar={avatar} direction={direction} animation={animation} size={192} showBackdrop={false} />
              <span className="inventory-portrait__caption">{dirty ? 'Примерка' : 'Сохранённый образ'}</span>
            </div>
            <div className="inventory-directions" aria-label="Ракурс персонажа">{DIRECTIONS.map((value) => <button type="button" key={value} className="inventory-segment" aria-pressed={direction === value} onClick={() => setDirection(value)}>{DIRECTION_LABELS[value]}</button>)}</div>
            <div className="inventory-motions" aria-label="Действие персонажа">{([['idle', 'Стойка'], ['walk', 'Шаг'], ['inspect', 'Осмотр']] as const).map(([value, label]) => <button key={value} type="button" className="inventory-segment" aria-pressed={animation === value} onClick={() => setMotion(value)}>{label}</button>)}</div>
            <p className="inventory-preview-hint">В фокусе персонажа: ← → поворот · пробел шаг</p>
            <h2 className="inventory-subtitle">На персонаже</h2>
            <div className="inventory-slots">{EQUIPMENT_SLOTS.map((slot) => {
              const item = OPTIONS[slot.id].find((entry) => entry.id === avatar[slot.id]);
              return <button key={slot.id} type="button" className={`inventory-slot ${item && item.id !== slot.empty ? 'has-item' : ''}`} aria-label={`${slot.label}: ${item?.name ?? 'Пусто'}. Выбрать предмет`} onClick={() => focusSlot(slot.id)}><span className="inventory-slot__art">{item?.image ? <img src={item.image} alt="" width={48} height={48} /> : item?.iconLabel ? <span className="inventory-art-token" aria-hidden="true">{item.iconLabel}</span> : <span aria-hidden="true">—</span>}</span><span>{slot.label}</span></button>;
            })}</div>
            {visibleEquipment && <EquipmentSummary snapshot={visibleEquipment.nextShift} dirty={dirty} stale={equipmentLoading || Boolean(equipmentError)} onOpenBadges={openBadges} />}
            {!visibleEquipment && <div className="equipment-summary equipment-summary--loading"><p>{equipmentLoading ? 'Проверяем снаряжение…' : 'Не удалось загрузить эффекты снаряжения.'}</p>{!equipmentLoading && <button type="button" className="inventory-button" onClick={() => void loadEquipment()}>Повторить загрузку</button>}</div>}
          </aside>

          <section className="inventory-main">
            <div className="inventory-tabs" role="tablist" aria-label="Раздел персонажа" onKeyDown={handleSectionKeys}>
              <button id="inventory-tab" type="button" role="tab" tabIndex={section === 'inventory' ? 0 : -1} aria-selected={section === 'inventory'} aria-controls="inventory-panel" className={`inventory-tab ${section === 'inventory' ? 'is-active' : ''}`} onClick={() => setSection('inventory')}>Инвентарь <span>{INVENTORY_ITEMS.length}</span></button>
              <button id="badges-tab" type="button" role="tab" tabIndex={section === 'badges' ? 0 : -1} aria-selected={section === 'badges'} aria-controls="badges-panel" className={`inventory-tab ${section === 'badges' ? 'is-active' : ''}`} onClick={() => setSection('badges')}>Знаки отличия</button>
              <button id="appearance-tab" type="button" role="tab" tabIndex={section === 'appearance' ? 0 : -1} aria-selected={section === 'appearance'} aria-controls="appearance-panel" className={`inventory-tab ${section === 'appearance' ? 'is-active' : ''}`} onClick={() => setSection('appearance')}>Внешность</button>
            </div>
            <div role="tabpanel" id="badges-panel" aria-labelledby="badges-tab" hidden={section !== 'badges'}>
              {section === 'badges' && <EquipmentBadges equipment={visibleEquipment} loading={equipmentLoading} error={equipmentError} selecting={selectingBadge} onReload={() => void loadEquipment()} onSelect={(id) => void selectBadge(id)} />}
            </div>
            <div role="tabpanel" id="inventory-panel" aria-labelledby="inventory-tab" hidden={section !== 'inventory'}>
              {section === 'inventory' && <AvatarOptionGrid avatar={avatar} selectedId={selectedId} category={category} query={query} equippedOnly={equippedOnly} tools={visibleEquipment?.tools} onSelect={selectItem} onCategoryChange={setCategory} onQueryChange={setQuery} onEquippedOnlyChange={setEquippedOnly} onEquip={updateOption} />}
            </div>
            <div role="tabpanel" id="appearance-panel" aria-labelledby="appearance-tab" hidden={section !== 'appearance'}>
              {section === 'appearance' && <AvatarAppearance avatar={avatar} onSelect={updateOption} />}
            </div>
            {section !== 'badges' && <section className="inventory-presets" aria-labelledby="inventory-presets-title"><h2 id="inventory-presets-title">Готовые комплекты</h2><div>{STYLE_PRESETS.map((preset) => <button key={preset.id} type="button" className="inventory-preset" onClick={() => { setAvatar((current) => ({ ...current, ...preset.avatar })); setNotice({ kind: 'info', text: `Примеряем комплект «${preset.name}». Сохраните его, чтобы оставить в профиле.` }); playClick(); }}><img src={preset.image} alt="" width={40} height={40} /><span>{preset.name}</span></button>)}</div></section>}
          </section>
        </fieldset>

        <footer className="inventory-footer">
          <div className="inventory-save-state"><strong>{saving ? 'Сохраняем…' : dirty ? 'Есть несохранённые изменения' : 'Образ сохранён'}</strong><span>Сохранённый инструмент действует со следующей смены.</span></div>
          <div className="inventory-footer__actions"><button type="button" className="inventory-button" disabled={!dirty || busy} onClick={() => { setAvatar({ ...savedAvatar }); setNotice({ kind: 'info', text: 'Возвращён сохранённый образ.' }); }}>Отменить изменения</button><button type="button" className="inventory-button inventory-button--primary" disabled={!dirty || busy} onClick={() => void save()}>{saving ? 'Сохранение…' : 'Сохранить образ'}</button></div>
        </footer>
        {notice && <p className={`inventory-notice inventory-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      </div>
      <dialog ref={exitDialog} className="inventory-exit-dialog" onCancel={() => setConfirmExit(false)} aria-labelledby="inventory-exit-title">
        <h2 id="inventory-exit-title">Сохранить изменения?</h2><p>Вы изменили образ персонажа. Перед возвращением в кампус его можно сохранить.</p>
        <div><button type="button" className="inventory-button inventory-button--primary" disabled={saving} onClick={() => void save(true)}>{saving ? 'Сохранение…' : 'Сохранить и выйти'}</button><button type="button" className="inventory-button" disabled={saving} onClick={() => { setConfirmExit(false); onBack(); }}>Выйти без сохранения</button><button type="button" className="inventory-button" disabled={saving} onClick={() => setConfirmExit(false)}>Продолжить примерку</button></div>
      </dialog>
    </main>
  );
}
