export const SYSTEM_SETTING_KEYS = ['KM_REIMBURSEMENT_RATE'] as const;
export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[number];

export const KM_RATE_DEFAULT = '0.60';
