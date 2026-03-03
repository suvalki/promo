export interface IClickHouseOrder {
  id: string;

  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;

  organicCost: number;
  totalCost: number;

  promoId?: string | null;
  promoCode?: string | null;
  promoDiscount?: number | null;

  inactiveAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
