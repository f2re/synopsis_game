import { useEffect, useMemo, useState } from 'react';
import { PixelIcon } from './PixelIcon';
import './SynopticDutyTicker.css';

const TERMS_UTC = [0, 3, 6, 9, 12, 15, 18, 21] as const;

const TERM_NOTES: Readonly<Record<number, string>> = {
  0: 'Ночная приёмка: сверь суточные экстремумы, давление и явления перед полной сводкой.',
  3: 'Промежуточный контроль: проверь барическую тенденцию и согласованность T/Td.',
  6: 'Утренний разбор: сравни предыдущий срок, осадки за ночь и перестройку барического поля.',
  9: 'Промежуточный контроль: следи за тенденцией давления и развитием дневной конвекции.',
  12: 'Дневной разбор: оцени прогрев, ветер и согласование приземных полей перед фронтологией.',
  15: 'Промежуточный контроль: проверь барическую тенденцию и эволюцию облачности.',
  18: 'Вечерний разбор: сверь осадки за день, давление и положение основных барических образований.',
  21: 'Ночной переход: оцени выхолаживание, видимость и изменения ветра перед следующим основным сроком.',
};

const SEASON_NOTES = {
  winter: 'Зимний режим: особое внимание обледенению, метелям, видимости и резким перестройкам ветра.',
  spring: 'Весенний режим: следи за быстрыми сменами воздушных масс, туманами и усилением конвекции.',
  summer: 'Летний режим: контролируй конвекцию, ливни, грозовые очаги и локальные шквалы.',
  autumn: 'Осенний режим: следи за низкой облачностью, видимостью, длительными осадками и ветром Балтики.',
} as const;

type StationSeason = keyof typeof SEASON_NOTES;

function seasonForUtcMonth(month: number): StationSeason {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

function seasonLabel(season: StationSeason): string {
  switch (season) {
    case 'winter': return 'зима';
    case 'spring': return 'весна';
    case 'summer': return 'лето';
    case 'autumn': return 'осень';
  }
}

function currentTermHour(now: Date): number {
  const hour = now.getUTCHours();
  return [...TERMS_UTC].reverse().find((term) => term <= hour) ?? 21;
}

function nextTermHour(term: number): number {
  const index = TERMS_UTC.indexOf(term as (typeof TERMS_UTC)[number]);
  return TERMS_UTC[(index + 1) % TERMS_UTC.length];
}

function formatTerm(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00 UTC`;
}

export function SynopticDutyTicker() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const briefing = useMemo(() => {
    const term = currentTermHour(now);
    const next = nextTermHour(term);
    const season = seasonForUtcMonth(now.getUTCMonth());
    return {
      term,
      next,
      season,
      termNote: TERM_NOTES[term],
      seasonNote: SEASON_NOTES[season],
    };
  }, [now]);

  return (
    <aside className="synoptic-duty-ticker" aria-label="Учебная диспетчерская лента синоптической смены">
      <div className="synoptic-duty-ticker__head">
        <PixelIcon name="telegram" size="sm" />
        <strong>УЧЕБНАЯ ДИСПЕТЧЕРСКАЯ ЛЕНТА</strong>
        <span>{formatTerm(briefing.term)}</span>
      </div>
      <div className="synoptic-duty-ticker__body">
        <span className="synoptic-duty-ticker__season">{seasonLabel(briefing.season)}</span>
        <span>{briefing.termNote}</span>
        <span className="synoptic-duty-ticker__season-note">{briefing.seasonNote}</span>
      </div>
      <div className="synoptic-duty-ticker__foot">
        <span>Следующий срок: {formatTerm(briefing.next)}</span>
        <span>Методическая подсказка, не фактическая метеосводка</span>
      </div>
    </aside>
  );
}
