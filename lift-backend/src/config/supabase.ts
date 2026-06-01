import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
}

// Cliente con service role — sin restricciones RLS, solo para el backend
export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
