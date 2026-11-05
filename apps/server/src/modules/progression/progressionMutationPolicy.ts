import { ProgressionError } from './progressionService.js';

/**
 * До введения серверного журнала подтверждённых попыток оба публичных
 * маршрута /api/progression/shift и /api/progression/exam закрыты.
 *
 * Нельзя доверять taskResults[].isCorrect, переданному клиентом.
 * Возврат 409 сохраняет API-путь как явно недоступный, не маскируя
 * опасное начисление под временный успешный ответ.
 */
export function rejectUnverifiedClientProgressionWrite(): never {
  throw new ProgressionError(
    409,
    'Начисление доступно только по результатам серверной проверки заданий',
    'PROGRESSION_VERIFICATION_REQUIRED',
  );
}
