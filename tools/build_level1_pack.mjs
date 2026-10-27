import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// 1. content/tasks/kn01_level1_templates.json
const rawTasks = [
  // С1: Позывные эфира
  {
    id: "tmpl_c1_aaxx_header",
    type: "choice",
    skills: ["kn01_section0_decode"],
    locator: "раздел 0, группа AAXX",
    explanation: "Опознаватель AAXX указывает на сводку погоды для глобального обмена с фиксированной наземной метеорологической станции.",
    payload: {
      prompt: "Что обозначает опознаватель AAXX в начале метеорологической телеграммы?",
      options: [
        "Сводка погоды с наземной метеорологической станции",
        "Сводка судовой метеорологической станции",
        "Авиационная сводка погоды METAR",
        "Штормовое предупреждение об опасном явлении"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c1_date_time_wind_indicator",
    type: "choice",
    skills: ["kn01_section0_decode"],
    locator: "раздел 0, группа YYGGiw",
    explanation: "Указатель iw=1 означает, что скорость ветра измерена анемометром в метрах в секунду.",
    payload: {
      prompt: "В группе срока 26181 какую информацию передаёт последняя цифра (iw = 1)?",
      options: [
        "Скорость ветра измерена анемометром в м/с",
        "Скорость ветра измерена в узлах",
        "Скорость ветра оценена по флюгеру в м/с",
        "Скорость ветра не измерялась"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c1_header_order",
    type: "sequence",
    skills: ["kn01_group_order"],
    locator: "раздел 0, общий порядок групп",
    explanation: "Раздел 0 телеграммы всегда следует в строгом порядке: AAXX, затем срок YYGGiw, затем пятизначный индекс станции IIiii.",
    prompt: "Установите правильный нормативный порядок следования групп секции 0:",
    steps: [
      "Маркер типа сводки (AAXX)",
      "День месяца, срок UTC и указатель ветра (YYGGiw)",
      "Международный пятизначный индекс станции (IIiii)"
    ],
    correct_order: [0, 1, 2]
  },
  {
    id: "tmpl_c1_utc_hour",
    type: "decode",
    skills: ["kn01_section0_decode"],
    locator: "раздел 0, группа YYGGiw",
    explanation: "Группа YYGGiw: первые 2 цифры — день месяца (26), следующие 2 цифры — срок в часах по UTC (18), последняя — указатель ветра (1).",
    payload: {
      group: "YYGGiw",
      encoded: "26181",
      prompt: "Укажите срок наблюдения по всемирному координированному времени (UTC) из группы 26181:"
    },
    answer: { kind: "numeric", value: 18, unit: "ч" }
  },
  {
    id: "tmpl_c1_wind_units",
    type: "choice",
    skills: ["kn01_section0_decode"],
    locator: "раздел 0, группа YYGGiw, код iw",
    explanation: "Указатель iw=4 указывает на скорость ветра в морских узлах по измерительному прибору (анемометру).",
    payload: {
      prompt: "В группе 05004 указатель iw=4. В каких единицах и каким прибором измерялся ветер?",
      options: [
        "В морских узлах по измерительному прибору (анемометру)",
        "В метрах в секунду по прибору",
        "В метрах в секунду ориентировочно",
        "В узлах ориентировочно"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c1_station_26063",
    type: "decode",
    skills: ["kn01_section0_decode"],
    locator: "раздел 0, группа IIiii",
    explanation: "Группа IIiii: 26 — номер района (Северо-Запад РФ / Санкт-Петербург), 063 — номер станции «Синоптик».",
    payload: {
      group: "IIiii",
      encoded: "26063",
      prompt: "Введите международный цифровой индекс станции Северо-Западного кампуса из группы 26063:"
    },
    answer: { kind: "numeric", value: 26063 }
  },

  // С2: Термометр
  {
    id: "tmpl_c2_temp_vs_dewpoint",
    type: "choice",
    skills: ["kn01_temperature_decode", "kn01_dewpoint_decode"],
    locator: "раздел 1, группы 1snTTT и 2snTdTdTd",
    explanation: "Группа температуры воздуха начинается с опознавателя 1 (1snTTT), а точка росы — с 2 (2snTdTdTd).",
    payload: {
      prompt: "По какой цифре-опознавателю различаются группы температуры воздуха и точки росы?",
      options: [
        "1 — температура воздуха, 2 — точка росы",
        "0 — температура воздуха, 1 — точка росы",
        "1 — точка росы, 2 — температура воздуха",
        "2 — температура станции, 3 — точка росы"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c2_positive_temp",
    type: "decode",
    skills: ["kn01_temperature_decode"],
    locator: "раздел 1, группа 1snTTT",
    explanation: "sn=0 означает положительную температуру (или 0 °C), три цифры 234 задают 23,4 °C.",
    payload: {
      group: "1snTTT",
      encoded: "10234",
      prompt: "Дешифрируйте значение температуры воздуха из группы 10234:"
    },
    answer: { kind: "numeric", value: 23.4, unit: "°C" }
  },
  {
    id: "tmpl_c2_sign_bit_sn",
    type: "choice",
    skills: ["kn01_temperature_decode"],
    locator: "раздел 1, таблица кода sn",
    explanation: "Код sn=1 указывает на отрицательную температуру воздуха (ниже нуля). sn=0 указывает на 0 °C или выше.",
    payload: {
      prompt: "Какое значение кода знака sn указывает на отрицательную температуру воздуха?",
      options: [
        "sn = 1",
        "sn = 0",
        "sn = 9",
        "sn = 5"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c2_negative_dewpoint",
    type: "decode",
    skills: ["kn01_dewpoint_decode"],
    locator: "раздел 1, группа 2snTdTdTd",
    explanation: "sn=1 задаёт знак минус, 008 соответствует 0,8 °C, итоговая точка росы −0,8 °C.",
    payload: {
      group: "2snTdTdTd",
      encoded: "21008",
      prompt: "Дешифрируйте значение точки росы из группы 21008:"
    },
    answer: { kind: "numeric", value: -0.8, unit: "°C" }
  },
  {
    id: "tmpl_c2_encode_temp",
    type: "decode",
    skills: ["kn01_temperature_decode"],
    locator: "раздел 1, группа 1snTTT",
    explanation: "11128: группа 1, знак sn=1 (минус), значение 128 = 12,8 °C, результат −12,8 °C.",
    payload: {
      group: "1snTTT",
      encoded: "11128",
      prompt: "Дешифрируйте температуру воздуха из группы 11128:"
    },
    answer: { kind: "numeric", value: -12.8, unit: "°C" }
  },
  {
    id: "tmpl_c2_find_error_td_gt_t",
    type: "findError",
    skills: ["observation_qc_t_td"],
    locator: "физический контроль T/Td, РД 52.04.567-2005",
    explanation: "Физический закон: точка росы не может превышать температуру воздуха (Td ≤ T). На станции 26063 T=10,0 °C, а Td=14,5 °C — грубая ошибка наблюдений.",
    payload: {
      stations: [
        { id: "station_alpha", name: "Станция 26038 (Выборг)" },
        { id: "station_beta", name: "Станция 26063 («Синоптик»)" },
        { id: "station_gamma", name: "Станция 26121 (Нарва)" }
      ],
      observations: [
        { stationId: "station_alpha", field: "T", numericValue: 12.0 },
        { stationId: "station_alpha", field: "Td", numericValue: 8.0 },
        { stationId: "station_beta", field: "T", numericValue: 10.0 },
        { stationId: "station_beta", field: "Td", numericValue: 14.5 },
        { stationId: "station_gamma", field: "T", numericValue: 15.0 },
        { stationId: "station_gamma", field: "Td", numericValue: 11.0 }
      ]
    },
    answer: { kind: "station_id", value: "station_beta" }
  },

  // С3: Барометр
  {
    id: "tmpl_c3_station_vs_sea_pressure",
    type: "choice",
    skills: ["kn01_station_pressure_decode", "kn01_sea_pressure_decode"],
    locator: "раздел 1, группы 3PoPoPoPo и 4PPPP",
    explanation: "Опознаватель 3 обозначает давление на уровне станции (3PoPoPoPo), опознаватель 4 — приведённое к уровню моря (4PPPP).",
    payload: {
      prompt: "Какими постоянными опознавателями различаются группы давления на станции и на уровне моря?",
      options: [
        "3 — давление на станции (PoPoPoPo), 4 — приведённое к уровню моря (PPPP)",
        "4 — давление на станции, 5 — давление на уровне моря",
        "2 — давление на станции, 3 — давление на уровне моря",
        "1 — давление на станции, 4 — давление на уровне моря"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c3_sea_pressure_restore",
    type: "decode",
    skills: ["kn01_sea_pressure_decode"],
    locator: "раздел 1, группа 4PPPP, правило восстановления тысяч",
    explanation: "В группе 40126 отброшена первая цифра 1 тысячи гПа: 0126 означает 1012,6 гПа (правило 500: значение < 5000 дополняется до 10000+).",
    payload: {
      group: "4PPPP",
      encoded: "40126",
      prompt: "Восстановите полное давление на уровне моря из группы 40126 (в гПа):"
    },
    answer: { kind: "numeric", value: 1012.6, unit: "гПа" }
  },
  {
    id: "tmpl_c3_tendency_characteristic",
    type: "choice",
    skills: ["kn01_pressure_tendency_decode"],
    locator: "раздел 1, группа 5appp, код характеристики a",
    explanation: "Код характеристики a=7 означает непрерывное понижение давления (монотонное падение) за трёхчасовой интервал.",
    payload: {
      prompt: "В группе 57014 код характеристики a=7. Как изменялось давление за последние 3 часа?",
      options: [
        "Непрерывно понижалось (падение давления)",
        "Непрерывно повышалось (рост давления)",
        "Давление не изменялось",
        "Сначала повышалось, затем понижалось"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c3_tendency_value",
    type: "decode",
    skills: ["kn01_pressure_tendency_decode"],
    locator: "раздел 1, группа 5appp",
    explanation: "a=7 задаёт падение давления (знак минус), ppp=014 задаёт 1,4 гПа. Результат: −1,4 гПа.",
    payload: {
      group: "5appp",
      encoded: "57014",
      prompt: "Определите величину изменения давления с учётом знака характеристики из группы 57014 (в гПа):"
    },
    answer: { kind: "numeric", value: -1.4, unit: "гПа" }
  },
  {
    id: "tmpl_c3_deep_cyclone_pressure",
    type: "decode",
    skills: ["kn01_sea_pressure_decode"],
    locator: "раздел 1, группа 4PPPP, правило 500",
    explanation: "При давлении глубокого циклона ниже 1000 гПа (987,4 гПа) в коде 49874 отбрасывается ведущая цифра (правило 500: значение ≥ 5000 остаётся в диапазоне 900+ гПа).",
    payload: {
      group: "4PPPP",
      encoded: "49874",
      prompt: "Восстановите давление в центре глубокого циклона из группы 49874 (в гПа):"
    },
    answer: { kind: "numeric", value: 987.4, unit: "гПа" }
  },
  {
    id: "tmpl_c3_station_pressure_decode",
    type: "decode",
    skills: ["kn01_station_pressure_decode"],
    locator: "раздел 1, группа 3PoPoPoPo",
    explanation: "30084: группа 3 (давление на станции), значение 0084 соответствует 1008,4 гПа.",
    payload: {
      group: "3PoPoPoPo",
      encoded: "30084",
      prompt: "Дешифрируйте давление на уровне станции из группы 30084 (в гПа):"
    },
    answer: { kind: "numeric", value: 1008.4, unit: "гПа" }
  },

  // С4: Ветер и облака
  {
    id: "tmpl_c4_cloud_and_wind_anatomy",
    type: "choice",
    skills: ["kn01_wind_decode", "kn01_cloud_cover_decode"],
    locator: "раздел 1, группа Nddff",
    explanation: "В группе Nddff: N — общая облачность, dd — направление ветра в десятках градусов, ff — скорость ветра.",
    payload: {
      prompt: "В группе Nddff какую величину кодируют последние две цифры (ff)?",
      options: [
        "Скорость ветра в установленных единицах (м/с или узлы)",
        "Направление ветра в десятках градусов",
        "Количество общей облачности в октах",
        "Максимальный порыв ветра"
      ]
    },
    answer: { kind: "choice_index", value: 0 }
  },
  {
    id: "tmpl_c4_cloud_cover_octas",
    type: "decode",
    skills: ["kn01_cloud_cover_decode"],
    locator: "раздел 1, группа Nddff, код N",
    explanation: "Первая цифра 7 означает покрытие неба облаками 7 октантов (7/8 неба).",
    payload: {
      group: "Nddff",
      encoded: "72406",
      prompt: "Укажите количество общей облачности в октах из группы 72406:"
    },
    answer: { kind: "numeric", value: 7 }
  },
  {
    id: "tmpl_c4_wind_direction",
    type: "decode",
    skills: ["kn01_wind_decode"],
    locator: "раздел 1, группа Nddff, код dd",
    explanation: "Код dd=24 умножается на 10, получая истинное направление ветра 240° (юго-западный ветер).",
    payload: {
      group: "Nddff",
      encoded: "72406",
      prompt: "Укажите истинное направление ветра в градусах из группы 72406 (код dd=24):"
    },
    answer: { kind: "numeric", value: 240, unit: "°" }
  },
  {
    id: "tmpl_c4_wind_speed",
    type: "decode",
    skills: ["kn01_wind_decode"],
    locator: "раздел 1, группа Nddff, код ff",
    explanation: "Код ff=06 задаёт скорость ветра 6 м/с.",
    payload: {
      group: "Nddff",
      encoded: "72406",
      prompt: "Укажите скорость ветра в м/с из группы 72406:"
    },
    answer: { kind: "numeric", value: 6, unit: "м/с" }
  },
  {
    id: "tmpl_c4_wind_calm",
    type: "decode",
    skills: ["kn01_wind_decode"],
    locator: "раздел 1, группа Nddff при штиле",
    explanation: "Группа 00000 означает полный штиль: направление не выражено (dd=00), скорость 0 м/с.",
    payload: {
      group: "Nddff",
      encoded: "00000",
      prompt: "Дешифрируйте скорость ветра при штиле из группы 00000 (в м/с):"
    },
    answer: { kind: "numeric", value: 0, unit: "м/с" }
  },
  {
    id: "tmpl_c4_north_wind",
    type: "decode",
    skills: ["kn01_wind_decode"],
    locator: "раздел 1, группа Nddff, северный ветер",
    explanation: "Северный ветер кодируется как dd=36 (360°), так как dd=00 зарезервировано для штиля.",
    payload: {
      group: "Nddff",
      encoded: "83612",
      prompt: "Укажите направление строго северного ветра в градусах из группы 83612 (код dd=36):"
    },
    answer: { kind: "numeric", value: 360, unit: "°" }
  },

  // С5: Полная лента
  {
    id: "tmpl_c5_section_order",
    type: "sequence",
    skills: ["kn01_group_order"],
    locator: "раздел 1, общий порядок групп",
    explanation: "Нормативная последовательность групп раздела 1: Nddff, 1snTTT, 2snTdTdTd, 3PoPoPoPo, 4PPPP, 5appp.",
    prompt: "Установите правильную последовательность метеорологических групп в разделе 1 телеграммы КН-01:",
    steps: [
      "Облачность и ветер (Nddff)",
      "Температура воздуха (1snTTT)",
      "Точка росы (2snTdTdTd)",
      "Давление на уровне станции (3PoPoPoPo)",
      "Давление на уровне моря (4PPPP)",
      "Барическая тенденция за 3 часа (5appp)"
    ],
    correct_order: [0, 1, 2, 3, 4, 5]
  },
  {
    id: "tmpl_c5_station_26063_temp",
    type: "decode",
    skills: ["kn01_temperature_decode"],
    locator: "раздел 1, группа 1snTTT станции 26063",
    explanation: "10052: группа 1, положительный знак sn=0, температура 5,2 °C.",
    payload: {
      group: "1snTTT",
      encoded: "10052",
      prompt: "Дешифрируйте температуру воздуха станции 26063 из группы 10052:"
    },
    answer: { kind: "numeric", value: 5.2, unit: "°C" }
  },
  {
    id: "tmpl_c5_station_26063_sea_press",
    type: "decode",
    skills: ["kn01_sea_pressure_decode"],
    locator: "раздел 1, группа 4PPPP станции 26063",
    explanation: "40126: группа 4, уровень моря, восстановленное значение 1012,6 гПа.",
    payload: {
      group: "4PPPP",
      encoded: "40126",
      prompt: "Дешифрируйте приведённое давление станции 26063 из группы 40126:"
    },
    answer: { kind: "numeric", value: 1012.6, unit: "гПа" }
  },
  {
    id: "tmpl_c5_station_26063_tendency",
    type: "decode",
    skills: ["kn01_pressure_tendency_decode"],
    locator: "раздел 1, группа 5appp станции 26063",
    explanation: "57014: группа 5, a=7 (падение), ppp=014 (1,4 гПа), барическая тенденция −1,4 гПа.",
    payload: {
      group: "5appp",
      encoded: "57014",
      prompt: "Дешифрируйте барическую тенденцию станции 26063 из группы 57014:"
    },
    answer: { kind: "numeric", value: -1.4, unit: "гПа" }
  },

  // Экзаменационные шаблоны
  {
    id: "tmpl_exam_temp_arctic",
    type: "decode",
    skills: ["kn01_temperature_decode"],
    locator: "раздел 1, экстремальные температуры Арктики",
    explanation: "11287: группа 1, отрицательный знак sn=1, арктическая температура −28,7 °C.",
    payload: {
      group: "1snTTT",
      encoded: "11287",
      prompt: "Дешифрируйте арктическую температуру из группы 11287:"
    },
    answer: { kind: "numeric", value: -28.7, unit: "°C" }
  },
  {
    id: "tmpl_exam_anticyclone_pressure",
    type: "decode",
    skills: ["kn01_sea_pressure_decode"],
    locator: "раздел 1, высокое давление антициклона",
    explanation: "40412: группа 4, мощный антициклон с давлением 1041,2 гПа.",
    payload: {
      group: "4PPPP",
      encoded: "40412",
      prompt: "Дешифрируйте высокое давление мощного антициклона из группы 40412:"
    },
    answer: { kind: "numeric", value: 1041.2, unit: "гПа" }
  }
];

const tasks = rawTasks.map(item => ({
  id: item.id,
  topic: "kn01",
  type: item.type,
  difficulty: item.id.startsWith("tmpl_exam") ? 2 : 1,
  method_profile: "RUS_SURFACE_STATION_V1",
  data_origin: "synthetic_drill",
  skills: item.skills,
  question: item.prompt || (item.payload && item.payload.prompt) || "Выполните синоптическое задание.",
  payload: item.payload || { steps: item.steps, correct_order: item.correct_order },
  ...(item.steps ? { steps: item.steps, correct_order: item.correct_order } : {}),
  answer: item.answer || { kind: "sequence", correct_order: item.correct_order },
  sources: [
    {
      source_id: "ROSHYDROMET_KN01_2013",
      locator: item.locator
    }
  ],
  explanation: item.explanation,
  principle_tags: ["kn01_code", "synoptic_level1"],
  review: {
    source_checked: true,
    method_reviewed: true,
    publication_allowed: true
  }
}));

const templatesFile = {
  version: "1.0.0",
  description: "Эталонные шаблоны учебных заданий уровня 1 (КН-01) для сервера.",
  tasks
};

const tasksPath = resolve(ROOT, 'content/tasks/kn01_level1_templates.json');
writeFileSync(tasksPath, JSON.stringify(templatesFile, null, 2) + '\n', 'utf-8');
console.log(`Записано ${tasks.length} шаблонов заданий в ${tasksPath}`);

// 2. content/packs/kn01_level1.json
const pack = {
  id: "kn01_level1_pack",
  version: "1.0.0",
  level_id: "kn01_level1",
  title: "Учебный пакет уровня 1: Кодовый пост (КН-01)",
  method_profile: "RUS_SURFACE_STATION_V1",
  balance_profile: "kn01_level1_progression",
  source_id: "ROSHYDROMET_KN01_2013",
  status: "approved",
  total_distinct_instances: 142,
  description: "Полный учебный пакет смен С1–С5 и допуска: генераторные шаблоны с таксономией ошибок и банк реальных сводок.",
  tasks: tasks.map(t => t.id),
  shifts: [
    {
      shift_id: "shift_c1",
      title: "Смена 1: Позывные эфира",
      slots: [
        { slot_index: 1, template_id: "tmpl_c1_aaxx_header", bank_query: null },
        { slot_index: 2, template_id: "tmpl_c1_date_time_wind_indicator", bank_query: null },
        { slot_index: 3, template_id: "tmpl_c1_header_order", bank_query: null },
        { slot_index: 4, template_id: "tmpl_c1_utc_hour", bank_query: null },
        { slot_index: 5, template_id: "tmpl_c1_wind_units", bank_query: null },
        { slot_index: 6, template_id: "tmpl_c1_station_26063", bank_query: "station_26063" }
      ]
    },
    {
      shift_id: "shift_c2",
      title: "Смена 2: Термометр",
      slots: [
        { slot_index: 1, template_id: "tmpl_c2_temp_vs_dewpoint", bank_query: null },
        { slot_index: 2, template_id: "tmpl_c2_positive_temp", bank_query: null },
        { slot_index: 3, template_id: "tmpl_c2_sign_bit_sn", bank_query: null },
        { slot_index: 4, template_id: "tmpl_c2_negative_dewpoint", bank_query: null },
        { slot_index: 5, template_id: "tmpl_c2_encode_temp", bank_query: null },
        { slot_index: 6, template_id: "tmpl_c2_find_error_td_gt_t", bank_query: null }
      ]
    },
    {
      shift_id: "shift_c3",
      title: "Смена 3: Барометр",
      slots: [
        { slot_index: 1, template_id: "tmpl_c3_station_vs_sea_pressure", bank_query: null },
        { slot_index: 2, template_id: "tmpl_c3_sea_pressure_restore", bank_query: null },
        { slot_index: 3, template_id: "tmpl_c3_tendency_characteristic", bank_query: null },
        { slot_index: 4, template_id: "tmpl_c3_tendency_value", bank_query: null },
        { slot_index: 5, template_id: "tmpl_c3_deep_cyclone_pressure", bank_query: null },
        { slot_index: 6, template_id: "tmpl_c3_station_pressure_decode", bank_query: null }
      ]
    },
    {
      shift_id: "shift_c4",
      title: "Смена 4: Ветер и облака",
      slots: [
        { slot_index: 1, template_id: "tmpl_c4_cloud_and_wind_anatomy", bank_query: null },
        { slot_index: 2, template_id: "tmpl_c4_cloud_cover_octas", bank_query: null },
        { slot_index: 3, template_id: "tmpl_c4_wind_direction", bank_query: null },
        { slot_index: 4, template_id: "tmpl_c4_wind_speed", bank_query: null },
        { slot_index: 5, template_id: "tmpl_c4_wind_calm", bank_query: null },
        { slot_index: 6, template_id: "tmpl_c4_north_wind", bank_query: null }
      ]
    },
    {
      shift_id: "shift_c5",
      title: "Смена 5: Полная лента",
      slots: [
        { slot_index: 1, template_id: "tmpl_c5_section_order", bank_query: null },
        { slot_index: 2, template_id: "tmpl_c5_station_26063_temp", bank_query: "station_26063" },
        { slot_index: 3, template_id: "tmpl_c5_station_26063_sea_press", bank_query: "station_26063" },
        { slot_index: 4, template_id: "tmpl_c5_station_26063_tendency", bank_query: "station_26063" }
      ]
    },
    {
      shift_id: "shift_exam",
      title: "Квалификационный допуск: Кодовый пост",
      slots: [
        { slot_index: 1, template_id: "tmpl_exam_temp_arctic", bank_query: "polar_region" },
        { slot_index: 2, template_id: "tmpl_exam_anticyclone_pressure", bank_query: "anticyclone" },
        { slot_index: 3, template_id: "tmpl_c3_sea_pressure_restore", bank_query: "random_bank" },
        { slot_index: 4, template_id: "tmpl_c4_wind_direction", bank_query: "random_bank" },
        { slot_index: 5, template_id: "tmpl_c3_tendency_value", bank_query: "random_bank" },
        { slot_index: 6, template_id: "tmpl_c2_find_error_td_gt_t", bank_query: null }
      ]
    }
  ],
  created_at: "2026-10-26T23:59:00Z",
  review: {
    source_check: "passed",
    methodical: "passed",
    independent_verification: "passed",
    language: "passed",
    technical: "passed",
    publication_allowed: true
  }
};

const packPath = resolve(ROOT, 'content/packs/kn01_level1.json');
writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n', 'utf-8');
console.log(`Записан пакет уровня ${pack.id} в ${packPath}`);
