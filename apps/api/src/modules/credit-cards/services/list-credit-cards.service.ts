import type { CreditCardsRepository } from '../repositories/credit-cards.repository.js';

export class ListCreditCardsService {
  constructor(private readonly cards: CreditCardsRepository) {}

  execute(companyId: string | null) {
    if (!companyId) return Promise.resolve([]);
    return this.cards.findAll(companyId);
  }

  async executeActive(companyId: string | null) {
    if (!companyId) return [];
    const cards = await this.cards.findAll(companyId);
    return cards
      .filter((card) => card.active && card.deletedAt === null)
      .map(({ id, cardholderName, last4, brand, active }) => ({
        id,
        cardholderName,
        last4,
        brand,
        active,
      }));
  }
}
