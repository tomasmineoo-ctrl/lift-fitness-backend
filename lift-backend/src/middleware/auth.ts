import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, Role } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

export function authorizeOwnerOrRoles(
  getOwnerId: (req: Request) => string | undefined,
  ...roles: Role[]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (roles.includes(req.user.role)) return next();
    const ownerId = getOwnerId(req);
    if (ownerId && req.user.id === ownerId) return next();
    return res.status(403).json({ error: 'Sin permisos para esta acción' });
  };
}
