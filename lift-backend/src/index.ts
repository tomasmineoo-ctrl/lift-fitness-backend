import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { saveBackupToStorage } from './routes/backup';

const app = express();

// Trust proxy (necesario para rate-limit correcto detrás de Cloudflare / Railway)
app.set('trust proxy', 1);

// Basic Auth Middleware para proteger el dominio personalizado
const demoUsername = process.env.DEMO_USER || 'SEBASTIAN';
const demoPassword = process.env.DEMO_PASS || 'TOMASYSEBASTIAN';

if (demoPassword) {
  app.use((req, res, next) => {
    // Saltar autenticación para rutas de API
    if (req.path.startsWith('/api/')) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="LIFT Fitness"');
      return res.status(401).send('Autenticación requerida');
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    // Validar usuario y contraseña
    if (username !== demoUsername || password !== demoPassword) {
      res.setHeader('WWW-Authenticate', 'Basic realm="LIFT Fitness"');
      return res.status(401).send('Usuario o contraseña incorrectos');
    }

    next();
  });
}

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Rate limit global: 300 req/min por IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' },
}));

app.get('/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }));

// API routes
registerRoutes(app);

// Servir el frontend — en Railway usa FRONTEND_PATH env var, localmente ../lift-frontend
const FRONTEND_DIR = process.env.FRONTEND_PATH
  ? path.resolve(process.env.FRONTEND_PATH)
  : path.join(__dirname, '../../lift-frontend');

app.use(express.static(FRONTEND_DIR));

// SPA catch-all
app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`LIFT Backend  → http://localhost:${PORT}`);
  console.log(`LIFT Frontend → ${FRONTEND_DIR}`);
});

// ── Backup automático: todos los días a las 3:00 AM ──────────
cron.schedule('0 3 * * *', async () => {
  console.log('[BACKUP] Iniciando backup automático nocturno...');
  try {
    const filename = await saveBackupToStorage();
    console.log(`[BACKUP] ✅ Guardado: ${filename}`);
  } catch (err) {
    console.error('[BACKUP] ❌ Error en backup automático:', err);
  }
}, { timezone: 'America/El_Salvador' });
