export type Debtor = {
  id?: string;
  ownerUid: string;
  name: string;
  total: number;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;

  archived?: boolean;
  archivedAt?: number;
};

export type Payment = {
  id?: string;
  debtorId: string;
  ownerUid: string;
  amount: number;     // em reais
  date: number;   
  note?: string | null;
  createdAt: number;

  // soft delete
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;

  paymentMethod?: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outros';
  paymentMethodOther?: string | null;
};
