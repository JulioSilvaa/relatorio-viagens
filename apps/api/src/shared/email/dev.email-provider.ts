import { isProduction } from '../../config/env.js';
import type { EmailProvider, SendInviteParams, SendPasswordResetParams } from './email-provider.js';

/**
 * Modo log: apenas registra a mensagem no console.
 * Não há provedor real (SMTP) por enquanto; os e-mails não são entregues.
 * O token só é logado fora de produção: em produção ele equivale a uma
 * credencial (permite aceitar convite ou trocar a senha de qualquer
 * usuário) e não pode ficar em logs agregados (AGENTS.md: nunca logar
 * senha/token).
 */
export class DevEmailProvider implements EmailProvider {
  async sendInvite(params: SendInviteParams): Promise<void> {
    console.info('[email:dev] Convite', {
      to: params.to,
      name: params.name,
      ...(isProduction ? {} : { token: params.token }),
      expiresAt: params.expiresAt.toISOString(),
    });
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    console.info('[email:dev] Recuperação de senha', {
      to: params.to,
      name: params.name,
      ...(isProduction ? {} : { token: params.token }),
      expiresAt: params.expiresAt.toISOString(),
    });
  }
}
