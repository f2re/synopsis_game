import type { AvatarProfile } from '../../api';

export type EquipmentSlot = Exclude<keyof AvatarProfile, 'skinTone' | 'hair' | 'hairColor'>;
export type InventoryCategory = 'all' | 'wardrobe' | 'gear' | 'companion';

export interface OptionItem {
  id: string;
  name: string;
  image?: string;
  iconLabel?: string;
  desc: string;
  color?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  image: string;
  avatar: Partial<AvatarProfile>;
}

export const wardrobeIcon = (id: string) => `/assets/items/wardrobe/${id}.png`;

/** IDs are the persisted identity contract, not display labels or image filenames. */
export const OPTIONS: Record<keyof AvatarProfile, OptionItem[]> = {
  skinTone: [
    { id: 'skin.light', name: 'Светлый', color: '#f2be96', desc: 'Светлый тон кожи' },
    { id: 'skin.warm', name: 'Тёплый', color: '#e19f69', desc: 'Тёплый тон кожи' },
    { id: 'skin.medium', name: 'Смуглый', color: '#b47549', desc: 'Смуглый тон кожи' },
    { id: 'skin.deep', name: 'Тёмный', color: '#7c4d36', desc: 'Тёмный тон кожи' },
  ],
  hairColor: [
    { id: 'haircolor.brown', name: 'Каштановый', color: '#674839', desc: 'Каштановые волосы' },
    { id: 'haircolor.black', name: 'Тёмный', color: '#343441', desc: 'Тёмные волосы' },
    { id: 'haircolor.blond', name: 'Светлый', color: '#c39750', desc: 'Светлые волосы' },
    { id: 'haircolor.auburn', name: 'Рыжий', color: '#9a4b2e', desc: 'Рыжие волосы' },
  ],
  hair: [
    { id: 'hair.short', name: 'Короткая стрижка', desc: 'Аккуратная короткая стрижка' },
    { id: 'hair.wave', name: 'Волнистые', desc: 'Короткие волнистые волосы' },
    { id: 'hair.bob', name: 'Каре', desc: 'Прямое каре' },
    { id: 'hair.curl', name: 'Кудри', desc: 'Короткие кудрявые волосы' },
    { id: 'hair.long', name: 'Длинные', desc: 'Длинные волосы' },
  ],
  headwear: [
    { id: 'headwear.none', name: 'Без головного убора', desc: 'Снять головной убор' },
    { id: 'headwear.cap', name: 'Кепка наблюдателя', image: wardrobeIcon('headwear.cap'), desc: 'Кепка с козырьком для прогулки по метеоплощадке.' },
    { id: 'headwear.beanie', name: 'Вязаная шапка', image: wardrobeIcon('headwear.beanie'), desc: 'Тёплая вязаная шапка с отворотом.' },
    { id: 'headwear.scarf', name: 'Шарф', image: wardrobeIcon('headwear.scarf'), iconLabel: 'Шарф', desc: 'Мягкий шарф для прохладного вечера у залива.' },
    { id: 'headwear.goggles', name: 'Защитные очки', image: wardrobeIcon('headwear.goggles'), iconLabel: 'Очки', desc: 'Очки с широким ремешком.' },
  ],
  top: [
    { id: 'top.center-jacket', name: 'Куртка центра', image: wardrobeIcon('top.center-jacket'), desc: 'Синяя куртка сотрудника Станции 26063 с тёплой отделкой.' },
    { id: 'top.field-jacket', name: 'Полевая куртка', image: wardrobeIcon('top.field-jacket'), desc: 'Куртка с накладными карманами для работы на площадке.' },
    { id: 'top.hoodie', name: 'Толстовка', image: wardrobeIcon('top.hoodie'), desc: 'Свободная толстовка с капюшоном.' },
    { id: 'top.sweater', name: 'Свитер', image: wardrobeIcon('top.sweater'), desc: 'Вязаный свитер для спокойной смены в центре.' },
    { id: 'top.shirt', name: 'Рубашка', image: wardrobeIcon('top.shirt'), desc: 'Светлая рабочая рубашка.' },
  ],
  bottom: [
    { id: 'bottom.dark-trousers', name: 'Тёмные брюки', image: wardrobeIcon('bottom.dark-trousers'), desc: 'Прямые тёмные брюки для работы в центре.' },
    { id: 'bottom.field-trousers', name: 'Полевые брюки', image: wardrobeIcon('bottom.field-trousers'), desc: 'Брюки с дополнительными карманами.' },
    { id: 'bottom.jeans', name: 'Джинсы', image: wardrobeIcon('bottom.jeans'), desc: 'Повседневные синие джинсы.' },
  ],
  footwear: [
    { id: 'footwear.sneakers', name: 'Кроссовки', image: wardrobeIcon('footwear.sneakers'), desc: 'Лёгкие кроссовки с контрастной подошвой.' },
    { id: 'footwear.boots', name: 'Полевые ботинки', image: wardrobeIcon('footwear.boots'), desc: 'Высокие ботинки для прогулки по территории станции.' },
    { id: 'footwear.shoes', name: 'Туфли', image: wardrobeIcon('footwear.shoes'), desc: 'Закрытая обувь для работы в помещении.' },
  ],
  backpack: [
    { id: 'backpack.none', name: 'Без рюкзака', desc: 'Снять рюкзак' },
    { id: 'backpack.city', name: 'Городской рюкзак', image: wardrobeIcon('backpack.city'), desc: 'Небольшой рюкзак для повседневных вещей.' },
    { id: 'backpack.field', name: 'Полевой рюкзак', image: wardrobeIcon('backpack.field'), desc: 'Вместительный рюкзак с наружными карманами.' },
  ],
  heldItem: [
    { id: 'held.none', name: 'Свободные руки', desc: 'Убрать предмет' },
    { id: 'held.tablet', name: 'Планшет наблюдателя', image: wardrobeIcon('held.tablet'), desc: 'Планшет для записей во время обхода станции.' },
    { id: 'held.map-folder', name: 'Папка карт', image: wardrobeIcon('held.map-folder'), desc: 'Папка для рабочих карт и заметок синоптика.' },
    { id: 'held.pencil', name: 'Карандаш синоптика', image: wardrobeIcon('held.pencil'), desc: 'Карандаш для работы с бумажными картами.' },
  ],
  companion: [
    { id: 'companion.none', name: 'Без спутника', desc: 'Оставить спутника на станции' },
    { id: 'companion.tit', name: 'Синичка', image: wardrobeIcon('companion.tit'), desc: 'Маленькая любопытная обитательница станционного сада.' },
    { id: 'companion.squirrel', name: 'Белка', image: wardrobeIcon('companion.squirrel'), desc: 'Рыжая жительница сосен возле архива.' },
  ],
  badge: [
    { id: 'badge.none', name: 'Без значка', desc: 'Снять значок' },
    { id: 'badge.meteo', name: 'Значок метеоролога', image: wardrobeIcon('badge.meteo'), iconLabel: 'М', desc: 'Декоративный значок с эмблемой погоды.' },
    { id: 'badge.aerology', name: 'Значок аэролога', image: wardrobeIcon('badge.aerology'), iconLabel: 'А', desc: 'Декоративный значок с аэрологическим мотивом.' },
  ],
};

export const EQUIPMENT_SLOTS: Array<{ id: EquipmentSlot; label: string; category: Exclude<InventoryCategory, 'all'>; empty?: string }> = [
  { id: 'headwear', label: 'Голова', category: 'wardrobe', empty: 'headwear.none' },
  { id: 'top', label: 'Верх', category: 'wardrobe' },
  { id: 'bottom', label: 'Брюки', category: 'wardrobe' },
  { id: 'footwear', label: 'Обувь', category: 'wardrobe' },
  { id: 'backpack', label: 'Рюкзак', category: 'gear', empty: 'backpack.none' },
  { id: 'heldItem', label: 'В руках', category: 'gear', empty: 'held.none' },
  { id: 'badge', label: 'Значок', category: 'gear', empty: 'badge.none' },
  { id: 'companion', label: 'Спутник', category: 'companion', empty: 'companion.none' },
];

export const INVENTORY_CATEGORIES: Array<{ id: InventoryCategory; label: string }> = [
  { id: 'all', label: 'Всё' },
  { id: 'wardrobe', label: 'Одежда' },
  { id: 'gear', label: 'Снаряжение' },
  { id: 'companion', label: 'Спутники' },
];

export interface InventoryItem extends OptionItem {
  slot: EquipmentSlot;
  category: Exclude<InventoryCategory, 'all'>;
}

export const INVENTORY_ITEMS: InventoryItem[] = EQUIPMENT_SLOTS.flatMap((slot) =>
  OPTIONS[slot.id].filter((item) => item.id !== slot.empty).map((item) => ({ ...item, slot: slot.id, category: slot.category })),
);

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'preset.center', name: 'В центре', image: wardrobeIcon('top.center-jacket'),
    avatar: { headwear: 'headwear.none', top: 'top.center-jacket', bottom: 'bottom.dark-trousers', footwear: 'footwear.shoes', backpack: 'backpack.none', heldItem: 'held.map-folder', badge: 'badge.meteo', companion: 'companion.none' },
  },
  {
    id: 'preset.field', name: 'На площадке', image: wardrobeIcon('top.field-jacket'),
    avatar: { headwear: 'headwear.cap', top: 'top.field-jacket', bottom: 'bottom.field-trousers', footwear: 'footwear.boots', backpack: 'backpack.field', heldItem: 'held.pencil', badge: 'badge.meteo', companion: 'companion.none' },
  },
  {
    id: 'preset.rest', name: 'После смены', image: wardrobeIcon('top.sweater'),
    avatar: { headwear: 'headwear.beanie', top: 'top.sweater', bottom: 'bottom.jeans', footwear: 'footwear.sneakers', backpack: 'backpack.city', heldItem: 'held.none', badge: 'badge.none', companion: 'companion.tit' },
  },
];
