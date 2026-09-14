import type { AuditService } from '../../../modules/audit/audit.service.js';
import { CreditCardNotFoundError } from '../credit-card.errors.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { encryptCreditCardNumber } from '../credit-card.crypto.js';
import type { CreditCardsRepository } from '../repositories/credit-cards.repository.js';
import { creditCardBrand, normalizeCreditCardNumber } from '../credit-card.validation.js';
import type { UpdateCreditCardInput, CreditCardRecord } from '../credit-card.types.js';

export class UpdateCreditCardService {
  constructor(
    private readonly cards: CreditCardsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    id: string,
    input: UpdateCreditCardInput,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<CreditCardRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const current = await this.cards.findById(id, actorCompanyId);
    if (!current) throw new CreditCardNotFoundError();
    const number = input.cardNumber ? normalizeCreditCardNumber(input.cardNumber) : null;
    const card = await this.cards.update(id, {
      ...input,
      brand: input.brand ?? (number ? creditCardBrand(number) : current.brand),
      ...(number
        ? { encryptedCardNumber: encryptCreditCardNumber(number), last4: number.slice(-4) }
        : {}),
      updatedById: actorId,
    });
    await this.audit.record({
      userId: actorId,
      operation: 'EDITAR',
      entityType: 'CARTAO_CORPORATIVO',
      entityId: id,
      oldValue: `****${current.last4}`,
      newValue: `****${card.last4}`,
    });
    return card;
  }
}
