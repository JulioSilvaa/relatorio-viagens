import type { CreditCardsRepository } from '../repositories/credit-cards.repository.js';

export class ListCreditCardsService {
  constructor(private readonly cards: CreditCardsRepository) {}

  execute() {
    return this.cards.findAll();
  }
}
