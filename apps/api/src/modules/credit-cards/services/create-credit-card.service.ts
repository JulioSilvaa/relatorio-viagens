import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { encryptCreditCardNumber } from '../credit-card.crypto.js';
import type { CreditCardsRepository } from '../repositories/credit-cards.repository.js';
import { creditCardBrand, normalizeCreditCardNumber } from '../credit-card.validation.js';
import type { CreateCreditCardInput, CreditCardRecord } from '../credit-card.types.js';

export class CreateCreditCardService {
  constructor(
    private readonly cards: CreditCardsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: CreateCreditCardInput,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<CreditCardRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const number = normalizeCreditCardNumber(input.cardNumber);
    const card = await this.cards.create({
      ...input,
      encryptedCardNumber: encryptCreditCardNumber(number),
      last4: number.slice(-4),
      brand: input.brand ?? creditCardBrand(number),
      createdById: actorId,
      companyId: actorCompanyId,
    });
    await this.audit.record({
      userId: actorId,
      operation: 'CRIAR',
      entityType: 'CARTAO_CORPORATIVO',
      entityId: card.id,
      newValue: `****${card.last4}`,
    });
    return card;
  }
}
