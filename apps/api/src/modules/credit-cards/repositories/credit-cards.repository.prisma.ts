import { prisma } from '../../../config/database.js';
import type { CreditCard } from '@prisma/client';
import type { CreditCardsRepository } from './credit-cards.repository.js';
import type {
  CreditCardRecord,
  CreateCreditCardInput,
  UpdateCreditCardInput,
} from '../credit-card.types.js';

function toRecord(card: CreditCard): CreditCardRecord {
  return {
    id: card.id,
    cardholderName: card.cardholderName,
    last4: card.last4,
    brand: card.brand,
    active: card.active,
    createdById: card.createdById,
    updatedById: card.updatedById,
    deletedAt: card.deletedAt,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export class PrismaCreditCardsRepository implements CreditCardsRepository {
  async create(
    input: CreateCreditCardInput & {
      encryptedCardNumber: string;
      last4: string;
      createdById: string;
    },
  ): Promise<CreditCardRecord> {
    const card = await prisma.creditCard.create({
      data: {
        cardholderName: input.cardholderName,
        encryptedCardNumber: input.encryptedCardNumber,
        last4: input.last4,
        brand: input.brand ?? null,
        createdById: input.createdById,
      },
    });
    return toRecord(card);
  }

  async findById(id: string): Promise<CreditCardRecord | null> {
    const card = await prisma.creditCard.findUnique({ where: { id } });
    return card ? toRecord(card) : null;
  }

  async findAll(): Promise<CreditCardRecord[]> {
    const cards = await prisma.creditCard.findMany({
      where: { deletedAt: null },
      orderBy: [{ active: 'desc' }, { cardholderName: 'asc' }],
    });
    return cards.map(toRecord);
  }

  async update(
    id: string,
    input: UpdateCreditCardInput & {
      encryptedCardNumber?: string;
      last4?: string;
      updatedById: string;
    },
  ): Promise<CreditCardRecord> {
    const card = await prisma.creditCard.update({
      where: { id },
      data: {
        cardholderName: input.cardholderName,
        brand: input.brand ?? null,
        ...(input.encryptedCardNumber
          ? { encryptedCardNumber: input.encryptedCardNumber, last4: input.last4 }
          : {}),
        updatedById: input.updatedById,
      },
    });
    return toRecord(card);
  }

  async updateStatus(id: string, active: boolean, updatedById: string): Promise<CreditCardRecord> {
    const card = await prisma.creditCard.update({
      where: { id },
      data: { active, updatedById },
    });
    return toRecord(card);
  }
}
