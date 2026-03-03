export interface IClickHousePromo {
  id: string;
  code: string;
  discount: number;
  activeFrom?: string | Date | null;
  expiredAt?: string | Date | null;
  globalLimit: number;
  userLimit: number;
  inactiveAt?: string | Date | null;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
