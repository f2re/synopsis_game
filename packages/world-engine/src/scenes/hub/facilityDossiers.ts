export interface FacilitySpec {
  label: string;
  value: string;
}

export interface FacilityKeeper {
  name: string;
  quote: string;
  humanDetail: string;
}

export interface FacilityAction {
  kind: 'start-shift' | 'open-scene';
  label: string;
  sceneKey?: string;
}

export interface FacilityDossier {
  id: string;
  title: string;
  subtitle: string;
  availableStatusLabel: string;
  lockedStatusLabel?: string;
  unlockRequirement?: string;
  textureKey: string;
  specs: readonly FacilitySpec[];
  keeper?: FacilityKeeper;
  action?: FacilityAction;
}

export const FACILITY_DOSSIER_BY_BUILDING: Readonly<Record<string, string>> = {
  codepost: 'synoptic-center',
  archive: 'archive',
  radar: 'radar',
  cartography: 'cartography',
  lab: 'aerology',
  hall: 'tournament-hall',
};

export const FACILITY_DOSSIERS: Readonly<Record<string, FacilityDossier>> = {
  radar: {
    id: 'radar',
    title: 'Радарный комплекс ДМРЛ-С',
    subtitle: 'Доплеровский двухполяризационный метеорологический радиолокатор',
    availableStatusLabel: 'Доступно · радиолокационная практика',
    lockedStatusLabel: 'Закрыто · уровень 2',
    unlockRequirement: 'Комплекс открывается после первой смены КН-01 и получения допуска уровня 2 «Радар».',
    textureKey: 'bld-radar',
    keeper: {
      name: 'Владимир Михайлович Раков',
      quote: 'Радар не видит дождь. Он видит отражение. В этом вся разница.',
      humanDetail: 'На столе — графин кофе, шкала интенсивности и красный карандаш.',
    },
    specs: [
      { label: 'Диапазон', value: 'C-band, двойная поляризация' },
      { label: 'Радиус обзора', value: 'до 250 км' },
      { label: 'Поля', value: 'Z, V, W, ZDR, KDP' },
      { label: 'Назначение', value: 'Конвекция, ливни, град, шквалы и грозовые очаги' },
    ],
  },
  cartography: {
    id: 'cartography',
    title: 'Картографический класс',
    subtitle: 'Синоптическая картография и нанесение метеорологических планшетов',
    availableStatusLabel: 'Доступно · синоптическая картография',
    lockedStatusLabel: 'Закрыто · требуется КН-01',
    unlockRequirement: 'Доступ открывается после подтверждения базовой дешифровки сводок КН-01.',
    textureKey: 'bld-cartography',
    keeper: {
      name: 'Анна Сергеевна Левина',
      quote: 'Карта терпит медленную руку, но не терпит небрежной.',
      humanDetail: 'Рядом с планшетом лежат простой и синий карандаши; на бумаге заметны следы ластика.',
    },
    specs: [
      { label: 'Рабочие материалы', value: 'Кольцевые карты, поля давления, синоптические планшеты' },
      { label: 'Навыки', value: 'Нанесение станций, изобары, фронтологический и барический анализ' },
      { label: 'Методика', value: 'Российская школа синоптического анализа' },
    ],
  },
  'synoptic-center': {
    id: 'synoptic-center',
    title: 'Оперативный зал анализа',
    subtitle: 'Центральное рабочее место дежурной смены станции 26063',
    availableStatusLabel: 'Доступно · дежурная смена',
    lockedStatusLabel: 'Закрыто · нет допуска к смене',
    textureKey: 'bld-synoptic',
    keeper: {
      name: 'Иннокентий Борисович Ольхин',
      quote: 'Пуансон — не орнамент. Сначала докажи себе, что числа не врут, потом уже тяни изобары.',
      humanDetail: 'Под лампой лежат очки и клеёнчатая тетрадь с рабочими пометками.',
    },
    action: { kind: 'start-shift', label: 'Принять смену' },
    specs: [
      { label: 'Стартовая задача', value: 'Первичная дешифровка сводки КН-01 SYNOP' },
      { label: 'Далее', value: 'Барический анализ, проведение изобар и фронтологический анализ' },
      { label: 'Профиль', value: 'Российская синоптическая школа' },
    ],
  },
  aerology: {
    id: 'aerology',
    title: 'Аэрологический павильон',
    subtitle: 'Зондирование свободной атмосферы',
    availableStatusLabel: 'Доступно · аэрологическая практика',
    lockedStatusLabel: 'Закрыто · уровень 3',
    unlockRequirement: 'Павильон открывается после освоения приземного анализа и получения допуска уровня 3 «Зонд».',
    textureKey: 'bld-aerology',
    specs: [
      { label: 'Наблюдения', value: 'Давление, температура, влажность и ветер по высоте' },
      { label: 'Высота', value: 'Тропосфера и нижняя стратосфера' },
      { label: 'Практика', value: 'Аэрологические диаграммы и анализ устойчивости атмосферы' },
    ],
  },
  archive: {
    id: 'archive',
    title: 'Научно-исторический архив',
    subtitle: 'Фонд наблюдений и исторических синоптических материалов',
    availableStatusLabel: 'Доступно · читальный зал',
    lockedStatusLabel: 'Закрыто · архив недоступен',
    textureKey: 'bld-archive',
    keeper: {
      name: 'Татьяна Петровна Громова',
      quote: 'Если не можешь найти источник, значит, ты пока не знаешь, что именно ищешь.',
      humanDetail: 'На столе — каталог, карточки КН-01 и радиометодические бюллетени.',
    },
    action: { kind: 'open-scene', label: 'Войти в архив', sceneKey: 'archive' },
    specs: [
      { label: 'Фонд', value: 'Журналы наблюдений, карты погоды и учебные планшеты' },
      { label: 'Кейсы', value: 'Исторические циклоны, наводнения и блокирующие процессы' },
      { label: 'Доступ', value: 'Сам читальный зал открыт; отдельные материалы открываются по учебному прогрессу.' },
    ],
  },
  'tournament-hall': {
    id: 'tournament-hall',
    title: 'Турнирный зал дуэлей',
    subtitle: 'Квалификационные зачёты и синоптические соревнования',
    availableStatusLabel: 'Доступно · квалификационный зачёт',
    lockedStatusLabel: 'Закрыто · нужен зачёт',
    unlockRequirement: 'Зал открывается после стартового зачёта по коду КН-01.',
    textureKey: 'bld-tournament',
    specs: [
      { label: 'Дисциплины', value: 'Блиц КН-01, поиск ошибок нанесения и барический анализ' },
      { label: 'Режим', value: 'Соревновательные задания с серверной проверкой ответа' },
    ],
  },
};
