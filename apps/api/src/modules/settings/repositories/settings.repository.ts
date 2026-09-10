import type { SystemSettingKey } from '../settings.types.js';

export interface SettingsRepository {
  get(key: SystemSettingKey): Promise<string | null>;
  set(key: SystemSettingKey, value: string): Promise<void>;
}
