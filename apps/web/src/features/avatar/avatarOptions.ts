import type { AvatarProfile } from '../../api';

export type TabKey = 'identity' | 'wardrobe' | 'gear' | 'companion';

export interface OptionItem {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  desc: string;
  styleTag?: string;
  color?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  icon: string;
  desc: string;
  avatar: Partial<AvatarProfile>;
}

export const TABS: Array<{ id: TabKey; label: string; icon: string }> = [
  { id: 'identity', label: 'Внешность', icon: '👤' },
  { id: 'wardrobe', label: 'Одежда', icon: '🧥' },
  { id: 'gear', label: 'Снаряжение', icon: '🎒' },
  { id: 'companion', label: 'Спутники', icon: '🐦' },
];

export const STYLE_PRESETS: StylePreset[] = [
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
    id: 'preset.lab',
    name: 'Лаборант 26063',
    icon: '🔬',
    desc: 'Белый халат, свитер, очки и рабочий планшет с синичкой',
    avatar: {
      headwear: 'headwear.glasses',
      top: 'top.lab-coat',
      bottom: 'bottom.slacks',
      footwear: 'footwear.shoes',
      backpack: 'backpack.satchel',
      heldItem: 'held.clipboard',
      badge: 'badge.aerology',
      companion: 'companion.tit',
    },
  },
  {
    id: 'preset.arctic',
    name: 'Штормовая вахта',
    icon: '❄️',
    desc: 'Тёплая парка, ушанка, варежки и сигнальный фонарь синоптика',
    avatar: {
      headwear: 'headwear.ushanka',
      top: 'top.parka',
      bottom: 'bottom.overalls',
      footwear: 'footwear.boots',
      backpack: 'backpack.radio',
      heldItem: 'held.flashlight',
      badge: 'badge.meteo',
      companion: 'companion.none',
    },
  },
];

export const OPTIONS: Record<keyof AvatarProfile, OptionItem[]> = {
  skinTone: [
    { id: 'skin.nordic-fair', name: 'Северный светлый', color: '#F7D6B5', desc: 'Светлый оттенок кожи с розоватым подтоном' },
    { id: 'skin.baltic-peach', name: 'Балтийский персик', color: '#E8B991', desc: 'Теплый умеренный тон прибалтийского региона' },
    { id: 'skin.taiga-tan', name: 'Таёжный загар', color: '#C99369', desc: 'Здоровый загар от работы на открытой метеоплощадке' },
    { id: 'skin.polar-wind', name: 'Свежий румянец', color: '#FAD5C0', desc: 'Светлая кожа со свежим морозным румянцем' },
  ],
  hairColor: [
    { id: 'hair.raven', name: 'Вороново крыло', color: '#1B1C22', desc: 'Глубокий тёмно-графитовый оттенок' },
    { id: 'hair.chestnut', name: 'Каштан', color: '#543621', desc: 'Классический орехово-коричневый тон' },
    { id: 'hair.copper', name: 'Медная заря', color: '#A64823', desc: 'Яркий рыжеватый оттенок балтийского заката' },
    { id: 'hair.linen', name: 'Лён', color: '#D4B886', desc: 'Светло-русый натуральный цвет льна' },
    { id: 'hair.silver', name: 'Седина ветерана', color: '#9AA4AE', desc: 'Благородный серебристый тон опытного метеоролога' },
  ],
  hair: [
    { id: 'hair.short', name: 'Уставная стрижка', icon: '✂️', desc: 'Аккуратная короткая причёска с боковым пробором' },
    { id: 'hair.bob', name: 'Каре синоптика', icon: '💇', desc: 'Прямое строгое каре до линии плеч' },
    { id: 'hair.braid', name: 'Походная коса', icon: '🌾', desc: 'Надёжная плотная коса, не мешающая порывам ветра' },
    { id: 'hair.curly', name: 'Циклонические кудри', icon: '🌀', desc: 'Объёмные непослушные вьющиеся локоны' },
  ],
  headwear: [
    { id: 'headwear.none', name: 'Без убора', icon: '🚫', desc: 'Открытая голова для работы в помещении бюро' },
    {
      id: 'headwear.ushanka',
      name: 'Ушанка полярная',
      image: '/assets/items/headwear_ushanka.png',
      styleTag: 'Зима',
      desc: 'Тёплая меховая шапка с опущенными ушами для штормовых ветров',
    },
    {
      id: 'headwear.cap',
      name: 'Кепи наблюдателя',
      image: '/assets/items/headwear_cap.png',
      styleTag: 'Лето',
      desc: 'Козырёк с фирменной латунной кокардой станции 26063',
    },
    {
      id: 'headwear.glasses',
      name: 'Очки исследователя',
      image: '/assets/items/headwear_glasses.png',
      styleTag: 'Оптика',
      desc: 'Линзы в тонкой металлической оправе для прецизионного чтения лент',
    },
  ],
  top: [
    {
      id: 'top.lab-coat',
      name: 'Халат метеолаборанта',
      image: '/assets/items/top_lab_coat.png',
      styleTag: 'Лаборатория',
      desc: 'Белый хлопковый халат с глубокими карманами под таблицы КН-01',
    },
    {
      id: 'top.field-jacket',
      name: 'Штормовка «Бриз»',
      image: '/assets/items/top_field_jacket.png',
      styleTag: 'Площадка',
      desc: 'Ветрозащитная брезентовая куртка защитного хвойного цвета',
    },
    {
      id: 'top.parka',
      name: 'Арктическая парка 26063',
      image: '/assets/items/top_parka.png',
      styleTag: 'Шторм',
      desc: 'Тяжёлая пуховая парка синего ведомственного сукна с капюшоном',
    },
    {
      id: 'top.sweater',
      name: 'Свитер «Изобара»',
      image: '/assets/items/top_sweater.png',
      styleTag: 'Уют',
      desc: 'Плотный шерстяной свитер с традиционным узором геопотенциала',
    },
  ],
  bottom: [
    {
      id: 'bottom.field-trousers',
      name: 'Полевые карго',
      image: '/assets/items/bottom_cargo.png',
      styleTag: 'Площадка',
      desc: 'Прочные армированные брюки с накладными карманами для инструментов',
    },
    {
      id: 'bottom.slacks',
      name: 'Форменные брюки',
      image: '/assets/items/bottom_slacks.png',
      styleTag: 'Классика',
      desc: 'Строгие форменные брюки службы прогнозов тёмно-синего цвета',
    },
    {
      id: 'bottom.overalls',
      name: 'Утеплённый полукомбинезон',
      image: '/assets/items/bottom_overalls.png',
      styleTag: 'Зима',
      desc: 'Непромокаемый комбинезон с усиленными наколенниками для сугробов',
    },
  ],
  footwear: [
    {
      id: 'footwear.boots',
      name: 'Берцы «Тайфун»',
      image: '/assets/items/footwear_boots.png',
      styleTag: 'Грунт',
      desc: 'Высокие кожаные ботинки с протектором для влажной почвы метеополя',
    },
    {
      id: 'footwear.shoes',
      name: 'Служебные туфли',
      image: '/assets/items/footwear_shoes.png',
      styleTag: 'Кабинет',
      desc: 'Удобная дежурная обувь с мягкой подошвой для деревянных полов поста',
    },
    {
      id: 'footwear.felt',
      name: 'Валенки с галошами',
      image: '/assets/items/footwear_felt.png',
      styleTag: 'Мороз',
      desc: 'Традиционная проверенная обувь для ночных сроков при -30°C',
    },
  ],
  backpack: [
    { id: 'backpack.none', name: 'Без сумки', icon: '🚫', desc: 'Свободные плечи во время работы за пультом' },
    {
      id: 'backpack.satchel',
      name: 'Планшетка наблюдателя',
      image: '/assets/items/backpack_satchel.png',
      styleTag: 'Документы',
      desc: 'Кожаная сержантская сумка через плечо для журнала ТМС и таблиц',
    },
    {
      id: 'backpack.field',
      name: 'Экспедиционный ранец',
      image: '/assets/items/backpack_field.png',
      styleTag: 'Снаряжение',
      desc: 'Компактный брезентовый рюкзак с креплением для ручного анемометра',
    },
    {
      id: 'backpack.radio',
      name: 'Радиостанция «Алмаз»',
      image: '/assets/items/backpack_radio.png',
      styleTag: 'Связь',
      desc: 'Портативный КВ-трансивер для аварийной передачи синоптических сводок',
    },
  ],
  heldItem: [
    { id: 'held.none', name: 'Руки свободны', icon: '🚫', desc: 'Готовность к ручной калибровке приборов' },
    {
      id: 'held.pencil',
      name: 'Цветной карандаш «Кохинор»',
      image: '/assets/items/held_pencil.png',
      styleTag: 'Картография',
      desc: 'Двухсторонний красно-синий карандаш для нанесения теплых и холодных фронтов',
    },
    {
      id: 'held.clipboard',
      name: 'Клипборд КН-01',
      image: '/assets/items/held_clipboard.png',
      styleTag: 'Бланк',
      desc: 'Металлический планшет с бланками первичных наблюдений формы КХ-01',
    },
    {
      id: 'held.anemometer',
      name: 'Ручной анемометр АРИ-49',
      image: '/assets/items/held_anemometer.png',
      styleTag: 'Прибор',
      desc: 'Чашечный прибор с механическим счётчиком оборотов для замера скорости ветра',
    },
    {
      id: 'held.flashlight',
      name: 'Фонарь наблюдателя',
      image: '/assets/items/held_flashlight.png',
      styleTag: 'Свет',
      desc: 'Узконаправленный сигнальный фонарь для проверки осадкомера в ночной срок',
    },
    {
      id: 'held.folder',
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
