export interface IClickHouseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  bannedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
