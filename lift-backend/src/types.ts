export type Role = 'admin' | 'trainer' | 'reception' | 'nutritionist' | 'user';

export interface JWTPayload {
  id: string;
  role: Role;
  name: string;
  email: string;
  gym_id: string;
  gym_slug: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface QuotaStatus {
  status: 'active' | 'inactive' | 'warning' | 'grace' | 'blocked' | 'frozen';
  label: string;
}
