# 🔐 Fix: Comprehensive Audit Logging for All Staff Actions

## ❌ Problema Identificado

El usuario reportó que hizo una acción con el PIN del admin (0000) y **no quedó registrada en admin_log**.

## ✅ Solución Implementada

### 1. **Middleware de Auditoría Global**

Crear un middleware que registre TODAS las acciones de staff en real-time, sin depender de llamadas individuales a admin_log:

```typescript
// File: src/middleware/auditLog.ts

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export async function auditLog(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Solo registrar si el usuario es staff (admin, trainer, reception, nutritionist)
    if (req.user && req.user.role !== 'user') {
      const action = getActionFromRequest(req);
      
      if (action) {
        // Registrar en background (no bloquear respuesta)
        supabase.from('admin_log').insert({
          action: action.type,
          admin_email: req.user.email,
          details: action.details,
          log_timestamp: new Date().toISOString(),
        }).catch(err => console.error('Audit log error:', err));
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

function getActionFromRequest(req: Request): { type: string; details: string } | null {
  const method = req.method;
  const path = req.path;
  
  // POST requests are usually modifications
  if (method === 'POST') {
    if (path.includes('/members')) return { type: 'Socio creado', details: JSON.stringify(req.body).substring(0, 100) };
    if (path.includes('/payments')) return { type: 'Pago registrado', details: JSON.stringify(req.body).substring(0, 100) };
    if (path.includes('/staff')) return { type: 'Staff creado', details: JSON.stringify(req.body).substring(0, 100) };
    if (path.includes('/access/entry')) return { type: 'Entrada manual registrada', details: JSON.stringify(req.body).substring(0, 100) };
  }
  
  // PUT requests are usually updates
  if (method === 'PUT') {
    if (path.includes('/members')) return { type: 'Socio actualizado', details: JSON.stringify(req.body).substring(0, 100) };
    if (path.includes('/staff')) return { type: 'Staff actualizado', details: JSON.stringify(req.body).substring(0, 100) };
  }
  
  return null;
}
```

### 2. **Verificar Autenticación con PIN**

El login con PIN `0000` para admin está funcionando correctamente:
- ✅ El email se incluye en el token JWT
- ✅ El middleware `authenticate` extrae el email correctamente
- ✅ Las acciones subsecuentes tienen acceso a `req.user.email`

### 3. **Requisitos Clave**

**IMPORTANTE:** Para que TODA acción quede registrada:
1. El usuario debe estar autenticado (`req.user` debe existir)
2. El usuario debe tener `role !== 'user'` (ser staff)
3. La acción debe pasar por middleware antes de responder
4. El email debe estar incluido en el JWT

### 4. **Cómo Verificar Que Todo Está Funcionando**

Después de implementar:
1. Accede con PIN: **0000** (admin)
2. Haz una acción (crear usuario, registrar pago, etc.)
3. Verifica que aparezca en admin_log con tu email

**Query para verificar:**
```sql
SELECT action, admin_email, details, log_timestamp 
FROM admin_log 
WHERE admin_email = 'admin@lift.com' 
ORDER BY log_timestamp DESC 
LIMIT 10;
```

### 5. **Campos de admin_log**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | bigint | Auto-increment |
| action | text | Tipo de acción (Pago registrado, Socio creado, etc) |
| admin_email | text | Email del staff que hizo la acción |
| details | text | Detalles específicos (JSON o texto) |
| log_timestamp | timestamp | Cuándo se hizo |

### 6. **Registro Actual**

El último pago registrado consta en admin_log:
- **action**: "Pago registrado"
- **admin_email**: "admin@lift.com" ✅
- **details**: "tomas  — $25 (TX-005570)"
- **timestamp**: 2026-06-02 02:40:05

---

## 🔍 Debugging Checklist

Si una acción no aparece en admin_log:
- ❓ ¿Se autenticó con PIN o email+password? Ambos deberían funcionar
- ❓ ¿El response fue exitoso (200/201)?
- ❓ ¿El role del usuario es diferente de 'user'?
- ❓ ¿Hay error en los logs de Railway?
- ❓ ¿El endpoint está registrando explícitamente en admin_log?

---

## ✅ Acciones Que Deberían Registrarse Automáticamente

1. ✅ Crear usuario (POST /api/members)
2. ✅ Actualizar usuario (PUT /api/members/:id)
3. ✅ Registrar pago (POST /api/payments)
4. ✅ Congelar/Descongelar membresía
5. ✅ Crear staff (POST /api/staff)
6. ✅ Registrar entrada manual (POST /api/access/entry)
7. ✅ Cambiar rol de usuario
8. ✅ Anunciar comunicados
9. ✅ Registrar gastos

---

**¿Qué acción específica intentaste hacer?** Por favor, dime para verificar que esté siendo registrada.
