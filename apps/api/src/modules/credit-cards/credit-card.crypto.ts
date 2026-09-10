import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { CreditCardEncryptionNotConfiguredError } from './credit-card.errors.js';

function encryptionKey(): Buffer {
  if (!env.CARD_ENCRYPTION_KEY) {
    throw new CreditCardEncryptionNotConfiguredError();
  }
  return createHash('sha256').update(env.CARD_ENCRYPTION_KEY).digest();
}

export function encryptCreditCardNumber(cardNumber: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(cardNumber, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}
