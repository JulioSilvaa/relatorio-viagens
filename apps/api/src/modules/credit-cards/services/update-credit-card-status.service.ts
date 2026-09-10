import type { AuditService } from '../../../modules/audit/audit.service.js';
import { CreditCardNotFoundError } from '../credit-card.errors.js';
import type { CreditCardsRepository } from '../repositories/credit-cards.repository.js';
import type { CreditCardRecord } from '../credit-card.types.js';

export class UpdateCreditCardStatusService {
  constructor(
    private readonly cards: CreditCardsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, active: boolean, actorId: string): Promise<CreditCardRecord> {
    const current = await this.cards.findById(id);
    if (!current) throw new CreditCardNotFoundError();
    const card = await this.cards.updateStatus(id, active, actorId);
    await this.audit.record({
      userId: actorId,
      operation: active ? 'REATIVAR' : 'DESATIVAR',
      entityType: 'CARTAO_CORPORATIVO',
      entityId: id,
      field: 'active',
      oldValue: String(current.active),
      newValue: String(card.active),
    });
    return card;
  }
}
