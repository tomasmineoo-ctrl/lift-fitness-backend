# Deploy a Railway — URL pública fija y permanente

Railway es hosting gratuito para Node.js. Una vez desplegado, la URL nunca cambia.
No necesitás el script de inicio ni el túnel para acceso externo.

---

## Paso 1 — Crear cuenta Railway (1 vez)

1. Ir a https://railway.app
2. Registrarse con GitHub o email (gratis)

---

## Paso 2 — Instalar Railway CLI (1 vez)

Abrir PowerShell como administrador y ejecutar:
```
npm install -g @railway/cli
```

---

## Paso 3 — Login desde consola (1 vez)

En PowerShell, desde la carpeta lift-backend:
```
cd "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-backend"
railway login
```
(abre el browser, hacés click en Authorize)

---

## Paso 4 — Crear proyecto y configurar variables de entorno

```
railway init
```
Elegir: Create a new project → nombre: "lift-fitness"

Luego configurar las variables de entorno (copiar del archivo .env):
```
railway variables set SUPABASE_URL=https://usbdbcpbcjovsqmpkrnm.supabase.co
railway variables set SUPABASE_KEY=<tu_service_role_key>
railway variables set JWT_SECRET=<tu_jwt_secret>
railway variables set JWT_EXPIRES_IN=7d
railway variables set NODE_ENV=production
railway variables set FRONTEND_PATH=../../lift-frontend
```

---

## Paso 5 — Copiar frontend al backend para el deploy

Railway solo sube la carpeta lift-backend. Hay que copiar el frontend:

En PowerShell:
```
Copy-Item "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-frontend\index.html" `
          "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-backend\public\"
Copy-Item "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-frontend\api-layer.js" `
          "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-backend\public\"
```

Y agregar la variable:
```
railway variables set FRONTEND_PATH=./public
```

---

## Paso 6 — Deploy

```
cd "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-backend"
railway up
```

Railway sube el código, ejecuta `npm run build` (compila TypeScript) y lanza `node dist/index.js`.

---

## Paso 7 — Obtener la URL fija

```
railway domain
```

O desde el dashboard de Railway → Settings → Domains → Generate Domain

La URL será algo como: `https://lift-fitness-production.up.railway.app`

**Esta URL nunca cambia.** Compartila con quien quieras.

---

## Ventajas vs túnel Cloudflare

| | Túnel Cloudflare | Railway |
|--|--|--|
| URL fija | ❌ cambia al reiniciar | ✅ siempre igual |
| Necesita PC prendida | ✅ sí | ❌ no |
| Gratis | ✅ | ✅ (500hs/mes) |
| Setup inicial | 0 min | ~10 min |

---

## Para desarrollo local (sin Railway)

Seguir usando `INICIAR LIFT.bat` — arranca todo automáticamente.
