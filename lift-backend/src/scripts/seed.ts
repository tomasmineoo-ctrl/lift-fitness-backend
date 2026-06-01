/**
 * Script de seed: inserta datos demo usando el schema real de Supabase.
 * Uso: npm run seed
 *
 * Contraseñas se hashean via RPC hash_password (pgcrypto).
 * IDs de usuarios son bigint autogenerados; staff usa UUIDs fijos.
 */
import 'dotenv/config';
import { supabase } from '../config/supabase';

async function hashPwd(plain: string): Promise<string> {
  const { data, error } = await supabase.rpc('hash_password', { plain });
  if (error) throw new Error(`hash_password RPC failed: ${error.message}`);
  return data as string;
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── STAFF ──────────────────────────────────────────────────────
  const staffData = [
    { id: '00000000-0000-0000-0000-000000000001', email: 'admin@lift.com',        password: 'Lift2025#',   name: 'Gerencia Lift',              role: 'admin',        pin: '0000' },
    { id: '00000000-0000-0000-0000-000000000002', email: 'recep@lift.com',        password: 'recep2025',   name: 'Recepcionista Turno Mañana', role: 'reception',    pin: '1111' },
    { id: '00000000-0000-0000-0000-000000000003', email: 'recep2@lift.com',       password: 'recep2025',   name: 'Recepcionista Turno Tarde',  role: 'reception',    pin: '2222' },
    { id: '00000000-0000-0000-0000-000000000004', email: 'trainer@lift.com',      password: 'trainer2025', name: 'Lic. Martínez',              role: 'trainer',      pin: '3333' },
    { id: '00000000-0000-0000-0000-000000000005', email: 'nutricion@lift.com',    password: 'nutri2025',   name: 'Nutricionista Lift',         role: 'nutritionist', pin: '4444' },
  ];

  for (const s of staffData) {
    const password_hash = await hashPwd(s.password);
    const { error } = await supabase.from('staff').upsert(
      { id: s.id, email: s.email, name: s.name, role: s.role, pin: s.pin, password_hash, active: true },
      { onConflict: 'id' }
    );
    if (error) console.error(`  ❌ Staff (${s.email}): ${error.message}`);
    else       console.log(`  ✅ Staff: ${s.email}`);
  }

  // ── USUARIOS (socios) ──────────────────────────────────────────
  // IDs son bigint autogenerados; usamos email como clave de conflicto
  const usersData = [
    {
      name: 'Carlos Mejía',  email: 'carlos@mail.com', pass: '1234', pin: '1001',
      phone: '7890-1234',    dob: '1990-05-15',         plan: 'Oro',      status: 'active',
      frozen: false,         debt: 0,                   med_clearance: true,
      insc_date: '2024-11-10', last_payment: '2025-05-01',
    },
    {
      name: 'Ana Flores',    email: 'ana@mail.com',     pass: '1234', pin: '1002',
      phone: '7777-8888',    dob: '1995-08-22',         plan: 'Plata',    status: 'active',
      frozen: false,         debt: 0,                   med_clearance: true,
      insc_date: '2025-01-15', last_payment: '2025-04-28',
    },
    {
      name: 'Roberto Díaz',  email: 'roberto@mail.com', pass: '1234', pin: '1003',
      phone: '7654-3210',    dob: '1988-12-01',         plan: 'Bronce',   status: 'inactive',
      frozen: false,         debt: 25,                  med_clearance: false,
      insc_date: '2025-03-08', last_payment: null,
    },
    {
      name: 'María López',   email: 'maria@mail.com',   pass: '1234', pin: '1004',
      phone: '7123-4567',    dob: '1993-03-17',         plan: 'Diamante', status: 'active',
      frozen: false,         debt: 0,                   med_clearance: true,
      insc_date: '2024-08-01', last_payment: '2025-05-05',
    },
  ];

  for (const u of usersData) {
    const pass = await hashPwd(u.pass);
    const { error } = await supabase.from('users').upsert(
      { ...u, pass },
      { onConflict: 'email', ignoreDuplicates: false }
    );
    if (error) console.error(`  ❌ User (${u.email}): ${error.message}`);
    else       console.log(`  ✅ User: ${u.email}`);
  }

  // ── CLASES ─────────────────────────────────────────────────────
  const { count } = await supabase.from('classes').select('*', { count: 'exact', head: true });
  if (!count) {
    const { error } = await supabase.from('classes').insert([
      { type: 'Yoga',      trainer: 'Lic. Martínez', day: 'Lunes',     time: '08:00', duration: 60, capacity: 15 },
      { type: 'Spinning',  trainer: 'Lic. Martínez', day: 'Martes',    time: '07:00', duration: 45, capacity: 10 },
      { type: 'Pilates',   trainer: 'Lic. Martínez', day: 'Miércoles', time: '18:00', duration: 60, capacity: 12 },
      { type: 'Funcional', trainer: 'Lic. Martínez', day: 'Jueves',    time: '09:00', duration: 50, capacity: 20 },
      { type: 'Boxeo',     trainer: 'Lic. Martínez', day: 'Viernes',   time: '19:00', duration: 60, capacity: 8  },
    ]);
    if (error) console.error(`  ❌ Classes: ${error.message}`);
    else       console.log('  ✅ 5 clases insertadas');
  } else {
    console.log('  ⏭  Clases ya existen, saltando');
  }

  // ── MÁQUINAS ────────────────────────────────────────────────────
  const { count: mCount } = await supabase.from('machines').select('*', { count: 'exact', head: true });
  if (!mCount) {
    const { error } = await supabase.from('machines').insert([
      { name: 'Cinta de correr 1',  category: 'Cardio',    status: 'active', usage_instructions: 'Calibrar velocidad antes de subir.' },
      { name: 'Bicicleta estática', category: 'Cardio',    status: 'active', usage_instructions: 'Ajustar el asiento a la altura de la cadera.' },
      { name: 'Press de banca',     category: 'Fuerza',    status: 'active', usage_instructions: 'Espalda plana, pies apoyados en el suelo.' },
      { name: 'Jalón al pecho',     category: 'Fuerza',    status: 'active', usage_instructions: 'Bajar la barra hasta la clavícula.' },
      { name: 'Remo sentado',       category: 'Fuerza',    status: 'active', usage_instructions: 'Mantener la espalda recta durante el movimiento.' },
      { name: 'Elíptica',           category: 'Cardio',    status: 'active', usage_instructions: 'Movimiento fluido, no forzar las rodillas.' },
      { name: 'Multipower',         category: 'Fuerza',    status: 'active', usage_instructions: 'Usar guías de seguridad en posición correcta.' },
      { name: 'Leg press',          category: 'Piernas',   status: 'maintenance', usage_instructions: 'No bloquear las rodillas al extender.' },
    ]);
    if (error) console.error(`  ❌ Machines: ${error.message}`);
    else       console.log('  ✅ 8 máquinas insertadas');
  } else {
    console.log('  ⏭  Máquinas ya existen, saltando');
  }

  // ── PUNTOS CONFIG ───────────────────────────────────────────────
  const { error: pcErr } = await supabase.from('points_config')
    .upsert({ id: 1, exchange_rate: 100, min_redeem: 500 }, { onConflict: 'id', ignoreDuplicates: true });
  if (pcErr) console.error(`  ❌ Points config: ${pcErr.message}`);
  else       console.log('  ✅ Points config OK');

  // ── CATEGORÍAS DE GASTOS ────────────────────────────────────────
  const { count: ecCount } = await supabase.from('expense_categories').select('*', { count: 'exact', head: true });
  if (!ecCount) {
    const { error } = await supabase.from('expense_categories').insert([
      { name: 'Sueldos',        icon: '👥', color: '#6366f1' },
      { name: 'Servicios',      icon: '⚡', color: '#f59e0b' },
      { name: 'Mantenimiento',  icon: '🔧', color: '#10b981' },
      { name: 'Equipamiento',   icon: '🏋️', color: '#3b82f6' },
      { name: 'Marketing',      icon: '📢', color: '#ec4899' },
      { name: 'Insumos',        icon: '🛒', color: '#84cc16' },
    ]);
    if (error) console.error(`  ❌ Expense categories: ${error.message}`);
    else       console.log('  ✅ 6 categorías de gastos insertadas');
  } else {
    console.log('  ⏭  Categorías de gastos ya existen, saltando');
  }

  console.log('\n✅ Seed completado correctamente.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
