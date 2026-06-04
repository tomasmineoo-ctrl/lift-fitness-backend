import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { JWTPayload } from '../types';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';

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

  if (!(user as any).email_verified) {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Confirmá tu email antes de iniciar sesión. Revisá tu casilla de correo.' });
  }

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

// ─── Helper: build gym URL for email links ─────────────────────────────────
function buildGymUrl(gymSlug: string): string {
  const isLocal = process.env.NODE_ENV !== 'production';
  if (isLocal) return `http://localhost:3000`;
  return `https://${gymSlug}.ctrlgym.org`;
}

// POST /api/auth/verify-email  { token }
router.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);

  const { data: row } = await supabase
    .from('email_tokens')
    .select('*')
    .eq('token', token)
    .eq('type', 'verify')
    .single();

  if (!row) return res.status(400).json({ error: 'El enlace no es válido o ya fue usado.' });
  if (row.used) return res.status(400).json({ error: 'Este enlace ya fue utilizado.' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'El enlace expiró. Contactá al gimnasio para que te reenvíen la verificación.' });

  await supabase.from('users').update({ email_verified: true }).eq('id', row.user_id);
  await supabase.from('email_tokens').update({ used: true }).eq('id', row.id);

  return res.json({ ok: true, message: '¡Email verificado! Ya podés iniciar sesión.' });
});

// POST /api/auth/forgot-password  { email, gym_slug? }
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email, gym_slug } = z.object({
    email:    z.string().email(),
    gym_slug: z.string().optional(),
  }).parse(req.body);

  const gym = await resolveGym(gym_slug, req.headers.host);
  if (!gym) return res.status(404).json({ error: 'Gimnasio no encontrado' });

  // Always return ok to avoid email enumeration
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', email)
    .eq('gym_id', gym.id)
    .single();

  if (user) {
    // Invalidate previous reset tokens
    await supabase.from('email_tokens').update({ used: true })
      .eq('user_id', user.id).eq('type', 'reset').eq('used', false);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await supabase.from('email_tokens').insert({
      user_id: user.id,
      gym_id: gym.id,
      token,
      type: 'reset',
      expires_at: expiresAt.toISOString(),
    });

    const gymUrl = buildGymUrl(gym.slug);
    try {
      await sendPasswordResetEmail(user.email, user.name, gym.name ?? 'LIFT Fitness', token, gymUrl);
    } catch (e) {
      console.error('[forgot-password] Email send failed:', e);
    }
  }

  return res.json({ ok: true, message: 'Si ese email está registrado, recibirás un enlace para restablecer tu contraseña.' });
});

// POST /api/auth/reset-password  { token, newPassword }
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = z.object({
    token:       z.string().min(10),
    newPassword: z.string().min(4),
  }).parse(req.body);

  const { data: row } = await supabase
    .from('email_tokens')
    .select('*')
    .eq('token', token)
    .eq('type', 'reset')
    .single();

  if (!row) return res.status(400).json({ error: 'El enlace no es válido.' });
  if (row.used) return res.status(400).json({ error: 'Este enlace ya fue utilizado.' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'El enlace expiró. Solicitá uno nuevo.' });

  const { data: newHash } = await supabase.rpc('hash_password', { plain: newPassword }).single();
  await supabase.from('users').update({ pass: newHash }).eq('id', row.user_id);
  await supabase.from('email_tokens').update({ used: true }).eq('id', row.id);

  return res.json({ ok: true, message: '¡Contraseña actualizada! Ya podés iniciar sesión.' });
});

export default router;
