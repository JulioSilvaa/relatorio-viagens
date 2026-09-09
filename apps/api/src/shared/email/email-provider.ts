export interface SendInviteParams {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
}

export interface SendPasswordResetParams {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
}

export interface EmailProvider {
  sendInvite(params: SendInviteParams): Promise<void>;
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>;
}
