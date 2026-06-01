-- ============================================================
-- LIFT Fitness Center — Datos demo (seed)
-- Contraseñas son bcrypt hash de los valores originales.
-- Para regenerarlas ejecutá: npm run seed
-- ============================================================

-- ── STAFF ────────────────────────────────────────────────────
-- Contraseñas originales: Lift2025# | recep2025 | trainer2025 | nutri2025
INSERT INTO staff (id, email, password, name, role, pin) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@lift.com',      '$2b$10$YourHashHereReplaceWithSeedScript', 'Gerencia Lift',                    'admin',        '0000'),
  ('00000000-0000-0000-0000-000000000002', 'recep@lift.com',      '$2b$10$YourHashHereReplaceWithSeedScript', 'Recepcionista Turno Mañana',       'reception',    '1111'),
  ('00000000-0000-0000-0000-000000000003', 'recep2@lift.com',     '$2b$10$YourHashHereReplaceWithSeedScript', 'Recepcionista Turno Tarde',        'reception',    '2222'),
  ('00000000-0000-0000-0000-000000000004', 'trainer@lift.com',    '$2b$10$YourHashHereReplaceWithSeedScript', 'Lic. Martínez',                    'trainer',      '3333'),
  ('00000000-0000-0000-0000-000000000005', 'nutricion@lift.com',  '$2b$10$YourHashHereReplaceWithSeedScript', 'Nutricionista Lift',               'nutritionist', '4444');

-- ── MEMBERS ───────────────────────────────────────────────────
-- Contraseñas originales: 1234 para todos los socios demo
INSERT INTO members (id, name, email, password, pin, phone, dni, nationality, dob, address, weight, height, blood_type, med_coverage, med_clearance, plan, pay_method, insc_date, last_payment, status, frozen, debt, referral_code) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Carlos Mejía',  'carlos@mail.com',  '$2b$10$YourHashHereReplaceWithSeedScript', '1234', '7890-1234', '01234567-8', 'El Salvador', '1990-05-15', 'Col. Escalón, San Salvador',  82, 178, 'A+',  'ISSS',    true,  'Oro',      'Efectivo',           '2024-11-10', '2025-05-01', 'active',   false, 0,  'LIFT-0001'),
  ('00000000-0000-0000-0001-000000000002', 'Ana Flores',    'ana@mail.com',     '$2b$10$YourHashHereReplaceWithSeedScript', '5678', '7777-8888', '02345678-9', 'El Salvador', '1995-08-22', 'Col. San Benito, San Salvador', 61, 165, 'O+',  'Privado', true,  'Plata',    'Tarjeta de crédito', '2025-01-15', '2025-04-28', 'active',   false, 0,  'LIFT-0002'),
  ('00000000-0000-0000-0001-000000000003', 'Roberto Díaz',  'roberto@mail.com', '$2b$10$YourHashHereReplaceWithSeedScript', '9999', '7654-3210', '03456789-0', 'El Salvador', '1988-12-01', 'Soyapango, San Salvador',       95, 185, 'B+',  'ISSS',    false, 'Bronce',   'Efectivo',           '2025-03-08', null,         'inactive', false, 25, 'LIFT-0003'),
  ('00000000-0000-0000-0001-000000000004', 'María López',   'maria@mail.com',   '$2b$10$YourHashHereReplaceWithSeedScript', '2468', '7123-4567', '04567890-1', 'El Salvador', '1993-03-17', 'Col. Médica, San Salvador',     58, 162, 'AB-', 'Privado', true,  'Diamante', 'Tarjeta de crédito', '2024-08-01', '2025-05-05', 'active',   false, 0,  'LIFT-0004');

-- ── CLASES ────────────────────────────────────────────────────
INSERT INTO classes (type, trainer, day, time, duration, capacity) VALUES
  ('Yoga',      'Lic. Martínez', 'Lunes',    '08:00', 60, 15),
  ('Spinning',  'Lic. Martínez', 'Martes',   '07:00', 45, 10),
  ('Pilates',   'Lic. Martínez', 'Miércoles','18:00', 60, 12),
  ('Funcional', 'Lic. Martínez', 'Jueves',   '09:00', 50, 20),
  ('Boxeo',     'Lic. Martínez', 'Viernes',  '19:00', 60, 8);

-- ── INSCRIPCIONES ─────────────────────────────────────────────
INSERT INTO class_enrollments (class_id, member_id, status) VALUES
  (1, '00000000-0000-0000-0001-000000000001', 'enrolled'),
  (1, '00000000-0000-0000-0001-000000000002', 'enrolled'),
  (2, '00000000-0000-0000-0001-000000000004', 'enrolled'),
  (3, '00000000-0000-0000-0001-000000000002', 'enrolled'),
  (3, '00000000-0000-0000-0001-000000000004', 'enrolled'),
  (4, '00000000-0000-0000-0001-000000000001', 'enrolled'),
  (4, '00000000-0000-0000-0001-000000000003', 'enrolled'),
  (4, '00000000-0000-0000-0001-000000000004', 'enrolled');

-- ── MÁQUINAS ──────────────────────────────────────────────────
INSERT INTO machines (name, category, description, usage_instr, video_url) VALUES
  ('Press de Banca',   'Pecho',   'Pectoral mayor, deltoides anterior y tríceps.',   '1. Regular asiento. 2. Agarre ancho. 3. Bajar controlado.',     'https://www.youtube.com/watch?v=rT7DgCr-3pg'),
  ('Polea Alta',       'Espalda', 'Dorsal ancho, bíceps y redondo mayor.',            '1. Ajustar rodillas. 2. Agarre pronado. 3. Tirar al pecho.',     'https://www.youtube.com/watch?v=EUIri47Epcg'),
  ('Prensa de Piernas','Piernas', 'Cuádriceps, isquiotibiales y glúteos.',            '1. Ajustar respaldo. 2. Pies al ancho de hombros.',              'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Cinta Trotadora',  'Cardio',  'Cardio, resistencia cardiovascular.',              '1. Iniciar a velocidad baja. 2. Aumentar gradualmente.',         ''),
  ('Remo Sentado',     'Espalda', 'Romboides, trapecio medio y bíceps.',              '1. Sentarse erguido. 2. Tirar con codos atrás.',                 '');

-- ── GASTOS EJEMPLO ────────────────────────────────────────────
INSERT INTO expenses (date, category_id, description, amount) VALUES
  ('2025-05-01', 1, 'Alquiler mayo',      1800.00),
  ('2025-05-03', 2, 'Luz y gas',           320.00),
  ('2025-05-05', 3, 'Staff mayo',         2500.00),
  ('2025-05-08', 4, 'Reparación cinta',    150.00);

-- ── COMUNICADOS ───────────────────────────────────────────────
INSERT INTO announcements (title, body, target, author) VALUES
  ('Nuevo horario de pilates', 'A partir del lunes, la clase de pilates se dicta a las 18hs.', 'Todos', 'Gerencia Lift'),
  ('Mantenimiento lunes',      'El lunes 20 el gimnasio cierra a las 18hs.',                  'Todos', 'Gerencia Lift');

-- ── PAGOS EJEMPLO ─────────────────────────────────────────────
INSERT INTO payments (member_id, member_name, amount, plan, card_type, status, transaction_id, date) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Carlos Mejía', 50, 'Oro',      'Efectivo',          'approved', 'TX-992882', '2025-05-01'),
  ('00000000-0000-0000-0001-000000000004', 'María López',  75, 'Diamante', 'Tarjeta de crédito','approved', 'TX-882331', '2025-05-05'),
  ('00000000-0000-0000-0001-000000000002', 'Ana Flores',   35, 'Plata',    'Tarjeta de crédito','approved', 'TX-771004', '2025-04-28'),
  ('00000000-0000-0000-0001-000000000003', 'Roberto Díaz', 25, 'Bronce',   'Efectivo',          'pending',  'TX-660001', '2025-03-31');

-- ── DESCUENTOS ────────────────────────────────────────────────
INSERT INTO discounts (name, percentage, plan) VALUES
  ('Estudiantes', 15, 'Todos'),
  ('Jubilados',   20, 'Bronce');

-- ── MENÚ CAFETERÍA ────────────────────────────────────────────
INSERT INTO cafeteria_menu (name, category, price, image, options, points_per_purchase) VALUES
  ('Agua 500ml',      'Bebidas',        1.00, '💧', '[]',                                   2),
  ('Proteína Shake',  'Bebidas',        3.50, '🥤', '["Chocolate","Vainilla","Fresa"]',      7),
  ('Café americano',  'Bebidas calientes',1.50,'☕', '["Grande","Mediano","Pequeño"]',       3),
  ('Sandwich pollo',  'Comidas',        4.00, '🥪', '["Pan integral","Pan blanco","Sin pan"]',8),
  ('Ensalada verde',  'Comidas',        3.00, '🥗', '["Con pollo","Con atún","Solo"]',       6),
  ('Banana',          'Snacks',         0.50, '🍌', '[]',                                   1),
  ('Barra proteica',  'Snacks',         2.50, '🍫', '["Chocolate","Mantequilla","Frutos rojos"]',5),
  ('Jugo natural',    'Bebidas',        2.00, '🍊', '["Naranja","Sandía","Melón","Piña"]',   4);

-- ── SHOP ──────────────────────────────────────────────────────
INSERT INTO shop_products (name, category, price, points, image, stock, type) VALUES
  ('Remera LIFT',                  'Indumentaria', 25.00, 2500, '👕', 10, 'dinero'),
  ('1 mes gratis',                 'Membresía',     0.00, 5000, '⭐', 99, 'puntos'),
  ('Botella LIFT',                 'Accesorios',   15.00, 1500, '🍶',  5, 'mixto'),
  ('Clase Personal (1 sesión)',    'Servicios',    20.00, 2000, '🏋️', 99, 'puntos'),
  ('Descuento 20% próxima cuota', 'Membresía',     0.00, 3000, '🏷️', 99, 'puntos'),
  ('Evaluación física gratis',     'Servicios',    0.00, 1000, '📊',  99, 'puntos');

-- ── POSTS COMUNIDAD ───────────────────────────────────────────
INSERT INTO community_posts (author_id, author_name, author_role, content, date) VALUES
  ('00000000-0000-0000-0000-000000000001', 'LIFT Fitness Center', 'admin',   '¡Bienvenidos a la comunidad LIFT Fitness Center San Salvador! 🔥', '2025-05-01'),
  ('00000000-0000-0000-0000-000000000004', 'Lic. Martínez',       'trainer', 'Tip de la semana: La consistencia supera a la intensidad. 💪',      '2025-05-10');

-- ── RETOS ─────────────────────────────────────────────────────
INSERT INTO community_challenges (title, description, type, points, start_date, end_date) VALUES
  ('30 días de plank',     'Realizá plank diario durante 30 días. Empezá con 30s e incrementá 10s por día.', 'mensual',  50, '2025-05-01', '2025-05-31'),
  ('Reto de sentadillas',  '100 sentadillas en una sola sesión. Grabate y compartí en comunidad.',           'semanal',  30, '2025-05-19', '2025-05-25');

-- ── TRAINER STUDENTS ──────────────────────────────────────────
INSERT INTO trainer_students (trainer_id, member_id, goal, level, notes) VALUES
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000001', 'Pérdida de grasa + masa muscular', 'Intermedio', 'Lesión leve en hombro derecho.'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000004', 'Tonificación y flexibilidad',      'Avanzado',   'Alta motivación.');

-- ── PROGRESO FÍSICO ───────────────────────────────────────────
INSERT INTO physical_progress (member_id, trainer_id, date, weight, body_fat, muscle, waist, chest, arm, notes) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000004', '2025-01-01', 87, 22, 38, 94, 102, 36, 'Inicio'),
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000004', '2025-03-01', 84, 20, 39, 91, 103, 37, 'Buen progreso'),
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000004', '2025-05-01', 82, 18, 40, 89, 104, 38, 'Excelente'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000004', '2025-01-01', 62, 26, 32, 68, 90,  27, 'Inicio'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000004', '2025-04-01', 58, 22, 34, 64, 91,  28, 'Gran mejora');

-- ── LOG DE ACCESO ─────────────────────────────────────────────
INSERT INTO access_log (member_id, member_name, type, method, allowed, date, time) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Carlos Mejía', 'entry', 'QR',  true,  '2025-05-19', '08:15:00'),
  ('00000000-0000-0000-0001-000000000004', 'María López',  'entry', 'QR',  true,  '2025-05-19', '08:42:00'),
  ('00000000-0000-0000-0001-000000000003', 'Roberto Díaz', 'entry', 'PIN', false, '2025-05-19', '09:10:00'),
  ('00000000-0000-0000-0001-000000000002', 'Ana Flores',   'entry', 'QR',  true,  '2025-05-19', '10:05:00');
