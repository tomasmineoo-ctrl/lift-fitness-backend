import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.flatten().fieldErrors,
    });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  return res.status(500).json({ error: message });
}
