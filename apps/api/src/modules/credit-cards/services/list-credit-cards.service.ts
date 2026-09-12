import type { CreditCardsRepository } from '../repositories/credit-cards.repository.js';

export class ListCreditCardsService {
  constructor(private readonly cards: CreditCardsRepository) { }

  execute() {
    return this.cards.findAll();
  }

  async executeActive() {
    const cards = await this.cards.findAll();
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
