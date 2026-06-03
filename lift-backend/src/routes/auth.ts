import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { JWTPayload } from '../types';

const router = Router();

// Máximo 5 intentos fallidos de login por IP cada 15 minutos
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

// Resuelve el gym_id a partir del slug enviado en el body o del hostname
async function resolveGym(slugHint: string | undefined, hostname: string | undefined) {
  // 1. Slug explícito en el body
  let slug = slugHint?.toLowerCase().trim();

  // 2. Inferir del subdominio (ej: lift.ctrlgym.org → 'lift')
  if (!slug && hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 3) slug = parts[0]; // subdomain
  }

  // 3. Fallback a 'lift' (compatibilidad hacia atrás)
  if (!slug) slug = 'lift';

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, slug, name, active')
    .eq('slug', slug)
    .single();

  return gym;
}

// POST /api/auth/login – protegido con rate limit
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password, gym_slug } = z.object({
    email:    z.string().email(),
    password: z.string().min(1),
    gym_slug: z.string().optional(),
  }).parse(req.body);

  const gym = await resolveGym(gym_slug, req.headers.host);
  if (!gym) return res.status(404).json({ error: 'Gimnasio no encontrado' });
  if (!gym.active) return res.status(403).json({ error: 'Gimnasio desactivado' });

  // Buscar en staff primero (filtrado por gym)
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, email, password_hash, name, role, active')
    .eq('email', email)
    .eq('gym_id', gym.id)
    .single();

  if (staffRow) {
    if (!staffRow.active) return res.status(403).json({ error: 'Cuenta desactivada' });
    const { data: check } = await supabase
      .rpc('verify_password', { plain: password, hashed: staffRow.password_hash })
      .single();

    if (!check) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const payload: JWTPayload = { id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email, gym_id: gym.id, gym_slug: gym.slug };
    const token = signToken(payload);
    return res.json({ token, user: { id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email, gym_id: gym.id, gym_slug: gym.slug } });
  }

  // Buscar en users (socios)
  const { data: user } = await supabase
    .from('users')
    .select('id, email, pass, name')
    .eq('email', email)
    .eq('gym_id', gym.id)
    .single();

  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const { data: check } = await supabase
    .rpc('verify_password', { plain: password, hashed: user.pass })
    .single();

  if (!check) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const payload: JWTPayload = { id: String(user.id), role: 'user', name: user.name, email: user.email, gym_id: gym.id, gym_slug: gym.slug };
  const token = signToken(payload);
  return res.json({ token, user: { id: String(user.id), role: 'user', name: user.name, email: user.email, gym_id: gym.id, gym_slug: gym.slug } });
});

// POST /api/auth/login/pin
router.post('/login/pin', async (req: Request, res: Response) => {
  const { pin, gym_slug } = z.object({
    pin:      z.string().length(4),
    gym_slug: z.string().optional(),
  }).parse(req.body);

  const gym = await resolveGym(gym_slug, req.headers.host);
  if (!gym) return res.status(404).json({ error: 'Gimnasio no encontrado' });

  // Buscar en staff
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, email, name, role, active')
    .eq('pin', pin)
    .eq('gym_id', gym.id)
    .single();

  if (staffRow) {
    if (!staffRow.active) return res.status(403).json({ error: 'Cuenta desactivada' });
    const payload: JWTPayload = { id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email, gym_id: gym.id, gym_slug: gym.slug };
    const token = signToken(payload);
    return res.json({ token, user: { id: staffRow.id, role: staffRow.role, name: staffRow.name, email: staffRow.email, gym_id: gym.id, gym_slug: gym.slug } });
  }

  // Buscar en users
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('pin', pin)
    .eq('gym_id', gym.id)
    .single();

  if (!user) return res.status(401).json({ error: 'PIN incorrecto' });

  const payload: JWTPayload = { id: String(user.id), role: 'user', name: user.name, email: user.email, gym_id: gym.id, gym_slug: gym.slug };
  const token = signToken(payload);
  return res.json({ token, user: { id: String(user.id), role: 'user', name: user.name, email: user.email, gym_id: gym.id, gym_slug: gym.slug } });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'user') {
    const { data } = await supabase.from('users').select('*').eq('id', Number(user.id)).eq('gym_id', user.gym_id).single();
    return res.json({ ...user, profile: data });
  }
  const { data } = await supabase.from('staff').select('id, email, name, role, active').eq('id', user.id).eq('gym_id', user.gym_id).single();
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
    const { data: row } = await supabase.from('users').select('pass').eq('id', Number(user.id)).eq('gym_id', user.gym_id).single();
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { data: ok } = await supabase.rpc('verify_password', { plain: currentPassword, hashed: row.pass }).single();
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const { data: newHash } = await supabase.rpc('hash_password', { plain: newPassword }).single();
    await supabase.from('users').update({ pass: newHash }).eq('id', Number(user.id));
  } else {
    const { data: row } = await supabase.from('staff').select('password_hash').eq('id', user.id).eq('gym_id', user.gym_id).single();
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { data: ok } = await supabase.rpc('verify_password', { plain: currentPassword, hashed: row.password_hash }).single();
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const { data: newHash } = await supabase.rpc('hash_password', { plain: newPassword }).single();
    await supabase.from('staff').update({ password_hash: newHash }).eq('id', user.id);
  }

  return res.json({ ok: true });
});

export default router;
