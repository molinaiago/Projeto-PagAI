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
  amount: number;    
  date: number;       
  note?: string | null;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
  paymentMethod?: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outros';
  paymentMethodOther?: string | null;
  scheduled?: boolean; 
  paid?: boolean;      
};

export type UserProfile = {
  uid: string;
  email: string;
  plan: 'free' | 'pro';
  createdAt: number;
  debtorsCount: number; 

  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'inactive';
  subscriptionExpiresAt?: number; 
  mercadoPagoPaymentId?: string; 
};