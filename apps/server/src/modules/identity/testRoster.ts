import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IdentityService } from './identityService.js';
import type { SecurityProfile, UserRole } from './model.js';

export interface TestRosterUserItem {
  displayName: string;
  roles?: UserRole[];
  code: string;
  codeSet?: boolean;
}

export interface TestRosterGroupItem {
  groupId: string;
  users: TestRosterUserItem[];
}

export interface TestRosterFileFormat {
  description?: string;
  version?: number;
  groups: TestRosterGroupItem[];
}

export interface SeedOptions {
  securityProfile?: SecurityProfile;
  enabled?: boolean;
  filePath?: string;
}

export interface SeedResult {
  seeded: boolean;
  count: number;
  reason?: 'profile_not_trusted' | 'test_mode_not_enabled' | 'file_not_found' | 'invalid_format' | 'already_seeded';
}

/**
 * Детерминированный сид тестового ростера для e2e и локального тестирования.
 *
 * Инварианты безопасности (W0-03):
 * 1. Создаётся ТОЛЬКО при securityProfile === 'trusted' и явном флаге тестового режима.
 * 2. В профиле 'public' ростер никогда не создаётся.
 * 3. Коды берутся исключительно из внешнего файла примера/фикстуры, не из исходного кода.
 * 4. Коды никогда не выводятся в журнал или консоль.
 */
export async function seedTestRoster(
  service: IdentityService,
  options?: SeedOptions,
): Promise<SeedResult> {
  const profile = options?.securityProfile ?? service.getSecurityProfile() ?? process.env.SYNOPSIS_SECURITY_PROFILE;
  if (profile !== 'trusted') {
    return {
      seeded: false,
      count: 0,
      reason: 'profile_not_trusted',
    };
  }

  const enabled = options?.enabled ?? (
    process.env.SYNOPSIS_ENABLE_TEST_ROSTER === 'true' ||
    process.env.SYNOPSIS_ENABLE_TEST_ROSTER === '1'
  );
  if (!enabled) {
    return {
      seeded: false,
      count: 0,
      reason: 'test_mode_not_enabled',
    };
  }

  const repoRoot = existsSync(resolve(process.cwd(), 'config'))
    ? process.cwd()
    : resolve(process.cwd(), '../..');
  const defaultFilePath = resolve(repoRoot, 'config/test-roster.example.json');
  const filePath = options?.filePath ?? process.env.SYNOPSIS_TEST_ROSTER_FILE ?? defaultFilePath;

  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return {
      seeded: false,
      count: 0,
      reason: 'file_not_found',
    };
  }

  let data: TestRosterFileFormat;
  try {
    data = JSON.parse(raw) as TestRosterFileFormat;
    if (!Array.isArray(data.groups)) {
      return { seeded: false, count: 0, reason: 'invalid_format' };
    }
  } catch {
    return { seeded: false, count: 0, reason: 'invalid_format' };
  }

  let createdCount = 0;
  for (const group of data.groups) {
    if (!group.groupId || !Array.isArray(group.users)) continue;
    for (const u of group.users) {
      if (!u.displayName || !u.code) continue;
      const res = await service.seedDirectUser({
        displayName: u.displayName,
        groupId: group.groupId,
        roles: u.roles ?? ['student'],
        initialCode: u.code,
        codeSet: u.codeSet ?? true,
      });
      if (res) {
        createdCount += 1;
      }
    }
  }

  return {
    seeded: createdCount > 0,
    count: createdCount,
  };
}
