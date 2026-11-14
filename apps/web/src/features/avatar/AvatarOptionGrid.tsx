import { useRef } from 'react';
import type { AvatarProfile, EquipmentResponse } from '../../api';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import { AvatarPreview } from './AvatarPreview';
import {
  EQUIPMENT_SLOTS, INVENTORY_CATEGORIES, INVENTORY_ITEMS, OPTIONS,
  type EquipmentSlot, type InventoryCategory, type InventoryItem,
} from './avatarOptions';

interface AvatarOptionGridProps {
  avatar: AvatarProfile;
  selectedId: string;
  category: InventoryCategory;
  query: string;
  equippedOnly: boolean;
  tools?: EquipmentResponse['tools'];
  onSelect: (item: InventoryItem) => void;
  onCategoryChange: (category: InventoryCategory) => void;
  onQueryChange: (query: string) => void;
  onEquippedOnlyChange: (value: boolean) => void;
  onEquip: (slot: EquipmentSlot, id: string) => void;
}

export function AvatarOptionGrid({ avatar, selectedId, category, query, equippedOnly, tools, onSelect, onCategoryChange, onQueryChange, onEquippedOnlyChange, onEquip }: AvatarOptionGridProps) {
  const searchInput = useRef<HTMLInputElement>(null);
  const selectedCard = useRef<HTMLButtonElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase('ru');
  const items = INVENTORY_ITEMS.filter((item) =>
    (category === 'all' || item.category === category) &&
    (!equippedOnly || avatar[item.slot] === item.id) &&
    (!normalizedQuery || `${item.name} ${item.desc}`.toLocaleLowerCase('ru').includes(normalizedQuery)),
  );
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? INVENTORY_ITEMS[0];
  const slot = EQUIPMENT_SLOTS.find((entry) => entry.id === selected.slot)!;
  const equipped = avatar[selected.slot] === selected.id;
  const equipLabel = selected.slot === 'companion' ? 'Позвать спутника' : selected.slot === 'heldItem' ? 'Взять в руки' : selected.slot === 'badge' ? 'Прикрепить' : 'Надеть';
  const removeLabel = selected.slot === 'companion' ? 'Оставить на станции' : selected.slot === 'heldItem' ? 'Убрать из рук' : 'Снять';
  const selectedTool = tools?.find((tool) => tool.id === selected.id);

  return (
    <div className="inventory-catalog-layout">
      <section className="inventory-catalog" aria-label="Каталог вещей">
        <div className="inventory-category-bar" aria-label="Категории вещей">
          {INVENTORY_CATEGORIES.map((entry) => (
            <button key={entry.id} type="button" className={`inventory-category ${category === entry.id ? 'is-active' : ''}`} aria-pressed={category === entry.id} onClick={() => onCategoryChange(entry.id)}>
              {entry.label}<span>{INVENTORY_ITEMS.filter((item) => entry.id === 'all' || entry.id === item.category).length}</span>
            </button>
          ))}
        </div>
        <div className="inventory-filter-bar">
          <label className="inventory-search">
            <span>Найти предмет</span>
            <input ref={searchInput} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Название или описание" autoComplete="off" />
          </label>
          <label className="inventory-equipped-filter"><input type="checkbox" checked={equippedOnly} onChange={(event) => onEquippedOnlyChange(event.target.checked)} />На персонаже</label>
        </div>
        <p className="inventory-result-count" aria-live="polite">{items.length} из {INVENTORY_ITEMS.length} предметов · стартовый набор</p>
        <PixelScrollArea label="Каталог вещей" className="inventory-item-scroll" viewportClassName="inventory-item-viewport" contentClassName="inventory-item-grid" key={`${category}:${query}:${equippedOnly}`}>
          {items.map((item) => {
            const isEquipped = avatar[item.slot] === item.id;
            const isSelected = selected.id === item.id;
            const tool = tools?.find((entry) => entry.id === item.id);
            return (
              <button key={item.id} ref={isSelected ? selectedCard : undefined} type="button" className={`inventory-item ${isSelected ? 'is-selected' : ''} ${isEquipped ? 'is-equipped' : ''}`} aria-pressed={isSelected} aria-label={`${item.name}${isEquipped ? ', на персонаже' : ''}. Открыть описание`} onClick={() => onSelect(item)}>
                <span className="inventory-item__art">{item.image ? <img src={item.image} alt="" width={128} height={128} loading="lazy" decoding="async" /> : <span className="inventory-art-token" aria-hidden="true">{item.iconLabel}</span>}</span>
                <span className="inventory-item__name">{item.name}</span>
                <span className="inventory-item__state">{isEquipped ? '✓ На персонаже' : EQUIPMENT_SLOTS.find((entry) => entry.id === item.slot)?.label}</span>
                {tool && <span className="inventory-item__effect">{tool.effects.reference > 0 ? `+${tool.effects.reference} справка` : `+${tool.effects.retry} повтор`}</span>}
              </button>
            );
          })}
        </PixelScrollArea>
        {items.length === 0 && <div className="inventory-empty" role="status"><p>Таких предметов в наборе нет.</p><button type="button" className="inventory-button" onClick={() => { onQueryChange(''); onCategoryChange('all'); onEquippedOnlyChange(false); searchInput.current?.focus(); }}>Сбросить фильтры</button></div>}
      </section>
      {items.length > 0 && <aside className="inventory-detail" aria-labelledby="inventory-item-title">
        <span className="inventory-eyebrow">{slot.label}</span>
        <div className="inventory-detail__art">{selected.image ? <img src={selected.image} alt="" width={128} height={128} decoding="async" /> : <span className="inventory-art-token" aria-hidden="true">{selected.iconLabel}</span>}</div>
        <h2 id="inventory-item-title">{selected.name}</h2>
        <p>{selected.desc}</p>
        {selectedTool && <div className="inventory-tool-effect"><span>В учебной смене</span><strong>{selectedTool.effectDescription}</strong><p>Эффект фиксируется при начале смены после сохранения образа.</p></div>}
        <dl className="inventory-item-facts"><div><dt>Набор</dt><dd>Стартовый</dd></div><div><dt>Слот</dt><dd>{slot.label}</dd></div><div><dt>Статус</dt><dd>{equipped ? 'На персонаже' : 'В инвентаре'}</dd></div></dl>
        <div className="inventory-detail__actions">
          <button type="button" className="inventory-button inventory-button--primary" disabled={equipped} onClick={() => { selectedCard.current?.focus(); onEquip(selected.slot, selected.id); }}>{equipped ? 'На персонаже' : equipLabel}</button>
          {equipped && slot.empty && <button type="button" className="inventory-button" onClick={() => { (equippedOnly ? searchInput.current : selectedCard.current)?.focus(); onEquip(selected.slot, slot.empty!); }}>{removeLabel}</button>}
        </div>
        <p className="inventory-detail__note">{selected.slot === 'heldItem' ? 'Заряды действуют только в учебной смене. Помощь отмечается в результате.' : selected.slot === 'badge' ? 'Декоративный значок. Учебные усиления находятся во вкладке «Знаки отличия».' : 'Меняет внешний вид. Базовые вещи доступны сразу.'}</p>
      </aside>}
    </div>
  );
}

export function AvatarAppearance({ avatar, onSelect, showFace, onShowFace }: { avatar: AvatarProfile; onSelect: (slot: keyof AvatarProfile, id: string) => void; showFace: boolean; onShowFace: () => void }) {
  return (
    <div className="inventory-appearance">
      {avatar.headwear !== 'headwear.none' && <button type="button" className="inventory-button inventory-headwear-toggle" aria-pressed={showFace} onClick={onShowFace}>Скрыть головной убор в примерочной</button>}
      {([['skinTone', 'Тон кожи'], ['hairColor', 'Цвет волос'], ['hair', 'Причёска']] as const).map(([slot, label]) => (
        <section className={`inventory-appearance-section inventory-appearance-section--${slot}`} key={slot} aria-labelledby={`appearance-${slot}`}>
          <div className="inventory-appearance-section__heading">
            <h2 id={`appearance-${slot}`}>{label}</h2>
            {slot !== 'hair' && <AvatarPreview avatar={{ ...avatar, headwear: 'headwear.none', companion: 'companion.none' }} hairstyleThumbnail />}
          </div>
          <div className="inventory-appearance-options">
            {OPTIONS[slot].map((item) => (
              <button type="button" key={item.id} className={`inventory-appearance-option ${avatar[slot] === item.id ? 'is-selected' : ''}`} aria-pressed={avatar[slot] === item.id} onClick={() => onSelect(slot, item.id)}>
                {item.color ? <span className="inventory-swatch" style={{ backgroundColor: item.color }} /> : <AvatarPreview avatar={{ ...avatar, hair: item.id, headwear: 'headwear.none', companion: 'companion.none' }} hairstyleThumbnail />}
                <span>{item.name}</span>
                {avatar[slot] === item.id && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
