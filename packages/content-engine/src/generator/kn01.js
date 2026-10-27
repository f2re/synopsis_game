/**
 * Генератор заданий КН-01 по шаблонам с диагностическими неверными вариантами.
 * Соответствует таксономии ошибок W1-02 и матрице граничных случаев W1-01.
 */

import { decodeGroup, encodeGroup, parseTelegram } from '../../../kn01-codec/src/index.js';

function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const EDGE_CASES = [
  {
    id: 'EC-T-01',
    group: '1snTTT',
    target: 0.0,
    encoded: '10000',
    distractors: [
      { value: -0.0, display: '-0,0', reasonCode: 'kn01.sign_ignored' },
      { value: 10.0, display: '+10,0', reasonCode: 'kn01.group_confused' },
      { value: 1.0, display: '+1,0', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-T-02',
    group: '1snTTT',
    target: -0.1,
    encoded: '11001',
    distractors: [
      { value: 0.1, display: '+0,1', reasonCode: 'kn01.sign_ignored' },
      { value: -1.0, display: '-1,0', reasonCode: 'kn01.tenths_shift' },
      { value: -10.1, display: '-10,1', reasonCode: 'kn01.group_confused' },
    ],
  },
  {
    id: 'EC-T-03',
    group: '1snTTT',
    target: -10.0,
    encoded: '11100',
    distractors: [
      { value: 10.0, display: '+10,0', reasonCode: 'kn01.sign_ignored' },
      { value: -100.0, display: '-100,0', reasonCode: 'kn01.tenths_shift' },
      { value: -1.0, display: '-1,0', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-T-04',
    group: '1snTTT',
    target: 25.0,
    encoded: '10250',
    distractors: [
      { value: -25.0, display: '-25,0', reasonCode: 'kn01.sign_ignored' },
      { value: 250.0, display: '+250,0', reasonCode: 'kn01.tenths_shift' },
      { value: 2.5, display: '+2,5', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-TD-01',
    group: '2snTdTdTd',
    target: 15.0,
    encoded: '20150',
    distractors: [
      { value: -15.0, display: '-15,0', reasonCode: 'kn01.sign_ignored' },
      { value: 150.0, display: '+150,0', reasonCode: 'kn01.tenths_shift' },
      { value: 1.5, display: '+1,5', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-TD-02',
    group: 'findError',
    target: '20150',
    encoded: 'AAXX 26121 26063 00000 10120 20150=',
    reasonCode: 'kn01.td_gt_t',
    distractors: [
      { value: '10120', reasonCode: 'kn01.group_confused' },
      { value: '00000', reasonCode: 'kn01.direction_scale' },
      { value: '26063', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-TD-03',
    group: '2snTdTdTd',
    target: -0.5,
    encoded: '21005',
    distractors: [
      { value: 0.5, display: '+0,5', reasonCode: 'kn01.sign_ignored' },
      { value: -5.0, display: '-5,0', reasonCode: 'kn01.tenths_shift' },
      { value: -0.05, display: '-0,05', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-P-01',
    group: '4PPPP',
    target: 998.4,
    encoded: '49984',
    distractors: [
      { value: 1998.4, display: '1998,4', reasonCode: 'kn01.thousands_missing' },
      { value: 9984.0, display: '9984,0', reasonCode: 'kn01.tenths_shift' },
      { value: 98.4, display: '98,4', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-P-02',
    group: '4PPPP',
    target: 1000.0,
    encoded: '40000',
    distractors: [
      { value: 0.0, display: '0,0', reasonCode: 'kn01.thousands_missing' },
      { value: 10000.0, display: '10000,0', reasonCode: 'kn01.tenths_shift' },
      { value: 900.0, display: '900,0', reasonCode: 'kn01.thousands_missing' },
    ],
  },
  {
    id: 'EC-P-03',
    group: '4PPPP',
    target: 1048.2,
    encoded: '40482',
    distractors: [
      { value: 48.2, display: '48,2', reasonCode: 'kn01.thousands_missing' },
      { value: 948.2, display: '948,2', reasonCode: 'kn01.thousands_missing' },
      { value: 10482.0, display: '10482,0', reasonCode: 'kn01.tenths_shift' },
    ],
  },
  {
    id: 'EC-PT-01',
    group: '5appp',
    target: 0.0,
    encoded: '54000',
    distractors: [
      { value: 4.0, display: '+4,0', reasonCode: 'kn01.tendency_char_misread' },
      { value: -0.4, display: '-0,4', reasonCode: 'kn01.tenths_shift' },
      { value: 0.4, display: '+0,4', reasonCode: 'kn01.tendency_char_misread' },
    ],
  },
  {
    id: 'EC-PT-02',
    group: '5appp',
    target: -4.2,
    encoded: '57042',
    distractors: [
      { value: 4.2, display: '+4,2', reasonCode: 'kn01.tendency_char_misread' },
      { value: -42.0, display: '-42,0', reasonCode: 'kn01.tenths_shift' },
      { value: -7.42, display: '-7,4', reasonCode: 'kn01.group_confused' },
    ],
  },
  {
    id: 'EC-W-01',
    group: 'Nddff',
    target: 0,
    encoded: '00000',
    distractors: [
      { value: 10, display: '10 м/с', reasonCode: 'kn01.tenths_shift' },
      { value: 360, display: '360°', reasonCode: 'kn01.direction_scale' },
      { value: 99, display: 'переменный', reasonCode: 'generic.inattention' },
    ],
  },
  {
    id: 'EC-W-02',
    group: 'Nddff',
    target: 360,
    encoded: '83612',
    distractors: [
      { value: 36, display: '36°', reasonCode: 'kn01.direction_scale' },
      { value: 0, display: '0° (штиль)', reasonCode: 'kn01.direction_scale' },
      { value: 3600, display: '3600°', reasonCode: 'kn01.tenths_shift' },
    ],
  },
  {
    id: 'EC-W-03',
    group: 'Nddff',
    target: 'variable',
    encoded: '49902',
    distractors: [
      { value: 990, display: '990°', reasonCode: 'kn01.direction_scale' },
      { value: 99, display: '99°', reasonCode: 'kn01.direction_scale' },
      { value: 0, display: 'штиль', reasonCode: 'generic.inattention' },
    ],
  },
];

export function generateKn01Task(options = {}) {
  const seed = (options.seed ?? Math.floor(Math.random() * 1000000)) >>> 0;
  const rng = createRng(seed);

  // 1. Выбор граничного случая или стандартного синтеза
  // Граничный случай выбирается с вероятностью 40% или явно по ID
  let edgeCase = null;
  if (options.edgeCaseId) {
    edgeCase = EDGE_CASES.find((ec) => ec.id === options.edgeCaseId) ?? null;
  } else if (rng() < 0.45) {
    const idx = Math.floor(rng() * EDGE_CASES.length);
    edgeCase = EDGE_CASES[idx];
  }

  if (edgeCase) {
    return buildEdgeCaseTask(edgeCase, seed, rng);
  }

  // 2. Стандартный генератор по группам
  const requestedGroup = options.group ?? pickRandomGroup(rng);
  return buildSyntheticTask(requestedGroup, seed, rng);
}

function pickRandomGroup(rng) {
  const groups = ['1snTTT', '2snTdTdTd', '3PoPoPoPo', '4PPPP', '5appp', 'Nddff'];
  return groups[Math.floor(rng() * groups.length)];
}

function buildEdgeCaseTask(ec, seed, rng) {
  const id = `task_ec_${ec.id.toLowerCase()}_${seed}`;

  if (ec.group === 'findError') {
    const rawOptions = [
      { text: ec.target, isCorrect: true, reasonCode: ec.reasonCode },
      ...ec.distractors.map((d) => ({ text: d.value, isCorrect: false, reasonCode: d.reasonCode })),
    ];
    // Детерминированное перемешивание
    const shuffled = shuffleDeterministic(rawOptions, rng);
    const correctIndex = shuffled.findIndex((o) => o.isCorrect);

    return {
      id,
      seed,
      edgeCaseId: ec.id,
      type: 'findError',
      prompt: 'Найдите группу в телеграмме, нарушающую физический закон или формат КН-01:',
      telegram: ec.encoded,
      choices: shuffled.map((o) => ({ text: o.text, reasonCode: o.reasonCode })),
      correctIndex,
      correctGroup: ec.target,
      reasonCode: ec.reasonCode,
      invariants: {
        distractorsNeverEqualTarget: shuffled.filter((o) => !o.isCorrect).every((o) => o.text !== ec.target),
        allDistractorsHaveReasons: shuffled.every((o) => Boolean(o.reasonCode)),
      },
    };
  }

  // Числовое или выборное задание по группе
  const rawDistractors = ec.distractors.map((d) => ({
    value: d.value,
    display: d.display ?? String(d.value),
    reasonCode: d.reasonCode,
  }));

  // Гарантия несовпадения ни одного неверного варианта с правильным
  const filteredDistractors = rawDistractors.filter((d) => d.value !== ec.target);

  return {
    id,
    seed,
    edgeCaseId: ec.id,
    group: ec.group,
    type: 'decode',
    encoded: ec.encoded,
    prompt: `Дешифрируйте группу ${ec.encoded}:`,
    target: ec.target,
    distractors: filteredDistractors,
    invariants: {
      distractorsNeverEqualTarget: filteredDistractors.every((d) => d.value !== ec.target),
      allDistractorsHaveReasons: filteredDistractors.every((d) => Boolean(d.reasonCode)),
    },
  };
}

function buildSyntheticTask(group, seed, rng) {
  const id = `task_${group.toLowerCase()}_${seed}`;

  if (group === '1snTTT' || group === '2snTdTdTd') {
    const isNegative = rng() < 0.5;
    const tempTenths = Math.floor(rng() * 350); // 0.0 to 35.0 °C
    const temp = (isNegative ? -tempTenths : tempTenths) / 10;
    const encoded = encodeGroup(group, temp);

    const distractors = (temp === 0
      ? [
          { value: 10.0, display: '+10,0', reasonCode: 'kn01.sign_ignored' },
          { value: 1.0, display: '+1,0', reasonCode: 'kn01.tenths_shift' },
          { value: -10.0, display: '-10,0', reasonCode: 'kn01.group_confused' },
        ]
      : [
          { value: -temp, display: `${-temp}`.replace('.', ','), reasonCode: 'kn01.sign_ignored' },
          { value: Math.round(temp * 10 * 10) / 10, display: `${temp * 10}`.replace('.', ','), reasonCode: 'kn01.tenths_shift' },
          { value: (temp > 0 ? temp + 10 : temp - 10), display: `${(temp > 0 ? temp + 10 : temp - 10)}`.replace('.', ','), reasonCode: 'kn01.group_confused' },
        ]
    ).filter((d) => d.value !== temp);

    return {
      id,
      seed,
      group,
      type: 'decode',
      encoded,
      prompt: `Дешифрируйте значение ${group === '1snTTT' ? 'температуры воздуха' : 'точки росы'}:`,
      target: temp,
      unit: '°C',
      distractors,
      invariants: {
        distractorsNeverEqualTarget: distractors.every((d) => d.value !== temp),
        allDistractorsHaveReasons: distractors.every((d) => Boolean(d.reasonCode)),
      },
    };
  }

  if (group === '4PPPP') {
    // 970.0 to 1045.0 hPa
    const isLowPressure = rng() < 0.35;
    const pressure = isLowPressure
      ? Math.round((965 + rng() * 34) * 10) / 10
      : Math.round((1000 + rng() * 45) * 10) / 10;
    const encoded = encodeGroup('4PPPP', pressure);

    const distractors = [
      {
        value: pressure >= 1000 ? pressure - 1000 : pressure + 1000,
        reasonCode: 'kn01.thousands_missing',
      },
      {
        value: Math.round(pressure * 10),
        reasonCode: 'kn01.tenths_shift',
      },
      {
        value: Math.round((pressure + 5) * 10) / 10,
        reasonCode: 'kn01.group_confused',
      },
    ].filter((d) => d.value !== pressure);

    return {
      id,
      seed,
      group: '4PPPP',
      type: 'decode',
      encoded,
      prompt: 'Дешифрируйте давление, приведённое к уровню моря:',
      target: pressure,
      unit: 'гПа',
      distractors,
      invariants: {
        distractorsNeverEqualTarget: distractors.every((d) => d.value !== pressure),
        allDistractorsHaveReasons: distractors.every((d) => Boolean(d.reasonCode)),
      },
    };
  }

  if (group === '5appp') {
    const a = Math.floor(rng() * 9);
    const change = a === 4 ? 0.0 : Math.round((rng() * 5.0 + 0.1) * 10) / 10;
    const signedChange = a < 4 ? change : a === 4 ? 0.0 : -change;
    const encoded = encodeGroup('5appp', { characteristic: a, pressureChangeHpa: signedChange });

    const distractors = (signedChange === 0
      ? [
          { value: 4.0, reasonCode: 'kn01.tendency_char_misread' },
          { value: 0.4, reasonCode: 'kn01.tenths_shift' },
          { value: -0.4, reasonCode: 'kn01.tendency_char_misread' },
        ]
      : [
          { value: -signedChange, reasonCode: 'kn01.tendency_char_misread' },
          { value: Math.round(signedChange * 10 * 10) / 10, reasonCode: 'kn01.tenths_shift' },
          { value: (signedChange > 0 ? signedChange + 5 : signedChange - 5), reasonCode: 'kn01.group_confused' },
        ]
    ).filter((d) => d.value !== signedChange);

    return {
      id,
      seed,
      group: '5appp',
      type: 'decode',
      encoded,
      prompt: 'Дешифрируйте величину и знак барической тенденции за 3 часа:',
      target: signedChange,
      characteristic: a,
      unit: 'гПа',
      distractors,
      invariants: {
        distractorsNeverEqualTarget: distractors.every((d) => d.value !== signedChange),
        allDistractorsHaveReasons: distractors.every((d) => Boolean(d.reasonCode)),
      },
    };
  }

  // Nddff
  const cloud = Math.floor(rng() * 9);
  const dirCode = rng() < 0.1 ? 0 : rng() < 0.15 ? 99 : Math.floor(rng() * 36) + 1;
  const speed = dirCode === 0 ? 0 : Math.floor(rng() * 25) + 1;
  const dirDeg = dirCode === 99 ? 'variable' : dirCode * 10;
  const encoded = encodeGroup('Nddff', {
    cloudCoverOctas: cloud,
    windDirectionDeg: dirDeg,
    windSpeed: speed,
  });

  const distractors = [
    {
      value: dirDeg === 0 ? 360 : dirCode,
      reasonCode: 'kn01.direction_scale',
    },
    {
      value: speed === 0 ? 10 : speed * 10,
      reasonCode: 'kn01.tenths_shift',
    },
    {
      value: cloud === 0 ? 8 : 0,
      reasonCode: 'kn01.group_confused',
    },
  ].filter((d) => d.value !== dirDeg);

  return {
    id,
    seed,
    group: 'Nddff',
    type: 'decode',
    encoded,
    prompt: 'Дешифрируйте направление и скорость ветра:',
    target: dirDeg,
    speed,
    cloud,
    distractors,
    invariants: {
      distractorsNeverEqualTarget: distractors.every((d) => d.value !== dirDeg),
      allDistractorsHaveReasons: distractors.every((d) => Boolean(d.reasonCode)),
    },
  };
}

function shuffleDeterministic(array, rng) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
