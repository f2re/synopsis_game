export interface FacilitySpec {
  label: string;
  value: string;
}

export interface FacilityDossier {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  isLocked: boolean;
  unlockRequirement?: string;
  textureKey: string;
  specs: readonly FacilitySpec[];
}

export const FACILITY_DOSSIERS: Readonly<Record<string, FacilityDossier>> = {
  radar: {
    id: 'radar',
    title: 'Радарный комплекс ДМРЛ-С',
    subtitle: 'Доплеровский двухполяризационный метеорологический радиолокатор',
    statusLabel: 'Закрыто · уровень 2',
    isLocked: true,
    unlockRequirement: 'Комплекс открывается после первой смены КН-01 и получения допуска уровня 2 «Радар».',
    textureKey: 'bld-radar',
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
    statusLabel: 'Закрыто · требуется КН-01',
    isLocked: true,
    unlockRequirement: 'Доступ открывается после подтверждения базовой дешифровки сводок КН-01.',
    textureKey: 'bld-cartography',
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
    statusLabel: 'Доступно · дежурная смена',
    isLocked: false,
    textureKey: 'bld-synoptic',
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
    statusLabel: 'Закрыто · уровень 3',
    isLocked: true,
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
    statusLabel: 'Закрыто · требуется КН-01',
    isLocked: true,
    unlockRequirement: 'Архив открывается после завершения первой дежурной смены по коду КН-01.',
    textureKey: 'bld-archive',
    specs: [
      { label: 'Фонд', value: 'Журналы наблюдений, карты погоды и учебные планшеты' },
      { label: 'Кейсы', value: 'Исторические циклоны, наводнения и блокирующие процессы' },
    ],
  },
  'tournament-hall': {
    id: 'tournament-hall',
    title: 'Турнирный зал дуэлей',
    subtitle: 'Квалификационные зачёты и синоптические соревнования',
    statusLabel: 'Закрыто · нужен зачёт',
    isLocked: true,
    unlockRequirement: 'Зал открывается после стартового зачёта по коду КН-01.',
    textureKey: 'bld-tournament',
    specs: [
      { label: 'Дисциплины', value: 'Блиц КН-01, поиск ошибок нанесения и барический анализ' },
      { label: 'Режим', value: 'Соревновательные задания с серверной проверкой ответа' },
    ],
  },
};
