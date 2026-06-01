-- ============================================================
-- LIFT Fitness Center San Salvador — Schema v1
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── STAFF ────────────────────────────────────────────────────
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,          -- bcrypt hash
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','trainer','reception','nutritionist')),
  pin         TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(email);

-- ── MEMBERS (socios) ─────────────────────────────────────────
CREATE TABLE members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password      TEXT NOT NULL,        -- bcrypt hash
  pin           TEXT,
  phone         TEXT,
  dni           TEXT,
  nationality   TEXT,
  dob           DATE,
  address       TEXT,
  weight        NUMERIC(5,2),
  height        NUMERIC(5,2),
  blood_type    TEXT,
  med_coverage  TEXT,
  med_clearance BOOLEAN DEFAULT false,
  photo_url     TEXT,
  plan          TEXT NOT NULL DEFAULT 'Bronce' CHECK (plan IN ('Bronce','Plata','Oro','Diamante')),
  pay_method    TEXT,
  insc_date     DATE DEFAULT CURRENT_DATE,
  last_payment  DATE,
  status        TEXT DEFAULT 'inactive' CHECK (status IN ('active','inactive','blocked','frozen')),
  frozen        BOOLEAN DEFAULT false,
  debt          NUMERIC(10,2) DEFAULT 0,
  referral_code TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_plan ON members(plan);
CREATE INDEX idx_members_status ON members(status);

-- ── PLANES ───────────────────────────────────────────────────
CREATE TABLE plans (
  id       SERIAL PRIMARY KEY,
  name     TEXT UNIQUE NOT NULL,
  price    NUMERIC(10,2) NOT NULL,
  features TEXT,
  color    TEXT,
  active   BOOLEAN DEFAULT true
);

INSERT INTO plans (name, price, features, color) VALUES
  ('Bronce',   25, 'Acceso L-V · Horario libre · Vestuario', 'bronze'),
  ('Plata',    35, 'Acceso L-S · Clases grupales · Vestuario', 'silver'),
  ('Oro',      50, 'Acceso full · Clases + Personal · Nutrición', 'gold'),
  ('Diamante', 75, 'Todo incluido · Invitados · Spa · Priority', 'diamond');

-- ── PAYMENTS (pagos) ─────────────────────────────────────────
CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name    TEXT,
  amount         NUMERIC(10,2) NOT NULL,
  plan           TEXT,
  brand          TEXT DEFAULT '—',
  bank           TEXT DEFAULT '—',
  card_type      TEXT,
  last4          TEXT DEFAULT '—',
  installments   INTEGER DEFAULT 1,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  transaction_id TEXT,
  method         TEXT,
  notes          TEXT,
  registered_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  date           DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_status ON payments(status);

-- ── PAY HISTORY (historial por socio) ────────────────────────
CREATE TABLE pay_history (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  amount    NUMERIC(10,2) NOT NULL,
  method    TEXT,
  plan      TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pay_history_member ON pay_history(member_id);

-- ── CLASSES (clases grupales) ─────────────────────────────────
CREATE TABLE classes (
  id         SERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  trainer    TEXT,
  day        TEXT NOT NULL,
  time       TIME NOT NULL,
  duration   INTEGER,
  capacity   INTEGER DEFAULT 15,
  active     BOOLEAN DEFAULT true,
  open_slot  DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CLASS ENROLLMENTS ─────────────────────────────────────────
CREATE TABLE class_enrollments (
  id           SERIAL PRIMARY KEY,
  class_id     INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  member_id    UUID REFERENCES members(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled','waitlist','cancelled')),
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, member_id)
);

CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_enrollments_member ON class_enrollments(member_id);

-- ── ACCESS LOG ────────────────────────────────────────────────
CREATE TABLE access_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name  TEXT,
  type         TEXT DEFAULT 'entry' CHECK (type IN ('entry','exit')),
  method       TEXT CHECK (method IN ('QR','PIN','manual')),
  allowed      BOOLEAN DEFAULT true,
  date         DATE DEFAULT CURRENT_DATE,
  time         TIME,
  exit_time    TIME,
  duration_min INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_member ON access_log(member_id);
CREATE INDEX idx_access_date ON access_log(date);

-- ── EXPENSE CATEGORIES ────────────────────────────────────────
CREATE TABLE expense_categories (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  icon  TEXT,
  color TEXT
);

INSERT INTO expense_categories (name, icon, color) VALUES
  ('Alquiler',      '🏠', '#e74c3c'),
  ('Servicios',     '💡', '#f39c12'),
  ('Sueldos',       '👥', '#3498db'),
  ('Mantenimiento', '🔧', '#9b59b6'),
  ('Equipamiento',  '🏋️', '#2ecc71'),
  ('Marketing',     '📣', '#1abc9c'),
  ('Limpieza',      '🧹', '#e67e22'),
  ('Otros',         '📦', '#95a5a6');

-- ── EXPENSES (gastos) ─────────────────────────────────────────
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL,
  category_id   INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  description   TEXT,
  amount        NUMERIC(10,2) NOT NULL,
  registered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date);

-- ── ANNOUNCEMENTS (comunicados) ───────────────────────────────
CREATE TABLE announcements (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  target     TEXT DEFAULT 'Todos',
  author     TEXT,
  author_id  UUID REFERENCES staff(id) ON DELETE SET NULL,
  date       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES (chat) ───────────────────────────────────────────
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id      TEXT NOT NULL,
  from_name    TEXT,
  to_id        TEXT NOT NULL,
  to_name      TEXT,
  content      TEXT NOT NULL,
  read         BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_from ON messages(from_id);
CREATE INDEX idx_messages_to ON messages(to_id);

-- ── MACHINES (máquinas) ───────────────────────────────────────
CREATE TABLE machines (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT,
  description  TEXT,
  usage_instr  TEXT,
  video_url    TEXT,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── DISCOUNTS ─────────────────────────────────────────────────
CREATE TABLE discounts (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  percentage INTEGER NOT NULL,
  plan       TEXT DEFAULT 'Todos',
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── REFERRALS ─────────────────────────────────────────────────
CREATE TABLE referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID REFERENCES members(id) ON DELETE SET NULL,
  referrer_name    TEXT,
  referred_id      UUID REFERENCES members(id) ON DELETE SET NULL,
  referred_name    TEXT,
  benefit          TEXT,
  points_credited  INTEGER DEFAULT 0,
  date             DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── POINTS LOG ────────────────────────────────────────────────
CREATE TABLE points_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  action      TEXT NOT NULL,
  points      INTEGER NOT NULL,
  detail      TEXT,
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_member ON points_log(member_id);

-- ── REDEMPTIONS LOG ───────────────────────────────────────────
CREATE TABLE redemptions_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  type        TEXT,
  points      INTEGER NOT NULL,
  amount      NUMERIC(10,2),
  detail      TEXT,
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── POINTS CONFIG ─────────────────────────────────────────────
CREATE TABLE points_config (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  exchange_rate INTEGER DEFAULT 100,
  actions       JSONB DEFAULT '{
    "asistencia": 10,
    "horaExtra": 5,
    "cafeteria": 2,
    "renovacion": 150,
    "referido": 200,
    "reto": 50,
    "cumpleanios": 100,
    "primerAno": 500,
    "seisMeses": 250,
    "tresMeses": 100,
    "claseGrupal": 8,
    "evaluacionFisica": 30,
    "shop": 1
  }',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO points_config DEFAULT VALUES;

-- ── USER NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE user_notifications (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  tipo      TEXT,
  titulo    TEXT,
  mensaje   TEXT,
  fecha     DATE DEFAULT CURRENT_DATE,
  leida     BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_member ON user_notifications(member_id);

-- ── TRAINER STUDENTS ──────────────────────────────────────────
CREATE TABLE trainer_students (
  id         SERIAL PRIMARY KEY,
  trainer_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  member_id  UUID REFERENCES members(id) ON DELETE CASCADE,
  goal       TEXT,
  level      TEXT,
  notes      TEXT,
  custom_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trainer_id, member_id)
);

-- ── PHYSICAL PROGRESS ─────────────────────────────────────────
CREATE TABLE physical_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
  trainer_id  UUID REFERENCES staff(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  weight      NUMERIC(5,2),
  body_fat    NUMERIC(5,2),
  muscle      NUMERIC(5,2),
  waist       NUMERIC(5,2),
  chest       NUMERIC(5,2),
  arm         NUMERIC(5,2),
  leg         NUMERIC(5,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progress_member ON physical_progress(member_id);

-- ── CAFETERIA MENU ────────────────────────────────────────────
CREATE TABLE cafeteria_menu (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  category           TEXT,
  price              NUMERIC(10,2) NOT NULL,
  image              TEXT,
  options            JSONB DEFAULT '[]',
  active             BOOLEAN DEFAULT true,
  points_per_purchase INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── CAFETERIA ORDERS ──────────────────────────────────────────
CREATE TABLE cafeteria_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT,
  items       JSONB NOT NULL,
  total       NUMERIC(10,2) NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','ready','delivered','cancelled')),
  method      TEXT,
  notes       TEXT,
  paid        BOOLEAN DEFAULT false,
  date        DATE DEFAULT CURRENT_DATE,
  time        TIME,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caf_orders_member ON cafeteria_orders(member_id);

-- ── SHOP PRODUCTS ─────────────────────────────────────────────
CREATE TABLE shop_products (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT,
  price      NUMERIC(10,2) DEFAULT 0,
  points     INTEGER NOT NULL,
  image      TEXT,
  stock      INTEGER DEFAULT 0,
  active     BOOLEAN DEFAULT true,
  type       TEXT DEFAULT 'puntos' CHECK (type IN ('dinero','puntos','mixto')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SHOP ORDERS ───────────────────────────────────────────────
CREATE TABLE shop_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name  TEXT,
  product_id   INTEGER REFERENCES shop_products(id) ON DELETE SET NULL,
  product_name TEXT,
  points       INTEGER,
  amount       NUMERIC(10,2),
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','delivered','cancelled')),
  date         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMUNITY POSTS ───────────────────────────────────────────
CREATE TABLE community_posts (
  id          SERIAL PRIMARY KEY,
  author_id   TEXT NOT NULL,
  author_name TEXT,
  author_role TEXT,
  content     TEXT NOT NULL,
  image_url   TEXT,
  tipo        TEXT DEFAULT 'post',
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── POST LIKES ────────────────────────────────────────────────
CREATE TABLE post_likes (
  post_id    INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- ── POST COMMENTS ─────────────────────────────────────────────
CREATE TABLE post_comments (
  id          SERIAL PRIMARY KEY,
  post_id     INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL,
  author_name TEXT,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMUNITY CHALLENGES ──────────────────────────────────────
CREATE TABLE community_challenges (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT,
  points      INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── CHALLENGE PARTICIPANTS ────────────────────────────────────
CREATE TABLE challenge_participants (
  challenge_id INTEGER REFERENCES community_challenges(id) ON DELETE CASCADE,
  member_id    UUID REFERENCES members(id) ON DELETE CASCADE,
  validated    BOOLEAN DEFAULT false,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (challenge_id, member_id)
);

-- ── MEMBER CARDS ──────────────────────────────────────────────
CREATE TABLE member_cards (
  id           SERIAL PRIMARY KEY,
  member_id    UUID REFERENCES members(id) ON DELETE CASCADE,
  card_type    TEXT,
  brand        TEXT,
  bank         TEXT,
  last4        TEXT,
  holder       TEXT,
  expiry       TEXT,
  status       TEXT DEFAULT 'active',
  installments BOOLEAN DEFAULT false,
  country      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── SHIFT RECORDS (turnos) ────────────────────────────────────
CREATE TABLE shift_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID REFERENCES staff(id) ON DELETE SET NULL,
  staff_name    TEXT,
  shift         TEXT,
  date          DATE DEFAULT CURRENT_DATE,
  total_cash    NUMERIC(10,2) DEFAULT 0,
  total_digital NUMERIC(10,2) DEFAULT 0,
  total_crypto  NUMERIC(10,2) DEFAULT 0,
  payments      JSONB DEFAULT '[]',
  closed        BOOLEAN DEFAULT false,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── ADMIN LOG ─────────────────────────────────────────────────
CREATE TABLE admin_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name TEXT,
  staff_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
  action     TEXT,
  detail     TEXT,
  date       DATE DEFAULT CURRENT_DATE,
  time       TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_log_date ON admin_log(date);

-- ── COMMISSIONS CONFIG ────────────────────────────────────────
CREATE TABLE commissions_config (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  reception  JSONB DEFAULT '{"metaGrupalMensual":20,"metaIndividualMensual":10,"beneficioGrupal":"Bono $50 equipo","beneficioIndividual":"Bono $20"}',
  trainers   JSONB DEFAULT '{"mes3":"Bono $30","mes6":"Bono $60 + día libre","mes12":"Bono $150 + reconocimiento"}',
  members    JSONB DEFAULT '{"mes3":"1 semana gratis","mes6":"15% descuento cuota","mes12":"1 mes gratis + remera LIFT"}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO commissions_config DEFAULT VALUES;

-- ── ENCUESTAS ─────────────────────────────────────────────────
CREATE TABLE surveys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT,
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  date       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── NUTRI CLIENTS ─────────────────────────────────────────────
CREATE TABLE nutri_clients (
  id               SERIAL PRIMARY KEY,
  nutritionist_id  UUID REFERENCES staff(id) ON DELETE CASCADE,
  member_id        UUID REFERENCES members(id) ON DELETE CASCADE,
  plan_text        TEXT,
  notes            TEXT,
  next_appointment TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, member_id)
);

-- ── NUTRI APPOINTMENTS ────────────────────────────────────────
CREATE TABLE nutri_appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID REFERENCES staff(id) ON DELETE CASCADE,
  member_id        UUID REFERENCES members(id) ON DELETE CASCADE,
  member_name      TEXT,
  date             DATE NOT NULL,
  time             TIME NOT NULL,
  notes            TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','done','cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
