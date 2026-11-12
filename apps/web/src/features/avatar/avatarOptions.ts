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

/** IDs are the persisted identity contract, not display labels or image filenames. */
export const OPTIONS: Record<keyof AvatarProfile, OptionItem[]> = {
  skinTone: [
    { id: 'skin.light', name: 'Светлый', color: '#f0c3a5', desc: 'Светлый тон кожи' },
    { id: 'skin.warm', name: 'Тёплый', color: '#dca37d', desc: 'Тёплый тон кожи' },
    { id: 'skin.medium', name: 'Смуглый', color: '#b67852', desc: 'Смуглый тон кожи' },
    { id: 'skin.deep', name: 'Тёмный', color: '#754a36', desc: 'Тёмный тон кожи' },
  ],
  hairColor: [
    { id: 'haircolor.brown', name: 'Каштановый', color: '#704630', desc: 'Каштановые волосы' },
    { id: 'haircolor.black', name: 'Тёмный', color: '#27232b', desc: 'Тёмные волосы' },
    { id: 'haircolor.blond', name: 'Светлый', color: '#c9a96a', desc: 'Светлые волосы' },
    { id: 'haircolor.auburn', name: 'Рыжий', color: '#a65432', desc: 'Рыжие волосы' },
  ],
  hair: [
    { id: 'hair.short', name: 'Короткая стрижка', image: '/assets/items/hair_short.png', desc: 'Аккуратная короткая стрижка' },
    { id: 'hair.wave', name: 'Волнистые', image: '/assets/items/hair_wave.png', desc: 'Короткие волнистые волосы' },
    { id: 'hair.bob', name: 'Каре', image: '/assets/items/hair_bob.png', desc: 'Прямое каре' },
    { id: 'hair.curl', name: 'Кудри', image: '/assets/items/hair_curl.png', desc: 'Короткие кудрявые волосы' },
    { id: 'hair.long', name: 'Длинные', image: '/assets/items/hair_long.png', desc: 'Длинные волосы' },
  ],
  headwear: [
    { id: 'headwear.none', name: 'Без головного убора', desc: 'Снять головной убор' },
    { id: 'headwear.cap', name: 'Кепка наблюдателя', image: '/assets/items/headwear_cap.png', desc: 'Кепка с козырьком для прогулки по метеоплощадке.' },
    { id: 'headwear.beanie', name: 'Вязаная шапка', image: '/assets/items/headwear_beanie.png', desc: 'Тёплая вязаная шапка с отворотом.' },
    // Independently reviewed replacements; legacy filenames depict unrelated objects.
    { id: 'headwear.scarf', name: 'Шарф', image: '/assets/items/scarf_reviewed.png', iconLabel: 'Шарф', desc: 'Мягкий шарф для прохладного вечера у залива.' },
    { id: 'headwear.goggles', name: 'Защитные очки', image: '/assets/items/goggles_reviewed.png', iconLabel: 'Очки', desc: 'Очки с широким ремешком.' },
  ],
  top: [
    { id: 'top.center-jacket', name: 'Куртка центра', image: '/assets/items/top_center_jacket.png', desc: 'Синяя куртка сотрудника Станции 26063 с тёплой отделкой.' },
    { id: 'top.field-jacket', name: 'Полевая куртка', image: '/assets/items/top_field_jacket.png', desc: 'Куртка с накладными карманами для работы на площадке.' },
    { id: 'top.hoodie', name: 'Толстовка', image: '/assets/items/top_hoodie.png', desc: 'Свободная толстовка с капюшоном.' },
    { id: 'top.sweater', name: 'Свитер', image: '/assets/items/top_sweater.png', desc: 'Вязаный свитер для спокойной смены в центре.' },
    { id: 'top.shirt', name: 'Рубашка', image: '/assets/items/top_shirt.png', desc: 'Светлая рабочая рубашка.' },
  ],
  bottom: [
    { id: 'bottom.dark-trousers', name: 'Тёмные брюки', image: '/assets/items/bottom_dark_trousers.png', desc: 'Прямые тёмные брюки для работы в центре.' },
    { id: 'bottom.field-trousers', name: 'Полевые брюки', image: '/assets/items/bottom_field_trousers.png', desc: 'Брюки с дополнительными карманами.' },
    { id: 'bottom.jeans', name: 'Джинсы', image: '/assets/items/bottom_jeans.png', desc: 'Повседневные синие джинсы.' },
  ],
  footwear: [
    { id: 'footwear.sneakers', name: 'Кроссовки', image: '/assets/items/footwear_sneakers.png', desc: 'Лёгкие кроссовки с контрастной подошвой.' },
    { id: 'footwear.boots', name: 'Полевые ботинки', image: '/assets/items/footwear_boots.png', desc: 'Высокие ботинки для прогулки по территории станции.' },
    { id: 'footwear.shoes', name: 'Туфли', image: '/assets/items/footwear_shoes.png', desc: 'Закрытая обувь для работы в помещении.' },
  ],
  backpack: [
    { id: 'backpack.none', name: 'Без рюкзака', desc: 'Снять рюкзак' },
    { id: 'backpack.city', name: 'Городской рюкзак', image: '/assets/items/backpack_city.png', desc: 'Небольшой рюкзак для повседневных вещей.' },
    { id: 'backpack.field', name: 'Полевой рюкзак', image: '/assets/items/backpack_field.png', desc: 'Вместительный рюкзак с наружными карманами.' },
  ],
  heldItem: [
    { id: 'held.none', name: 'Свободные руки', desc: 'Убрать предмет' },
    { id: 'held.tablet', name: 'Планшет наблюдателя', image: '/assets/items/held_tablet.png', desc: 'Планшет для записей во время обхода станции.' },
    { id: 'held.map-folder', name: 'Папка карт', image: '/assets/items/held_map_folder.png', desc: 'Папка для рабочих карт и заметок синоптика.' },
    { id: 'held.pencil', name: 'Карандаш синоптика', image: '/assets/items/held_pencil.png', desc: 'Карандаш для работы с бумажными картами.' },
  ],
  companion: [
    { id: 'companion.none', name: 'Без спутника', desc: 'Оставить спутника на станции' },
    { id: 'companion.tit', name: 'Синичка', image: '/assets/items/companion_tit.png', desc: 'Маленькая любопытная обитательница станционного сада.' },
    { id: 'companion.squirrel', name: 'Белка', image: '/assets/items/companion_squirrel.png', desc: 'Рыжая жительница сосен возле архива.' },
  ],
  badge: [
    { id: 'badge.none', name: 'Без значка', desc: 'Снять значок' },
    { id: 'badge.meteo', name: 'Значок метеоролога', image: '/assets/items/badge_meteo_reviewed.png', iconLabel: 'М', desc: 'Декоративный значок с эмблемой погоды.' },
    { id: 'badge.aerology', name: 'Значок аэролога', image: '/assets/items/badge_aerology_reviewed.png', iconLabel: 'А', desc: 'Декоративный значок с аэрологическим мотивом.' },
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
    id: 'preset.center', name: 'В центре', image: '/assets/items/top_center_jacket.png',
    avatar: { headwear: 'headwear.none', top: 'top.center-jacket', bottom: 'bottom.dark-trousers', footwear: 'footwear.shoes', backpack: 'backpack.none', heldItem: 'held.map-folder', badge: 'badge.meteo', companion: 'companion.none' },
  },
  {
    id: 'preset.field', name: 'На площадке', image: '/assets/items/top_field_jacket.png',
    avatar: { headwear: 'headwear.cap', top: 'top.field-jacket', bottom: 'bottom.field-trousers', footwear: 'footwear.boots', backpack: 'backpack.field', heldItem: 'held.pencil', badge: 'badge.meteo', companion: 'companion.none' },
  },
  {
    id: 'preset.rest', name: 'После смены', image: '/assets/items/top_sweater.png',
    avatar: { headwear: 'headwear.beanie', top: 'top.sweater', bottom: 'bottom.jeans', footwear: 'footwear.sneakers', backpack: 'backpack.city', heldItem: 'held.none', badge: 'badge.none', companion: 'companion.tit' },
  },
];
