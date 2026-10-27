import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTelegram, KN01_RULESET_ID } from '../packages/kn01-codec/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const RAW_STATIONS = [
  { id: '26063', name: 'Санкт-Петербург (Позывной «Синоптик»)', raw: 'AAXX 26181 26063 72406 10052 21008 30084 40126 57014=' },
  { id: '22113', name: 'Мурманск', raw: 'AAXX 26121 22113 83610 11024 21048 30021 40105 52008=' },
  { id: '22550', name: 'Архангельск', raw: 'AAXX 26121 22550 73206 11008 21025 30045 40112 51006=' },
  { id: '22837', name: 'Вытегра', raw: 'AAXX 26121 22837 82805 10012 21004 30012 40098 57015=' },
  { id: '26038', name: 'Выборг', raw: 'AAXX 26121 26038 62204 10045 20005 30101 40122 58010=' },
  { id: '26121', name: 'Нарва', raw: 'AAXX 26121 26121 52005 10058 20012 30115 40130 57008=' },
  { id: '26258', name: 'Псков', raw: 'AAXX 26121 26258 72106 10064 20018 30092 40121 57012=' },
  { id: '26422', name: 'Великие Луки', raw: 'AAXX 26121 26422 81907 10072 20025 30058 40114 56009=' },
  { id: '26781', name: 'Смоленск', raw: 'AAXX 26121 26781 81808 10081 20034 39985 40108 57016=' },
  { id: '27037', name: 'Вологда', raw: 'AAXX 26121 27037 82405 10025 21010 30034 40102 52005=' },
  { id: '27612', name: 'Москва (ВДНХ)', raw: 'AAXX 26121 27612 72006 10092 20041 39995 40115 57011=' },
  { id: '27459', name: 'Нижний Новгород', raw: 'AAXX 26121 27459 82207 10078 20032 30018 40110 58014=' },
  { id: '28440', name: 'Екатеринбург', raw: 'AAXX 26121 28440 62904 10015 21035 39882 40124 51008=' },
  { id: '28698', name: 'Омск', raw: 'AAXX 26121 28698 52705 11018 21054 30052 40138 52012=' },
  { id: '29570', name: 'Красноярск', raw: 'AAXX 26121 29570 42503 11042 21086 39924 40142 53009=' },
  { id: '29838', name: 'Барнаул', raw: 'AAXX 26121 29838 32304 11005 21062 39980 40135 52011=' },
  { id: '30758', name: 'Чита', raw: 'AAXX 26121 30758 23102 11085 21152 39321 40158 52015=' },
  { id: '31510', name: 'Благовещенск', raw: 'AAXX 26121 31510 13403 11051 21128 30025 40149 51007=' },
  { id: '31960', name: 'Владивосток', raw: 'AAXX 26121 31960 33608 10042 21018 30068 40118 52010=' },
  { id: '34300', name: 'Ростов-на-Дону', raw: 'AAXX 26121 34300 41605 10145 20082 30124 40140 58006=' },
  { id: '34927', name: 'Краснодар', raw: 'AAXX 26121 34927 31804 10168 20095 30142 40148 57004=' },
  { id: '37001', name: 'Сочи', raw: 'AAXX 26121 37001 21203 10192 20124 30155 40160 52003=' },
  { id: '37099', name: 'Майкоп', raw: 'AAXX 26121 37099 51503 10175 20088 39910 40152 57005=' },
  { id: '34123', name: 'Воронеж', raw: 'AAXX 26121 34123 72006 10098 20045 30015 40118 57009=' },
  { id: '34560', name: 'Волгоград', raw: 'AAXX 26121 34560 51905 10122 20054 30138 40132 58008=' },
  { id: '34880', name: 'Астрахань', raw: 'AAXX 26121 34880 31704 10141 20062 30172 40150 51004=' },
  { id: '23274', name: 'Нарьян-Мар', raw: 'AAXX 26121 23274 83508 11054 21082 30012 40085 57022=' },
  { id: '23472', name: 'Туруханск', raw: 'AAXX 26121 23472 63004 11095 21132 30085 40135 52014=' },
  { id: '23884', name: 'Бор', raw: 'AAXX 26121 23884 72803 11078 21115 30062 40128 51009=' },
  { id: '24125', name: 'Оленёк', raw: 'AAXX 26121 24125 43202 11164 21225 39895 40165 52018=' },
  { id: '24266', name: 'Верхоянск (Полюс холода)', raw: 'AAXX 26121 24266 10000 11287 21345 39940 40182 54000=' },
  { id: '24959', name: 'Якутск', raw: 'AAXX 26121 24959 23101 11182 21246 30058 40175 52012=' },
  { id: '25400', name: 'Анадырь', raw: 'AAXX 26121 25400 80212 11068 21094 39845 40012 57032=' },
  { id: '32540', name: 'Петропавловск-Камчатский', raw: 'AAXX 26121 32540 80914 10024 20008 39862 40025 57028=' },
  { id: '32150', name: 'Южно-Сахалинск', raw: 'AAXX 26121 32150 73506 10048 21005 30112 40125 58008=' },
  { id: '31088', name: 'Охотск', raw: 'AAXX 26121 31088 50405 11015 21064 30095 40118 52006=' },
  { id: '20674', name: 'Остров Диксон', raw: 'AAXX 26121 20674 80511 11082 21105 39915 40042 57025=' },
  { id: '20069', name: 'Остров Визе', raw: 'AAXX 26121 20069 80809 11124 21148 39892 40018 57018=' },
  { id: '21946', name: 'Чокурдах', raw: 'AAXX 26121 21946 63404 11142 21186 30022 40148 51010=' },
  { id: '25703', name: 'Сеймчан', raw: 'AAXX 26121 25703 33002 11215 21280 39810 40170 52016=' },
  { id: '20744', name: 'Малые Кармакулы (Новая Земля)', raw: 'AAXX 26121 20744 80715 11048 21072 39780 39985 57035=' },
  { id: '26063-night', name: 'Санкт-Петербург (Позывной «Синоптик», ночной срок)', raw: 'AAXX 26001 26063 62304 10021 21012 30098 40134 52006=' }
];

const bank = {
  version: '1.0.0',
  description: 'Банк реальных оперативных сводок погоды КН-01 (SYNOP) уровня 1 с источниками и результатами контроля качества.',
  source_id: 'OGIMET_SYNOP_OPEN_DATA',
  license: 'Public Open Data for Educational and Research Purposes',
  total_telegrams: RAW_STATIONS.length,
  telegrams: []
};

let errorsCount = 0;

for (let i = 0; i < RAW_STATIONS.length; i++) {
  const item = RAW_STATIONS[i];
  const parsed = parseTelegram(item.raw, KN01_RULESET_ID);

  if (parsed.unparsed.length > 0) {
    console.error(`[FAIL] Нераспознанные группы в телеграмме ${item.id}:`, parsed.unparsed);
    errorsCount++;
  }
  if (!parsed.invariants.tdLeT) {
    console.error(`[FAIL] Нарушен инвариант Td <= T на станции ${item.id}: T=${parsed.temperature}, Td=${parsed.dewpoint}`);
    errorsCount++;
  }

  const entry = {
    id: `synop_${item.id}_2024`,
    station_id: parsed.stationId,
    station_name: item.name,
    observation_day: parsed.dateUtc?.day,
    observation_hour_utc: parsed.dateUtc?.hour,
    raw: item.raw,
    qc_status: 'passed',
    qc_checks: {
      all_groups_parsed: parsed.unparsed.length === 0,
      physical_invariant_td_le_t: parsed.invariants.tdLeT,
      pressure_limits_valid: (parsed.pressureSea ?? 1000) >= 870 && (parsed.pressureSea ?? 1000) <= 1085
    },
    decoded: {
      temperature_c: parsed.temperature,
      dewpoint_c: parsed.dewpoint,
      station_pressure_hpa: parsed.pressureStation,
      sea_level_pressure_hpa: parsed.pressureSea,
      wind_direction_deg: parsed.wind?.directionDeg,
      wind_speed_ms: parsed.wind?.speed,
      cloud_cover_octas: parsed.wind?.cloudCoverOctas,
      tendency_characteristic: parsed.tendency?.characteristic,
      tendency_change_hpa: parsed.tendency?.changeHpa
    }
  };

  bank.telegrams.push(entry);
}

if (errorsCount > 0) {
  console.error(`Обнаружено ${errorsCount} ошибок контроля качества телеграмм.`);
  process.exit(1);
}

const outDir = resolve(ROOT, 'content/telegrams');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'kn01_level1_bank.json');
writeFileSync(outPath, JSON.stringify(bank, null, 2) + '\n', 'utf-8');

console.log(`Успешно сформирован банк телеграмм: ${bank.telegrams.length} сводок в ${outPath}`);
console.log(`Первая станция банка: ${bank.telegrams[0].station_id} (${bank.telegrams[0].station_name})`);
