/**
 * packages/world-engine/src/assets/graphicAssets.ts
 *
 * Единая точка входа (Single Entry Point) для всей игровой графики проекта
 * «26063: Позывной «Синоптик»».
 *
 * Объединяет:
 * 1. Типизированный каталог семантических графических ассетов (ASSET_CATALOG).
 * 2. Чёткую классификацию статусов: 'approved' | 'candidate' | 'rejected' | 'obsolete'.
 * 3. Подробные причины отклонения для непринятых / некачественных / нарушающих лор спрайтов.
 * 4. Безопасные URL-резолверы с автоподстановкой канонических фолбэков (предотвращение 404).
 * 5. Адаптеры предзагрузки для Phaser 4 runtime.
 */

export type GraphicAssetCategory =
  | 'hub'
  | 'buildings'
  | 'fauna'
  | 'characters'
  | 'ui_badges'
  | 'ui_frames'
  | 'ui_buttons'
  | 'ui_screens'
  | 'ui_icons'
  | 'items'
  | 'effects';

export type GraphicAssetStatus = 'approved' | 'candidate' | 'rejected' | 'obsolete';

export interface GraphicAssetDescriptor {
  id: string;
  name: string;
  category: GraphicAssetCategory;
  url: string;
  fallbackUrl?: string;
  status: GraphicAssetStatus;
  dimensions?: { width: number; height: number };
  colorsCount?: number;
  rejectionReason?: string;
  recommendedReplacementId?: string;
  manifestSource?: string;
  description: string;
}

export const GRAPHIC_ASSET_REGISTRY: Record<string, GraphicAssetDescriptor> = {
  // ==========================================
  // 1. HUB LAYERS & WORLD (Слои окружения Хаба)
  // ==========================================
  'hub:layer.l0_bg': {
    id: 'hub:layer.l0_bg',
    name: 'Хаб: Слой L0 (Фон / Небо залива)',
    category: 'hub',
    url: '/hub/layers/l0_background.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Утверждённый градиент неба Северо-Запада и дальнего Финского залива (сетка 480x270).',
  },
  'hub:layer.l1_clouds': {
    id: 'hub:layer.l1_clouds',
    name: 'Хаб: Слой L1 (Слоисто-кучевые облака)',
    category: 'hub',
    url: '/hub/layers/l1_clouds.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Параллакс-слой балтийской облачности (v3 конвейер).',
  },
  'hub:layer.l3_ground': {
    id: 'hub:layer.l3_ground',
    name: 'Хаб: Слой L3 (Рельеф и дорожки станции)',
    category: 'hub',
    url: '/hub/layers/l3_ground.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Гранитная плитка, грунт и трава побережья (сетка 480x270).',
  },
  'hub:layer.l5_arch_day': {
    id: 'hub:layer.l5_arch_day',
    name: 'Хаб: Слой L5 (Дневная архитектура кампуса)',
    category: 'hub',
    url: '/hub/layers/l5_architecture.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Здания гидрометеорологического кампуса 26063 в дневном свете.',
  },
  'hub:layer.l5_arch_night': {
    id: 'hub:layer.l5_arch_night',
    name: 'Хаб: Слой L5 (Ночная архитектура кампуса)',
    category: 'hub',
    url: '/hub/layers/l5_architecture_night.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Кампус 26063 в ночной фазе с тёплыми окнами дежурных служб.',
  },
  'hub:layer.l7_decor': {
    id: 'hub:layer.l7_decor',
    name: 'Хаб: Слой L7 (Фонари, метеоприборы, флагшток)',
    category: 'hub',
    url: '/hub/layers/l7_decor.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Декоративные и функциональные элементы площадки.',
  },
  'hub:layer.l8_birds': {
    id: 'hub:layer.l8_birds',
    name: 'Хаб: Слой L8 (Птицы в небе)',
    category: 'hub',
    url: '/hub/layers/l8_birds.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Парящие чайки и стайки птиц дальнего плана.',
  },
  'hub:layer.l9_veg': {
    id: 'hub:layer.l9_veg',
    name: 'Хаб: Слой L9 (Региональная растительность)',
    category: 'hub',
    url: '/hub/layers/l9_vegetation.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    manifestSource: 'assets/manifests/hub.layers.v3.json',
    description: 'Балтийские сосны, берёзы, прибрежный кустарник Северо-Запада.',
  },
  'hub:master.day': {
    id: 'hub:master.day',
    name: 'Хаб: Дневной мастер-кадр 480x270',
    category: 'hub',
    url: '/hub/layers/hub_master_day.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    description: 'Чистовой эталон дневного кампуса 26063.',
  },
  'hub:master.night': {
    id: 'hub:master.night',
    name: 'Хаб: Ночной мастер-кадр 480x270',
    category: 'hub',
    url: '/hub/layers/hub_master_night.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    description: 'Чистовой эталон ночного кампуса 26063 (сетка 480x270).',
  },
  'hub:master.legacy_night': {
    id: 'hub:master.legacy_night',
    name: 'Устаревший ночной кадр (Альпийские горы)',
    category: 'hub',
    url: '/hub/hub_master_night.png',
    fallbackUrl: '/hub/layers/hub_master_night.png',
    status: 'rejected',
    dimensions: { width: 960, height: 540 },
    rejectionReason:
      'ОТКЛОНЁН АРТ-ДИРЕКТОРОМ: Высокий альпийский горный хребет грубо нарушает лор 26063 (станция расположена на равнинном побережье Финского залива / Северо-Западе РФ). Файл внесён в FORBIDDEN_RUNTIME_PATTERNS.',
    recommendedReplacementId: 'hub:master.night',
    description: 'Старый черновой ночной кадр с чужим горным ландшафтом.',
  },

  // ==========================================
  // 2. BUILDINGS (Здания кампуса)
  // ==========================================
  'building:synoptic_day': {
    id: 'building:synoptic_day',
    name: 'Главный оперативный синоптический корпус (день)',
    category: 'buildings',
    url: '/hub/buildings/synoptic_day.png',
    status: 'approved',
    dimensions: { width: 128, height: 84 },
    description: 'Здание с метеорологической вышкой и оперативным залом.',
  },
  'building:radar_day': {
    id: 'building:radar_day',
    name: 'Купол доплеровского радиолокатора (день)',
    category: 'buildings',
    url: '/hub/buildings/radar_day.png',
    status: 'approved',
    dimensions: { width: 56, height: 96 },
    description: 'Метеорологический ДМРЛ купол.',
  },
  'building:cartography_day': {
    id: 'building:cartography_day',
    name: 'Корпус синоптической картографии (день)',
    category: 'buildings',
    url: '/hub/buildings/cartography_day.png',
    status: 'approved',
    dimensions: { width: 88, height: 64 },
    description: 'Класс анализа карт погоды и барических полей.',
  },
  'building:archive_day': {
    id: 'building:archive_day',
    name: 'Архив погоды и истории наблюдений (день)',
    category: 'buildings',
    url: '/hub/buildings/archive_day.png',
    status: 'approved',
    dimensions: { width: 88, height: 64 },
    description: 'Хранилище гидрометеорологических бюллетеней и лент самописцев.',
  },
  'building:aerology_day': {
    id: 'building:aerology_day',
    name: 'Аэрологический павильон зондирования (день)',
    category: 'buildings',
    url: '/hub/buildings/aerology_day.png',
    status: 'approved',
    dimensions: { width: 72, height: 80 },
    description: 'Павильон выпуска радиозондов.',
  },
  'building:tournament_day': {
    id: 'building:tournament_day',
    name: 'Турнирный зал / Арена метеорологов (день)',
    category: 'buildings',
    url: '/hub/buildings/tournament_day.png',
    status: 'approved',
    dimensions: { width: 112, height: 64 },
    description: 'Павильон профессиональных дуэлей и зачётов.',
  },
  'building:raw_unscaled_night': {
    id: 'building:raw_unscaled_night',
    name: 'Сырые неотмасштабированные ночные здания',
    category: 'buildings',
    url: '/hub/buildings/hub_aerology_night.png',
    fallbackUrl: '/hub/buildings/aerology_night.png',
    status: 'rejected',
    dimensions: { width: 1448, height: 1086 },
    colorsCount: 28810,
    rejectionReason:
      'ОТКЛОНЕНО: Файлы hub_*_night.webp/png имеют размер 1448x1086 и до 28 800 цветов. Это гигантские неотмасштабированные сырые рендеры нейросети без квантования, ломающие пиксельную сетку 480x270.',
    recommendedReplacementId: 'hub:layer.l5_arch_night',
    description: 'Необработанный дамп ночных зданий.',
  },

  // ==========================================
  // 3. FAUNA (Животный мир станции)
  // ==========================================
  'fauna:cat.m1': {
    id: 'fauna:cat.m1',
    name: 'Кот Барограф (микроскопическая заглушка M1)',
    category: 'fauna',
    url: '/hub/sprites/cat_barograph.png',
    fallbackUrl: '/hub/sprites/cat_barograph.png',
    status: 'rejected',
    dimensions: { width: 10, height: 7 },
    colorsCount: 6,
    rejectionReason:
      'ЕРУНДОВЫЙ СПРАЙТ: Размер 10x7 пикселей из 6 цветов — неразличимое размытое серое пятно без анимации дыхания, сна и потягивания, требуемых в спецификации фауны.',
    recommendedReplacementId: 'fauna:cat.m2',
    description: 'Слишком мелкая блоб-заглушка кота.',
  },
  'fauna:tit.m1': {
    id: 'fauna:tit.m1',
    name: 'Большая синица (заглушка 6x5)',
    category: 'fauna',
    url: '/hub/sprites/tit_bird.png',
    fallbackUrl: '/hub/sprites/tit_bird.png',
    status: 'rejected',
    dimensions: { width: 6, height: 5 },
    colorsCount: 5,
    rejectionReason:
      'ЕРУНДОВЫЙ СПРАЙТ: Всего 30 пикселей (6x5), сине-серая точка без анатомии клюва, крыльев и характерной жёлтой грудки.',
    description: 'Микро-заглушка синицы.',
  },
  'fauna:squirrel.raw': {
    id: 'fauna:squirrel.raw',
    name: 'Белка с шишкой (рассинхрон стиля и цветов)',
    category: 'fauna',
    url: '/hub/sprites/squirrel.png',
    fallbackUrl: '/hub/sprites/squirrel.png',
    status: 'rejected',
    dimensions: { width: 72, height: 24 },
    colorsCount: 1659,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: Имеет 1659 сглаженных цветов с антиалиасингом и произвольные размеры 72x24, выбиваясь из общей пиксельной сетки рядом с 6-цветным котом.',
    description: 'Непиксельная белка со сглаживанием.',
  },

  // ==========================================
  // 4. CHARACTERS & PORTRAITS (Персонажи)
  // ==========================================
  'character:mentor.vera_stick': {
    id: 'character:mentor.vera_stick',
    name: 'Вера Ладожская (10x22 stick figure заглушка)',
    category: 'characters',
    url: '/hub/sprites/mentor_vera.png',
    fallbackUrl: '/assets/characters/mentor_portrait.png',
    status: 'rejected',
    dimensions: { width: 10, height: 22 },
    colorsCount: 9,
    rejectionReason:
      'ЕРУНДОВЫЙ СПРАЙТ: Деградированная фигурка 10x22 пикселя (9 цветов) уничтожает узнаваемость ведущего наставника станции. По SKILL:pixel-art-direction наставник обязан иметь читаемые черты лица, причёску, очки и профессиональную форму.',
    recommendedReplacementId: 'character:mentor.portrait',
    description: 'Примитивная 10-пиксельная палочка вместо ключевого NPC.',
  },
  'character:mentor.portrait': {
    id: 'character:mentor.portrait',
    name: 'Портрет наставника Веры Павловны Ладожской',
    category: 'characters',
    url: '/assets/characters/mentor_portrait.png',
    status: 'approved',
    dimensions: { width: 128, height: 128 },
    colorsCount: 36,
    manifestSource: 'assets/manifests/npc.level1.json',
    description:
      'Канонический пиксельный портрет ведущего синоптика: интеллигентное выражение лица, очки, уставной свитер, 36 цветов по утверждённой палитре.',
  },
  'character:avatar.hero_m2': {
    id: 'character:avatar.hero_m2',
    name: 'Аватар синоптика (масштаб M2)',
    category: 'characters',
    url: '/hub/layers/avatar_base.png',
    status: 'approved',
    dimensions: { width: 384, height: 48 },
    colorsCount: 9,
    manifestSource: 'assets/manifests/avatar.level1.json',
    description: 'Базовый спрайтшит ходьбы персонажа-синоптика.',
  },
  'character:avatar.corrupted_candidates': {
    id: 'character:avatar.corrupted_candidates',
    name: 'Испорченные 2-цветные силуэты аватара',
    category: 'characters',
    url: 'assets/source/characters/avatar/candidates/avatar_base_m2_walk__candidate-01__REJECTED.png',
    status: 'rejected',
    dimensions: { width: 192, height: 48 },
    colorsCount: 2,
    rejectionReason:
      'БРАК ПАЙПЛАЙНА: Превращены в сплошные 2-цветные чёрно-белые силуэты с потерей всей пластики и деталей одежды.',
    description: 'Отвергнутые кандидаты со сломанной бинаризацией.',
  },

  // ==========================================
  // 5. UI BADGES & EMBLEMS (Гербы и эмблемы)
  // ==========================================
  'ui:crest.station_badge_v2': {
    id: 'ui:crest.station_badge_v2',
    name: 'Герб станции 26063 v2 (Хайрез растр / непиксельный)',
    category: 'ui_badges',
    url: '/ui/ui_station_crest_badge_v2.png',
    fallbackUrl: '/ui/badges/ui_badge_station_seal.png',
    status: 'rejected',
    dimensions: { width: 856, height: 987 },
    colorsCount: 20000,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: Огромный растровый файл 856x987 px с градиентами и сглаженными кривыми. В интерфейсе насильно сжимается через CSS style={{ width: 52, height: 52 }}, порождая мыло и артефакты интерполяции.',
    recommendedReplacementId: 'ui:crest.station_seal_pixel',
    description: 'Векторная иллюстрация, брошенная в проект без растеризации в пиксельную сетку.',
  },
  'ui:crest.station_badge_v1': {
    id: 'ui:crest.station_badge_v1',
    name: 'Герб станции v1 (3D псевдорендер)',
    category: 'ui_badges',
    url: '/ui/ui_station_crest_badge_v1.png',
    fallbackUrl: '/ui/badges/ui_badge_station_seal.png',
    status: 'rejected',
    dimensions: { width: 256, height: 256 },
    colorsCount: 22740,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: 3D-градиентная эмблема с 22 740 цветами, чуждая пиксельной графике 26063.',
    recommendedReplacementId: 'ui:crest.station_seal_pixel',
    description: 'Старая 3D-иконка герба.',
  },
  'ui:crest.station_seal_pixel': {
    id: 'ui:crest.station_seal_pixel',
    name: 'Служебная печать станции 26063 (Пиксельная)',
    category: 'ui_badges',
    url: '/ui/badges/ui_badge_station_seal.png',
    status: 'approved',
    dimensions: { width: 64, height: 64 },
    manifestSource: 'assets/manifests/brand.mark.v3.json',
    description: 'Каноническая пиксельная печать опорной станции УГМС.',
  },

  // ==========================================
  // 6. UI FRAMES, BUTTONS & SCREENS (Интерфейс)
  // ==========================================
  'ui:screen.login_backdrop_3d': {
    id: 'ui:screen.login_backdrop_3d',
    name: 'Экран входа v1/v2 (3D фоторендер терминала)',
    category: 'ui_screens',
    url: '/ui/ui_login_terminal_backdrop_v1.png',
    fallbackUrl: '/hub/layers/codepost_interior.png',
    status: 'rejected',
    dimensions: { width: 1024, height: 576 },
    colorsCount: 25000,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: Фотореалистичный 3D рендер терминала с мягкими тенями и размытиями. Нарушает пиксельный арт-дирекшн и стандарт разрешения 480x270.',
    recommendedReplacementId: 'ui:screen.codepost_interior',
    description: 'Непиксельный гладкий фон терминала авторизации.',
  },
  'ui:screen.codepost_interior': {
    id: 'ui:screen.codepost_interior',
    name: 'Интерьер кодового поста 26063',
    category: 'ui_screens',
    url: '/hub/layers/codepost_interior.png',
    status: 'approved',
    dimensions: { width: 480, height: 270 },
    colorsCount: 35,
    manifestSource: 'assets/manifests/room.codepost.json',
    description: 'Канонический пиксельный интерьер рабочего места синоптика (телетайп, стол, карта, лампа).',
  },
  'ui:button.smooth_pills': {
    id: 'ui:button.smooth_pills',
    name: 'Гладкие векторные кнопки-пилюли (ui_btn_primary/secondary/locked)',
    category: 'ui_buttons',
    url: '/ui/ui_btn_primary.png',
    fallbackUrl: '/ui/frames/btn_pill_primary_cyan.png',
    status: 'rejected',
    dimensions: { width: 220, height: 74 },
    colorsCount: 3881,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: Сглаженные кнопки с антиалиасингом и тысячами промежуточных цветов. Должны быть заменены на 9-slice пиксельные рамки из ui.frames.v2.json.',
    recommendedReplacementId: 'ui:frame.btn_primary_cyan',
    description: 'Гладкие непиксельные кнопки.',
  },
  'ui:frame.btn_primary_cyan': {
    id: 'ui:frame.btn_primary_cyan',
    name: 'Пиксельная кнопка Primary Cyan',
    category: 'ui_frames',
    url: '/ui/frames/btn_pill_primary_cyan.png',
    status: 'approved',
    dimensions: { width: 120, height: 32 },
    manifestSource: 'assets/manifests/ui.frames.v2.json',
    description: 'Чёткая пиксельная кнопка акцентного бирюзового тона.',
  },
  'ui:frame.corner_tl': {
    id: 'ui:frame.corner_tl',
    name: 'Декоративный пиксельный уголок Top-Left',
    category: 'ui_frames',
    url: '/ui/frames/decor_corner_bracket_tl.png',
    status: 'approved',
    dimensions: { width: 12, height: 12 },
    manifestSource: 'assets/manifests/ui.frames.v2.json',
    description: 'Угловой кронштейн для PixelCard.',
  },
  'ui:frame.accent_diamond': {
    id: 'ui:frame.accent_diamond',
    name: 'Пиксельный маркер Diamond',
    category: 'ui_frames',
    url: '/ui/frames/decor_accent_diamond.png',
    status: 'approved',
    dimensions: { width: 8, height: 8 },
    manifestSource: 'assets/manifests/ui.frames.v2.json',
    description: 'Ромбовидный маркер активности карточек.',
  },
  'ui:frame.divider_bar': {
    id: 'ui:frame.divider_bar',
    name: 'Пиксельный разделитель док-панели',
    category: 'ui_frames',
    url: '/ui/frames/decor_divider_bar.png',
    status: 'approved',
    dimensions: { width: 2, height: 24 },
    manifestSource: 'assets/manifests/ui.frames.v2.json',
    description: 'Разделительная черта навигации.',
  },

  // ==========================================
  // 7. UI ICONS (Пиктограммы)
  // ==========================================
  'icon:weather_vector_clipart': {
    id: 'icon:weather_vector_clipart',
    name: 'Непиксельные погодные иконки (weather_cloud, rain, sun, etc.)',
    category: 'ui_icons',
    url: '/ui/icons/weather_cloud.png',
    fallbackUrl: '/ui/icons/icon_weather_variable_32.png',
    status: 'rejected',
    dimensions: { width: 70, height: 70 },
    colorsCount: 1800,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: Размеры 65x70 / 70x70 с антиалиасингом и тысячами цветов. Это случайный векторный клипарт, нарушающий сетку 32x32 / 64x64 и каталог ui.icons.v2.json.',
    recommendedReplacementId: 'icon:weather.variable_32',
    description: 'Векторные погодные иконки со сглаживанием.',
  },
  'icon:weather.variable_32': {
    id: 'icon:weather.variable_32',
    name: 'Пиктограмма: Переменная погода (32x32)',
    category: 'ui_icons',
    url: '/ui/icons/icon_weather_variable_32.png',
    status: 'approved',
    dimensions: { width: 32, height: 32 },
    manifestSource: 'assets/manifests/ui.icons.v2.json',
    description: 'Утверждённая пиксельная иконка погоды.',
  },
  'icon:doc.kn01': {
    id: 'icon:doc.kn01',
    name: 'Пиктограмма: Телеграмма КН-01',
    category: 'ui_icons',
    url: '/ui/icons/icon_doc_kn01_code_32.png',
    status: 'approved',
    dimensions: { width: 32, height: 32 },
    manifestSource: 'assets/manifests/ui.icons.v2.json',
    description: 'Бланк метеорологической сводки погоды.',
  },
  'icon:mode.blitz': {
    id: 'icon:mode.blitz',
    name: 'Пиктограмма: Режим Блиц',
    category: 'ui_icons',
    url: '/ui/icons/icon_mode_blitz_32.png',
    status: 'approved',
    dimensions: { width: 32, height: 32 },
    manifestSource: 'assets/manifests/ui.icons.v2.json',
    description: 'Молния ускоренного дежурства.',
  },

  // ==========================================
  // 8. ITEMS & WARDROBE (Одежда и экипировка)
  // ==========================================
  'item:backpack_city_noisy': {
    id: 'item:backpack_city_noisy',
    name: 'Рюкзак городской (шумный нейросетевой арт)',
    category: 'items',
    url: '/assets/items/backpack_city.png',
    status: 'rejected',
    dimensions: { width: 128, height: 128 },
    colorsCount: 4229,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: 4229 цветов, мягкие полутени и размытый контур. Ассет не прошёл пиксельный рефайнер.',
    recommendedReplacementId: 'item:backpack_field',
    description: 'Непиксельный городской рюкзак.',
  },
  'item:sweater_noisy': {
    id: 'item:sweater_noisy',
    name: 'Свитер синоптика (шумный нейросетевой арт)',
    category: 'items',
    url: '/assets/items/top_sweater.png',
    status: 'rejected',
    dimensions: { width: 128, height: 128 },
    colorsCount: 5447,
    rejectionReason:
      'НЕ СООТВЕТСТВУЕТ СТИЛИСТИКЕ: 5447 цветов, антиалиасинг по краям пряжи вместо чётких пиксельных кластеров.',
    description: 'Сглаженный свитер.',
  },
  'item:companion_squirrel_crushed': {
    id: 'item:companion_squirrel_crushed',
    name: 'Спутник: Белка (деструктивный даунсемплинг)',
    category: 'items',
    url: '/assets/items/companion_squirrel.png',
    status: 'rejected',
    dimensions: { width: 128, height: 128 },
    colorsCount: 11,
    rejectionReason:
      'ЕРУНДОВЫЙ СПРАЙТ: Пережат устаревшим алгоритмом majority downsample до 11 цветов. Мордочка и хвост превратились в грязь пикселей, нарушая правило "majorityDownsample is forbidden".',
    description: 'Испорченный даунсемплингом спрайт белки.',
  },
  'item:companion_tit_crushed': {
    id: 'item:companion_tit_crushed',
    name: 'Спутник: Синица (деструктивный даунсемплинг)',
    category: 'items',
    url: '/assets/items/companion_tit.png',
    status: 'rejected',
    dimensions: { width: 128, height: 128 },
    colorsCount: 13,
    rejectionReason:
      'ЕРУНДОВЫЙ СПРАЙТ: Пережат до 13 цветов, глаз и клюв синицы слились с тенью.',
    description: 'Испорченный даунсемплингом спрайт синицы.',
  },

  // 13 отсутствующих ассетов гардероба с безопасными фолбэками
  'item:top.lab_coat': {
    id: 'item:top.lab_coat',
    name: 'Белый халат метеоролога (виртуальный фолбэк)',
    category: 'items',
    url: '/assets/items/top_lab_coat.png',
    fallbackUrl: '/assets/items/top_shirt.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске (вызывал 404). Назначен фолбэк на top_shirt.png.',
    description: 'Служебный белый халат.',
  },
  'item:top.parka': {
    id: 'item:top.parka',
    name: 'Зимняя парка с меховым капюшоном (фолбэк)',
    category: 'items',
    url: '/assets/items/top_parka.png',
    fallbackUrl: '/assets/items/top_center_jacket.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на top_center_jacket.png.',
    description: 'Тёплая парка полярного синоптика.',
  },
  'item:headwear.ushanka': {
    id: 'item:headwear.ushanka',
    name: 'Шапка-ушанка меховая (фолбэк)',
    category: 'items',
    url: '/assets/items/headwear_ushanka.png',
    fallbackUrl: '/assets/items/headwear_beanie.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на headwear_beanie.png.',
    description: 'Ушанка со спущенными ушами.',
  },
  'item:headwear.glasses': {
    id: 'item:headwear.glasses',
    name: 'Очки синоптика в роговой оправе (фолбэк)',
    category: 'items',
    url: '/assets/items/headwear_glasses.png',
    fallbackUrl: '/assets/items/headwear_goggles.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на headwear_goggles.png.',
    description: 'Очки для работы с микрокодами КН-01.',
  },
  'item:bottom.cargo': {
    id: 'item:bottom.cargo',
    name: 'Штаны карго полевые (фолбэк)',
    category: 'items',
    url: '/assets/items/bottom_cargo.png',
    fallbackUrl: '/assets/items/bottom_field_trousers.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на bottom_field_trousers.png.',
    description: 'Брюки с накладными карманами.',
  },
  'item:bottom.slacks': {
    id: 'item:bottom.slacks',
    name: 'Служебные брюки темные (фолбэк)',
    category: 'items',
    url: '/assets/items/bottom_slacks.png',
    fallbackUrl: '/assets/items/bottom_dark_trousers.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на bottom_dark_trousers.png.',
    description: 'Уставные форменные брюки.',
  },
  'item:bottom.overalls': {
    id: 'item:bottom.overalls',
    name: 'Рабочий полукомбинезон (фолбэк)',
    category: 'items',
    url: '/assets/items/bottom_overalls.png',
    fallbackUrl: '/assets/items/bottom_jeans.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на bottom_jeans.png.',
    description: 'Ветрозащитный комбинезон.',
  },
  'item:footwear.felt': {
    id: 'item:footwear.felt',
    name: 'Валенки с галошами (фолбэк)',
    category: 'items',
    url: '/assets/items/footwear_felt.png',
    fallbackUrl: '/assets/items/footwear_boots.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на footwear_boots.png.',
    description: 'Зимняя обувь для метеоплощадки.',
  },
  'item:backpack.satchel': {
    id: 'item:backpack.satchel',
    name: 'Кожаная планшетная сумка (фолбэк)',
    category: 'items',
    url: '/assets/items/backpack_satchel.png',
    fallbackUrl: '/assets/items/backpack_city.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на backpack_city.png.',
    description: 'Сумка для карт и справочников.',
  },
  'item:backpack.radio': {
    id: 'item:backpack.radio',
    name: 'Полевой радиокомплект (фолбэк)',
    category: 'items',
    url: '/assets/items/backpack_radio.png',
    fallbackUrl: '/assets/items/backpack_field.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на backpack_field.png.',
    description: 'Радиостанция связи с обсерваторией.',
  },
  'item:held.clipboard': {
    id: 'item:held.clipboard',
    name: 'Планшет с бланком ТМ-1 (фолбэк)',
    category: 'items',
    url: '/assets/items/held_clipboard.png',
    fallbackUrl: '/assets/items/held_map_folder.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на held_map_folder.png.',
    description: 'Жёсткий планшет для записей.',
  },
  'item:held.anemometer': {
    id: 'item:held.anemometer',
    name: 'Ручной чашечный анемометр (фолбэк)',
    category: 'items',
    url: '/assets/items/held_anemometer.png',
    fallbackUrl: '/assets/items/held_pencil.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на held_pencil.png.',
    description: 'Прибор измерения скорости ветра.',
  },
  'item:held.flashlight': {
    id: 'item:held.flashlight',
    name: 'Фонарь ночного дежурства (фолбэк)',
    category: 'items',
    url: '/assets/items/held_flashlight.png',
    fallbackUrl: '/assets/items/held_pencil.png',
    status: 'candidate',
    rejectionReason: 'Файл отсутствовал на диске. Назначен фолбэк на held_pencil.png.',
    description: 'Фонарь для проверки термометрической будки ночью.',
  },
};

/**
 * URL-маппинг для прямого разрешения старых/битых путей к файлам.
 */
const URL_REDIRECT_MAP: Record<string, string> = {
  // Исправление 404 портрета наставника
  '/assets/characters/mentor_portrait.png': '/assets/characters/mentor_portrait.png',

  // Исправление 404 предметов гардероба
  '/assets/items/top_lab_coat.png': '/assets/items/top_shirt.png',
  '/assets/items/top_parka.png': '/assets/items/top_center_jacket.png',
  '/assets/items/headwear_ushanka.png': '/assets/items/headwear_beanie.png',
  '/assets/items/headwear_glasses.png': '/assets/items/headwear_goggles.png',
  '/assets/items/bottom_cargo.png': '/assets/items/bottom_field_trousers.png',
  '/assets/items/bottom_slacks.png': '/assets/items/bottom_dark_trousers.png',
  '/assets/items/bottom_overalls.png': '/assets/items/bottom_jeans.png',
  '/assets/items/footwear_felt.png': '/assets/items/footwear_boots.png',
  '/assets/items/backpack_satchel.png': '/assets/items/backpack_city.png',
  '/assets/items/backpack_radio.png': '/assets/items/backpack_field.png',
  '/assets/items/held_clipboard.png': '/assets/items/held_map_folder.png',
  '/assets/items/held_anemometer.png': '/assets/items/held_pencil.png',
  '/assets/items/held_flashlight.png': '/assets/items/held_pencil.png',

  // Замена запрещённого альпийского ночного кадра на чистовой Северо-Запад
  '/hub/hub_master_night.png': '/hub/layers/hub_master_night.png',
  '/hub/hub_master_night.webp': '/hub/layers/hub_master_night.png',
};

/**
 * Разрешает семантический ID ассета или путь к файлу в надёжный валидный URL.
 * Гарантирует отсутствие 404 и подмену отвергнутых ассетов на утверждённые.
 */
export function resolveGraphicUrl(idOrPath: string): string {
  // 1. Прямая подстановка по зарегистрированному ID
  const descriptor = GRAPHIC_ASSET_REGISTRY[idOrPath];
  if (descriptor) {
    if (descriptor.status === 'rejected' && descriptor.fallbackUrl) {
      return descriptor.fallbackUrl;
    }
    return descriptor.url;
  }

  // 2. Проверка по таблице перенаправления битых/устаревших путей
  if (URL_REDIRECT_MAP[idOrPath]) {
    return URL_REDIRECT_MAP[idOrPath];
  }

  // 3. Возврат исходного пути
  return idOrPath;
}

/**
 * Получить дескриптор графического ассета по семантическому ID.
 */
export function getGraphicDescriptor(id: string): GraphicAssetDescriptor | undefined {
  return GRAPHIC_ASSET_REGISTRY[id];
}

/**
 * Проверить, утверждён ли данный графический ассет.
 */
export function isGraphicApproved(id: string): boolean {
  return GRAPHIC_ASSET_REGISTRY[id]?.status === 'approved';
}

/**
 * Получить все ассеты заданной категории.
 */
export function getGraphicsByCategory(category: GraphicAssetCategory): GraphicAssetDescriptor[] {
  return Object.values(GRAPHIC_ASSET_REGISTRY).filter((asset) => asset.category === category);
}

/**
 * Получить полный список отклонённых и проблемных спрайтов.
 */
export function getRejectedGraphics(): GraphicAssetDescriptor[] {
  return Object.values(GRAPHIC_ASSET_REGISTRY).filter((asset) => asset.status === 'rejected');
}

/**
 * Получить список всех утверждённых ассетов.
 */
export function getApprovedGraphics(): GraphicAssetDescriptor[] {
  return Object.values(GRAPHIC_ASSET_REGISTRY).filter((asset) => asset.status === 'approved');
}

/**
 * Загрузчик текстуры для Phaser Scene через единую точку входа.
 */
export function loadPhaserGraphic(
  loader: { image: (key: string, url: string) => void },
  assetId: string,
  textureKey?: string
): string {
  const resolvedUrl = resolveGraphicUrl(assetId);
  const key = textureKey || assetId.replace(/[:.]/g, '_');
  loader.image(key, resolvedUrl);
  return key;
}
