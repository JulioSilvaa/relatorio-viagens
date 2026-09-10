import { prisma } from '../../../config/database.js';
import type { SystemSettingKey } from '../settings.types.js';
import type { SettingsRepository } from './settings.repository.js';

export class PrismaSettingsRepository implements SettingsRepository {
  async get(key: SystemSettingKey): Promise<string | null> {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async set(key: SystemSettingKey, value: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
