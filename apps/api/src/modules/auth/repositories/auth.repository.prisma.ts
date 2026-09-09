import { prisma } from '../../../config/database.js';
import type { AuthSessionRecord } from '../../../shared/auth/session.js';
import type {
  CreateSessionInput,
  InviteRecord,
  PasswordResetRecord,
  SessionsRepository,
} from '../auth.types.js';

export class PrismaSessionsRepository implements SessionsRepository {
  async create(input: CreateSessionInput): Promise<void> {
    await prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    const session = await prisma.session.findUnique({
      where: { tokenHash, revokedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            role: {
              select: {
                code: true,
                permissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        status: session.user.status,
        roleCode: session.user.role.code,
        permissions: session.user.role.permissions.map((p) => p.permission.code),
      },
    };
  }

  async markActivity(sessionId: string, lastActivityAt: Date, expiresAt: Date): Promise<void> {
    await prisma.session.update({ where: { id: sessionId }, data: { lastActivityAt, expiresAt } });
  }

  async revoke(sessionId: string, revokedAt: Date): Promise<void> {
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt } });
  }

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}

export class PrismaInvitesRepository {
  async createInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.inviteToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findByTokenHash(tokenHash: string): Promise<InviteRecord | null> {
    return prisma.inviteToken.findUnique({ where: { tokenHash } });
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await prisma.inviteToken.update({ where: { id }, data: { usedAt } });
  }
}

export class PrismaPasswordResetRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetRecord | null> {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await prisma.passwordResetToken.update({ where: { id }, data: { usedAt } });
  }
}
