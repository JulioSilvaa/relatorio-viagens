export interface CreditCardRecord {
  id: string;
  companyId: string;
  cardholderName: string;
  last4: string;
  brand: string | null;
  active: boolean;
  createdById: string;
  updatedById: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCreditCardInput {
  cardholderName: string;
  cardNumber: string;
  brand?: string | null;
}

export interface UpdateCreditCardInput {
  cardholderName: string;
  cardNumber?: string;
  brand?: string | null;
}
