import type {
  CreateCreditCardInput,
  CreditCardRecord,
  UpdateCreditCardInput,
} from '../credit-card.types.js';

export interface CreditCardsRepository {
  create(
    input: CreateCreditCardInput & {
      encryptedCardNumber: string;
      last4: string;
      createdById: string;
    },
  ): Promise<CreditCardRecord>;
  findById(id: string): Promise<CreditCardRecord | null>;
  findAll(): Promise<CreditCardRecord[]>;
  update(
    id: string,
    input: UpdateCreditCardInput & {
      encryptedCardNumber?: string;
      last4?: string;
      updatedById: string;
    },
  ): Promise<CreditCardRecord>;
  updateStatus(id: string, active: boolean, updatedById: string): Promise<CreditCardRecord>;
}
