import { KM_RATE_DEFAULT } from '../settings.types.js';
import type { SettingsRepository } from '../repositories/settings.repository.js';

export interface SystemSettingsView {
  kmReimbursementRate: string;
}

export class KmRateService {
  constructor(private readonly settings: SettingsRepository) {}

  async get(): Promise<string> {
    return (await this.settings.get('KM_REIMBURSEMENT_RATE')) ?? KM_RATE_DEFAULT;
  }

  async set(value: string): Promise<void> {
    await this.settings.set('KM_REIMBURSEMENT_RATE', value);
  }

  async view(): Promise<SystemSettingsView> {
    return { kmReimbursementRate: await this.get() };
  }
}
