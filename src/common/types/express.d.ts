import { User } from '@/datasources/mongoose/User.schema';

declare global {
  namespace Express {
    interface Request {
      cookies: Record<string, string | undefined>;
      user?: User;
    }
  }
}
