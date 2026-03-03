export interface IClickHousePromoUsage {
  id: string;

  promoId: string;
  promoCode: string;
  promoDiscount: number;

  orderId: string;
  organicCost: number;
  totalCost: number;

  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;

  createdAt: string | Date;
}
