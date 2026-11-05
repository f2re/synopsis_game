import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rejectUnverifiedClientProgressionWrite } from './progressionMutationPolicy.js';
import { ProgressionError } from './progressionService.js';

test('SEC-01: небезопасная запись смены и экзамена отвергается до изменения прогрессии', () => {
  for (const route of ['/api/progression/shift', '/api/progression/exam']) {
    assert.throws(
      () => rejectUnverifiedClientProgressionWrite(),
      (error: unknown) =>
        error instanceof ProgressionError &&
        error.status === 409 &&
        error.code === 'PROGRESSION_VERIFICATION_REQUIRED',
      route,
    );
  }
});
