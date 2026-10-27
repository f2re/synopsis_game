import type { AvatarProfile } from '../../api';
import { OPTIONS, type OptionItem, type TabKey } from './avatarOptions';

interface AvatarOptionGridProps {
  activeTab: TabKey;
  avatar: AvatarProfile;
  onSelectOption: (key: keyof AvatarProfile, value: string) => void;
}

export function AvatarOptionGrid({ activeTab, avatar, onSelectOption }: AvatarOptionGridProps) {
  function renderSection(title: string, note: string, key: keyof AvatarProfile, items: OptionItem[]) {
    return (
      <div className="wardrobe-section" key={key}>
        <div className="section-title-row">
          <h3>{title}</h3>
          <span className="section-note">{note}</span>
        </div>
        <div className="options-grid">
          {items.map((item) => {
            const isSelected = avatar[key] === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`option-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectOption(key, item.id)}
              >
                <div className="option-visual">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="item-thumbnail" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="option-icon">{item.icon || '✦'}</span>
                  )}
                  {isSelected && <span className="selection-badge">✓</span>}
                </div>
                <div className="option-info">
                  <div className="option-title-row">
                    <span className="option-name">{item.name}</span>
                    {item.styleTag && <span className="option-tag">{item.styleTag}</span>}
                  </div>
                  <p className="option-desc">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSwatches(title: string, note: string, key: keyof AvatarProfile, items: OptionItem[]) {
    return (
      <div className="wardrobe-section" key={key}>
        <div className="section-title-row">
          <h3>{title}</h3>
          <span className="section-note">{note}</span>
        </div>
        <div className="swatches-grid">
          {items.map((item) => {
            const isSelected = avatar[key] === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`swatch-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectOption(key, item.id)}
                title={item.desc}
              >
                <span className="swatch-color-box" style={{ backgroundColor: item.color }} />
                <span className="swatch-name">{item.name}</span>
                {isSelected && <span className="swatch-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeTab === 'identity') {
    return (
      <div className="wardrobe-tab-content">
        {renderSwatches('Тон кожи', 'Естественные северные оттенки', 'skinTone', OPTIONS.skinTone)}
        {renderSwatches('Цвет волос', 'Канонические палитры станции', 'hairColor', OPTIONS.hairColor)}
        {renderSection('Причёска', 'Уставные и походные стрижки', 'hair', OPTIONS.hair)}
      </div>
    );
  }

  if (activeTab === 'wardrobe') {
    return (
      <div className="wardrobe-tab-content">
        {renderSection('Головной убор', 'Защита от балтийского ветра', 'headwear', OPTIONS.headwear)}
        {renderSection('Верхняя одежда', 'Форменная экипировка метеоролога', 'top', OPTIONS.top)}
        {renderSection('Брюки / Комбинезон', 'Служебная полевая и кабинетная форма', 'bottom', OPTIONS.bottom)}
        {renderSection('Обувь', 'Надёжная подошва для метеоплощадки', 'footwear', OPTIONS.footwear)}
      </div>
    );
  }

  if (activeTab === 'gear') {
    return (
      <div className="wardrobe-tab-content">
        {renderSection('Сумка / Радиостанция', 'Носимое оборудование', 'backpack', OPTIONS.backpack)}
        {renderSection('Предмет в руках', 'Инструменты синоптика', 'heldItem', OPTIONS.heldItem)}
        {renderSection('Служебный знак', 'Ведомственные петлицы и регалии', 'badge', OPTIONS.badge)}
      </div>
    );
  }

  if (activeTab === 'companion') {
    return (
      <div className="wardrobe-tab-content">
        {renderSection('Спутник на плече', 'Живые обитатели кампуса Станции 26063', 'companion', OPTIONS.companion)}
      </div>
    );
  }

  return null;
}
