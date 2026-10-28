export interface SynopticRhythm {
  previousTermUtc: string;
  nextTermUtc: string;
  minutesToNextTerm: number;
}

export interface MentorTopic {
  id: string;
  label: string;
  title: string;
  body: string;
  rule: string;
}

const MAIN_SYNOPTIC_TERM_HOURS = [0, 6, 12, 18] as const;

function termLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00 UTC`;
}

export function getSynopticRhythm(now = new Date()): SynopticRhythm {
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const termMinutes = MAIN_SYNOPTIC_TERM_HOURS.map((hour) => hour * 60);
  let previous = termMinutes[0];
  let next = termMinutes[1];

  for (let index = 0; index < termMinutes.length; index += 1) {
    const current = termMinutes[index];
    if (current <= minuteOfDay) previous = current;
    if (current > minuteOfDay) {
      next = current;
      break;
    }
    if (index === termMinutes.length - 1) next = 24 * 60;
  }

  return {
    previousTermUtc: termLabel((previous / 60) % 24),
    nextTermUtc: termLabel((next / 60) % 24),
    minutesToNextTerm: Math.max(0, next - minuteOfDay),
  };
}

export const SHIFT_HANDOVER_NOTE = {
  author: 'Полина Синицына · предыдущая смена',
  time: '05:50 МСК · учебный сценарий',
  text: 'Над Финским заливом низкая слоистая облачность, ветер юго-западный умеренный. Барограф за ночь начертил плавную ложбинку. Чайник горячий, бланки на столе — принимай вахту.',
  checklist: [
    'Сверить предыдущий срок и не начинать анализ «с чистого листа».',
    'Проверить физическую согласованность наблюдений до построения полей.',
    'Только после контроля данных переходить к подъёму карты и фронтологическому анализу.',
  ],
} as const;

export const SHIFT_DEBRIEF = {
  author: 'Иннокентий Борисович Ольхин',
  title: 'Смена сдана',
  text: 'Не гонись за красивой картой раньше времени. Хорошая смена — та, где каждое решение можно объяснить: от исходной цифры в сводке до последней линии на планшете.',
  next: 'Рабочие попытки уже разобраны по заданиям. Возвращайся в центр: следующую смену начинаем с истории процесса и контроля наблюдений.',
} as const;

export const MENTOR_TOPICS: MentorTopic[] = [
  {
    id: 'primary-analysis',
    label: 'Порядок анализа',
    title: 'Сначала фундамент, потом линии',
    body: 'Положи рядом предыдущий срок и проверь наблюдения на физический брак. После этого поднимай поле давления, тенденции и явления. Фронты проводи только по совокупности согласованных признаков.',
    rule: 'Предыдущий срок + контроль данных → поля и явления → фронты → общая проверка.',
  },
  {
    id: 'station-plot',
    label: 'Пуансон',
    title: 'Левая сторона — тепло и влага',
    body: 'Температура T стоит слева сверху, точка росы Td — слева снизу, давление — справа. Для одной станции и одного срока Td не должна быть выше T.',
    rule: 'Если Td > T — сначала подозревай ошибку наблюдения или передачи, а не новую физику.',
  },
  {
    id: 'kn01',
    label: 'КН-01',
    title: 'Читайте группу по отличительной цифре',
    body: 'В разделе 1 первая цифра задаёт тип группы: 1 — температура, 2 — точка росы, 3 — давление на станции, 4 — приведённое давление, 5 — барическая тенденция, 6 — осадки, 7 — погода, 8 — облака.',
    rule: 'Сначала определите тип группы, затем знак и масштаб величины; не угадывайте значение по внешнему виду числа.',
  },
  {
    id: 'frontology',
    label: 'Фронтология',
    title: 'Фронт по одной температуре не ставят',
    body: 'Ищи согласование барического поля, ветра, барической тенденции, T/Td, облачности и осадков; сверяй положение с предыдущим сроком.',
    rule: 'Один признак — повод проверить. Три-четыре согласованных признака — основание для решения.',
  },
];
