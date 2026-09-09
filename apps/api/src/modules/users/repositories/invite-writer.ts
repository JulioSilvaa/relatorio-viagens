export interface InviteWriter {
  createInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
}
