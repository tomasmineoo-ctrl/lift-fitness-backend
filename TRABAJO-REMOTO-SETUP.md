# 🚀 Setup para Trabajar Remotamente - LIFT Fitness Backend

## ✅ Estado Actual
- **Repositorio GitHub creado**: https://github.com/tomasmineoo-ctrl/lift-fitness-backend
- **Código pusheado**: Todas las migraciones, seed.ts, y configs actualizadas
- **Railway deployado**: Funcionando correctamente con auto-deploy

---

## 📱 En tu Notebook (Clonación)

### Paso 1: Clonar el repositorio
```powershell
cd "C:\Users\TU_USUARIO\Desktop"  # o donde quieras
git clone https://github.com/tomasmineoo-ctrl/lift-fitness-backend.git
cd lift-fitness-backend
```

### Paso 2: Instalar dependencias
```powershell
npm install
```

### Paso 3: Configurar variables de entorno
Copia `.env.example` a `.env`:
```powershell
Copy-Item ".env.example" ".env"
```

Edita `.env` con tus credenciales de Supabase (son las mismas en ambas máquinas):
```
SUPABASE_URL=https://usbdbcpbcjovsqmpkrnm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYmRiY3BiY2pvdnNxbXBrcm5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ2NTE3MywiZXhwIjoyMDk1MDQxMTczfQ.4NT82f2jaQKXBYc8hfh13HaLA4I-nHuK5Rz5Q6Gs0k4
JWT_SECRET=lift-fitness-jwt-secret-2025-secure-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Paso 4: Probar localmente (opcional)
```powershell
npm run dev
# La app estará en http://localhost:3000
```

---

## 🔄 Flujo de Trabajo Remoto

### Desde tu Desktop:
```powershell
cd "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE"

# Ver cambios
git status

# Hacer cambios en los archivos...

# Stagear cambios
git add .

# Crear commit
git commit -m "Tu mensaje descriptivo"

# Subir a GitHub (Railway hará auto-deploy automáticamente)
git push origin main
```

### Desde tu Notebook:
```powershell
cd "C:\Users\TU_USUARIO\Desktop\lift-fitness-backend"

# Traer los cambios del Desktop
git pull origin main

# Hacer tus cambios...

# Hacer commit
git add .
git commit -m "Tu mensaje descriptivo"

# Subir cambios
git push origin main
# Railway automáticamente deploya
```

---

## 🚀 Verificar que funciona

### En localhost (Notebook):
```powershell
npm run dev
# Accede a http://localhost:3000
```

### En producción (ambas máquinas pueden ver):
```powershell
# Testear login
curl -X POST "https://ctrlgym.org/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@lift.com","password":"Lift2025#"}' `
  -u "SEBASTIAN:TOMASYSEBASTIAN"
```

---

## 📋 Comandos Útiles

### Ver commits recientes
```powershell
git log --oneline -10
```

### Ver cambios antes de hacer commit
```powershell
git diff
```

### Descartar cambios locales
```powershell
git checkout -- .
```

### Crear una rama nueva para experimental
```powershell
git checkout -b tu-rama-feature
# ... haz cambios ...
git push origin tu-rama-feature
```

### Ver ramas disponibles
```powershell
git branch -a
```

---

## 🔐 Variables de Entorno (Railway)

Ya están configuradas en Railway:
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ JWT_SECRET
- ✅ DEMO_USER (SEBASTIAN)
- ✅ DEMO_PASS (TOMASYSEBASTIAN)
- ✅ FRONTEND_PATH (./public)

Si necesitas cambiarlas:
```powershell
cd "C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\lift-backend"
railway variables set KEY=value
```

---

## 🎯 Demo User Credentials

**Credenciales de Acceso al Dominio:**
- Usuario: SEBASTIAN
- Contraseña: TOMASYSEBASTIAN

**Credenciales Demo (ya pre-llenadas):**
1. **Admin**: admin@lift.com / Lift2025#
2. **Recepción**: recep@lift.com / recep2025
3. **Entrenador**: trainer@lift.com / trainer2025
4. **Nutricionista**: nutricion@lift.com / nutri2025
5. **Socio**: carlos@mail.com / 1234

---

## 🆘 Troubleshooting

### Error: "SUPABASE_URL no está definida"
→ Verifica que `.env` existe y tiene las variables correctas

### Error: "npm: comando no encontrado"
→ Node.js no está instalado. Descarga desde https://nodejs.org/

### Los cambios no aparecen en producción
→ Verifica que hiciste `git push origin main` y espera 1-2 minutos para el deploy

### Conflicto de merge
→ Pide ayuda si ocurre. Generalmente: `git pull origin main` primero antes de pushear

---

## 📞 Links Útiles

- **GitHub Repo**: https://github.com/tomasmineoo-ctrl/lift-fitness-backend
- **Railway Dashboard**: https://railway.app
- **Supabase Console**: https://supabase.com/dashboard
- **Demo en vivo**: https://ctrlgym.org
- **API Docs**: https://ctrlgym.org/api/*

---

**¡Listo para trabajar remotamente! 🎉**
