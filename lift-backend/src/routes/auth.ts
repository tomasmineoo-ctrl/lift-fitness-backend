import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { JWTPayload } from '../types';

const router = Router();

// MÃ¡ximo 5 intentos fallidos de login por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos incorrectos. Esperá 15 minutos antes de volver a intentar.' },
});

function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

// POST /api/auth/login â€” protegido con rate limit
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = z.object({
    email:    z.string().email(),
    password: z.string().min(1),
  }).parse(req.body);

  // Buscar en staff primero
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, email, password_hash, name, role, active')
    .eq('email', email)
    .single();

  if (staffRow) {
    if (!staffRow.active) return res.status(403).json({ error: 'Cuenta desactivada' });
    // Verificar con pgcrypto â€” consultamos si el hash coincide
    const { data: check } = await supabase
      .rpc('verify_password', { plain: password, hashed: staffRow.password_hash })
      .single();

    if (!check) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = signToken({ id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email });
    return res.json({ token, user: { id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email } });
  }

  // Buscar en users (socios)
  const { data: user } = await supabase
    .from('users')
    .select('id, email, pass, name')
    .eq('email', email)
    .single();

  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const { data: check } = await supabase
    .rpc('verify_password', { plain: password, hashed: user.pass })
    .single();

  if (!check) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = signToken({ id: String(user.id), role: 'user', name: user.name, email: user.email });
  return res.json({ token, user: { id: String(user.id), role: 'user', name: user.name, email: user.email } });
});

// POST /api/auth/login/pin
router.post('/login/pin', async (req: Request, res: Response) => {
  const { pin } = z.object({ pin: z.string().length(4) }).parse(req.body);

  // Buscar en staff
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, email, name, role, active')
    .eq('pin', pin)
    .single();

  if (staffRow) {
    if (!staffRow.active) return res.status(403).json({ error: 'Cuenta desactivada' });
    const token = signToken({ id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email });
    return res.json({ token, user: { id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email } });
  }

  // Buscar en users
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('pin', pin)
    .single();

  if (!user) return res.status(401).json({ error: 'PIN incorrecto' });

  const token = signToken({ id: String(user.id), role: 'user', name: user.name, email: user.email });
  return res.json({ token, user: { id: String(user.id), role: 'user', name: user.name, email: user.email } });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'user') {
    const { data } = await supabase.from('users').select('*').eq('id', Number(user.id)).single();
    return res.json({ ...user, profile: data });
  }
  const { data } = await supabase.from('staff').select('id, email, name, role, active').eq('id', user.id).single();
  return res.json({ ...user, profile: data });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(4),
  }).parse(req.body);

  const user = req.user!;

  if (user.role === 'user') {
    const { data: row } = await supabase.from('users').select('pass').eq('id', Number(user.id)).single();
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { data: ok } = await supabase.rpc('verify_password', { plain: currentPassword, hashed: row.pass }).single();
    if (!ok) return res.status(401).json({ error: 'ContraseÃ±a actual incorrecta' });
    const { data: newHash } = await supabase.rpc('hash_password', { plain: newPassword }).single();
    await supabase.from('users').update({ pass: newHash }).eq('id', Number(user.id));
  } else {
    const { data: row } = await supabase.from('staff').select('password_hash').eq('id', user.id).single();
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { data: ok } = await supabase.rpc('verify_password', { plain: currentPassword, hashed: row.password_hash }).single();
    if (!ok) return res.status(401).json({ error: 'ContraseÃ±a actual incorrecta' });
    const { data: newHash } = await supabase.rpc('hash_password', { plain: newPassword }).single();
    await supabase.from('staff').update({ password_hash: newHash }).eq('id', user.id);
  }

  return res.json({ ok: true });
});

export default router;


