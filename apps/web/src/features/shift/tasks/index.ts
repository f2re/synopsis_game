import type { ShiftTask } from '../../../api';

export type TaskKind =
  | 'identify'
  | 'decode'
  | 'anatomy'
  | 'encode'
  | 'sequence'
  | 'findError'
  | 'fullTelegram';

export interface TaskTypeConfig {
  id: TaskKind;
  title: string;
  shortDesc: string;
  responseType: 'choice' | 'numeric' | 'sequence' | 'findError' | 'stationPlot' | 'stationBoard';
}

export const TASK_TYPES: Record<TaskKind, TaskTypeConfig> = {
  identify: {
    id: 'identify',
    title: 'Опознавание группы',
    shortDesc: 'Определение назначения группы по шаблону и префиксу',
    responseType: 'choice',
  },
  decode: {
    id: 'decode',
    title: 'Раскодирование значения',
    shortDesc: 'Перевод закодированных цифр в физическую величину (°C, м/с, гПа)',
    responseType: 'numeric',
  },
  anatomy: {
    id: 'anatomy',
    title: 'Поцифровой разбор',
    shortDesc: 'Анализ структуры каждого разряда пятизначной группы',
    responseType: 'choice',
  },
  encode: {
    id: 'encode',
    title: 'Кодирование группы',
    shortDesc: 'Составление пятизначного кода по заданным метеоусловиям',
    responseType: 'numeric',
  },
  sequence: {
    id: 'sequence',
    title: 'Последовательность сводки',
    shortDesc: 'Расстановка групп в строгом соответствии с наставлением КН-01',
    responseType: 'sequence',
  },
  findError: {
    id: 'findError',
    title: 'Поиск ошибки в телеграмме',
    shortDesc: 'Обнаружение недопустимого значения или нарушения синтаксиса кода',
    responseType: 'findError',
  },
  fullTelegram: {
    id: 'fullTelegram',
    title: 'Комплексный разбор КН-01',
    shortDesc: 'Полная расшифровка телеграммы стационарной станции 26063',
    responseType: 'stationBoard',
  },
};

export function classifyTask(task: ShiftTask): TaskKind {
  const resp = task.response.kind;
  if (resp === 'findError') return 'findError';
  if (resp === 'sequence' || resp === 'dependencySequence') return 'sequence';
  if (resp === 'stationBoard') return 'fullTelegram';
  if (resp === 'numeric') return 'decode';
  if (task.question.toLowerCase().includes('порядок') || task.question.toLowerCase().includes('расставьте')) return 'sequence';
  if (task.question.toLowerCase().includes('определите группу') || task.question.toLowerCase().includes('какая группа')) return 'identify';
  if (task.question.toLowerCase().includes('разбор') || task.question.toLowerCase().includes('цифр')) return 'anatomy';
  if (task.question.toLowerCase().includes('составьте') || task.question.toLowerCase().includes('закодируйте')) return 'encode';
  return 'decode';
}
