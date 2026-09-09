import type { EmailProvider, SendInviteParams, SendPasswordResetParams } from './email-provider.js';

/**
 * Provedor de desenvolvimento: apenas loga a mensagem.
 * Habilitado somente quando EMAIL_PROVIDER=dev (nunca em produção).
 */
export class DevEmailProvider implements EmailProvider {
  async sendInvite(params: SendInviteParams): Promise<void> {
    console.info('[email:dev] Convite', {
      to: params.to,
      name: params.name,
      token: params.token,
      expiresAt: params.expiresAt.toISOString(),
    });
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    console.info('[email:dev] Recuperação de senha', {
      to: params.to,
      name: params.name,
      token: params.token,
      expiresAt: params.expiresAt.toISOString(),
    });
  }
}
