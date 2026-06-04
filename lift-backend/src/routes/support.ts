import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── DOCUMENTACIÓN COMPLETA DEL SISTEMA LIFT ─────────────────────────────────

const LIFT_SYSTEM_DOCS = `
## SISTEMA LIFT FITNESS — Documentación completa por módulo y rol

### ROLES DEL SISTEMA
- **admin**: Acceso total al sistema. Ve todos los módulos.
- **reception**: Recepcionista. Cobra cuotas, gestiona socios, controla acceso.
- **trainer**: Entrenador. Gestiona sus alumnos, agenda, progreso físico.
- **nutritionist**: Nutricionista. Gestiona clientes, citas y planes nutricionales.
- **user**: Socio del gimnasio. Ve su perfil, plan, puntos, clases y comunicaciones.

---

## MÓDULOS — ADMIN (acceso completo)

### 📊 Dashboard
- Muestra resumen general: socios activos, bloqueados, ingresos del mes, accesos del día.
- Gráfico de ingresos de los últimos meses.
- Indicadores: tasa de retención, socios en riesgo, ingresos proyectados, gente en el gym ahora.
- Si el rol es recepción, muestra el Panel de Cuotas del día con socios que pagaron, pendientes, congelados y deudores.

### 💰 Finanzas
- **Resumen financiero**: ingresos totales, gastos, balance neto del mes.
- **Ingresos**: listado de todos los pagos aprobados, con filtros por fecha, plan, estado.
- **Gastos**: registro de gastos del gimnasio por categoría (alquiler, servicios, equipamiento, etc.).
- **Reportes**: exportar datos a CSV. Ver proyecciones.

### 👥 Socios
- **Usuarios**: listado completo de socios. Buscar por nombre, email, plan, estado.
- **Crear socio**: formulario con nombre, email, DNI, teléfono, plan, fecha de pago.
- **Ver perfil de socio**: historial de pagos, estado de cuota, accesos, plan, deuda, congelamientos, puntos.
- **Editar socio**: modificar datos, cambiar plan, ajustar deuda.
- **Congelados**: socios con membresía pausada temporalmente. Ver fecha de inicio y fin del congelamiento.
- **Estados de cuota**: activo, en período de gracia, advertencia, bloqueado, congelado.

### 📅 Itinerario / Agenda & Clases
- Listado de clases programadas por día de la semana.
- Crear clase: nombre, día, horario, capacidad máxima, entrenador asignado.
- Ver reservas de cada clase: quiénes están anotados.
- Gestionar reservas: agregar o quitar socios de una clase.

### 🏋️ Mantenimiento / Máquinas
- Inventario de máquinas y equipamiento del gimnasio.
- Estado de cada máquina: operativa, en mantenimiento, fuera de servicio.
- Registrar incidencias o reparaciones.

### 📢 Comunicación
- **Comunicados**: publicar anuncios visibles para todos los socios o roles específicos.
- **Mensajes masivos**: enviar mensajes a grupos de socios (por plan, estado, etc.).
- **Chat socios**: mensajes directos entre staff y socios individuales.

### 🏆 Fidelización
- **Sistema de Puntos**: configurar puntos por pago, asistencia, referidos. Ver ranking de socios.
- **Shop LIFT**: productos canjeables con puntos. Gestionar catálogo.
- **Retos & Comunidad**: crear desafíos fitness para socios. Gestionar comunidad.
- **Referidos**: programa de referidos. Ver quién refirió a quién, recompensas otorgadas.
- **Comisiones & Metas**: metas de venta para recepcionistas. Ver comisiones ganadas.

### ⚙️ Gestión
- **Staff & Roles**: crear y gestionar cuentas de staff (recepción, entrenadores, nutricionistas). Asignar roles.
- **Control de Acceso**: ver log de entradas y salidas en tiempo real. Historial de accesos por socio.
- **Notificaciones**: configurar alertas automáticas (cuotas vencidas, cumpleaños, etc.).
- **PINs de socios**: ver y gestionar los PINs de acceso de cada socio.
- **Backups**: crear y descargar respaldos de la base de datos del sistema.

### 📋 Historial de acciones
- Log de auditoría completo: qué usuario hizo qué acción y cuándo.
- Filtros por tipo de acción, usuario, fecha.
- Útil para detectar cambios no autorizados o revisar operaciones pasadas.

---

## MÓDULOS — RECEPCIÓN

### 💵 Ventanilla de Cobro (cobroDiario)
- Vista principal del recepcionista para cobrar cuotas del día.
- Buscar socio, ver su estado de pago, registrar pago manual.
- Muestra socios pendientes de pago ordenados por urgencia.
- Registrar pagos en efectivo, transferencia u otros métodos.

### 🔒 Cierre de Turno
- Resumen del turno: total cobrado, cantidad de pagos, método de pago.
- Confirmar cierre del turno con firma o PIN del recepcionista.

### Dashboard, Socios, Cuotas, Agenda
- Mismas funcionalidades que admin pero con permisos limitados (no puede borrar socios ni ver finanzas completas).

### 💎 Mis Metas & Comisión
- Ver las metas de venta asignadas al recepcionista.
- Progreso hacia la meta del mes.
- Comisión ganada según pagos cobrados.

---

## MÓDULOS — ENTRENADOR (trainer)

### 📊 Mi Dashboard
- Resumen de sus alumnos asignados: activos, en progreso, clases programadas.

### 👥 Mis Alumnos
- Listado de socios asignados a este entrenador.
- Ver perfil, plan de entrenamiento, progreso físico.

### 📈 Progreso físico
- Registrar y ver métricas físicas de cada alumno: peso, medidas, fotos de progreso.
- Historial de evolución.

### 📅 Agenda / Reservar a Alumno
- Ver clases del gimnasio.
- Reservar una clase para un alumno asignado.

### 💎 Mis Beneficios & Estadísticas
- Ver beneficios del contrato como entrenador.
- Estadísticas de alumnos activos, retención, clases impartidas.

### 📲 Mi Credencial QR
- Código QR personal del entrenador para registrar su acceso al gimnasio.

---

## MÓDULOS — NUTRICIONISTA (nutritionist)

### 📊 Mi Dashboard
- Resumen de clientes, citas del día, planes activos.

### 👥 Mis Clientes
- Listado de socios asignados para seguimiento nutricional.

### 📅 Agenda de Citas
- Calendario de consultas nutricionales.
- Crear, editar y cancelar citas con clientes.

### 📋 Planes Nutricionales
- Crear y gestionar planes de alimentación personalizados por cliente.
- Ver historial de planes anteriores.

### 📲 Mi Credencial QR
- Código QR personal para registrar acceso.

---

## MÓDULOS — SOCIO (user)

### 👤 Mi Perfil
- Ver y editar datos personales: nombre, email, teléfono, foto.

### 📲 Mi QR & PIN
- Código QR personal para registrar entrada al gimnasio.
- PIN numérico de acceso (alternativa al QR).
- Para regenerar el PIN: ir a Mi QR & PIN → botón "Regenerar PIN".

### ⭐ Mi Plan
- Ver el plan de membresía activo, precio, fecha de vencimiento.
- Historial de renovaciones.

### 🏆 Mis Puntos
- Saldo de puntos acumulados.
- Historial de puntos ganados y canjeados.
- Cómo ganar puntos: pagar la cuota a tiempo, asistir al gym, referir amigos.

### 🤝 Referir Amigos
- Código de referido personal.
- Ver amigos referidos y puntos ganados por referidos.

### ☕ Cafetería & 🛍️ Shop LIFT
- Ver productos disponibles.
- Canjear puntos por productos del shop.

### 🔥 Comunidad Fitness
- Feed de publicaciones de la comunidad del gimnasio.
- Publicar, comentar, reaccionar.
- Ver retos activos y participar.

### 📅 Clases & Reservas
- Ver calendario de clases disponibles.
- Reservar un lugar en una clase.
- Cancelar reserva.

### 📋 Mi Rutina
- Ver rutina de entrenamiento asignada por el entrenador.

### 📢 Anuncios & Mensajes & Notificaciones
- Ver comunicados del gimnasio.
- Mensajes directos con staff.
- Notificaciones del sistema (vencimiento de cuota, confirmación de reserva, etc.).

---

## PREGUNTAS FRECUENTES

**¿Cómo cobro la cuota de un socio?**
Ir a "Ventanilla de Cobro" (rol recepción) o desde "Socios" → buscar socio → registrar pago.

**¿Cómo congelo un socio?**
Ir a Socios → buscar el socio → en su perfil → opción "Congelar membresía" → ingresar fecha de inicio y fin.

**¿Cómo agrego una clase nueva?**
Ir a Agenda & Clases → botón "Nueva clase" → completar nombre, día, horario, capacidad y entrenador.

**¿Cómo veo quién está en el gym ahora?**
Dashboard → indicador "En la sala" o ir a Control de Acceso → ver entradas sin salida registrada.

**¿Cómo exporto datos a Excel/CSV?**
En la sección Socios o Pagos → botón "Exportar CSV" en la parte superior de la tabla.

**¿Cómo creo un staff nuevo (recepcionista, entrenador)?**
Gestión → Staff & Roles → "Nuevo staff" → completar datos y asignar rol.

**¿Cómo veo el historial de accesos de un socio?**
Socios → buscar socio → en su perfil → sección "Accesos".

**¿Cómo regenero el PIN de un socio?**
Socios → buscar socio → en su perfil → "Regenerar PIN". El socio también puede hacerlo desde Mi QR & PIN.

**¿Dónde configuro las notificaciones automáticas?**
Gestión → Notificaciones → activar/desactivar alertas de cuota vencida, cumpleaños, etc.

**¿Cómo hago un backup?**
Gestión → Backups → "Crear backup" → descargar el archivo generado.

**¿Cómo veo los ingresos del mes?**
Finanzas → Resumen financiero. También en Dashboard → tarjeta de ingresos del mes.

**¿Cómo asigno puntos manualmente a un socio?**
Fidelización → Sistema de Puntos → buscar socio → "Ajustar puntos".

**¿Cómo cierro el turno?**
Cierre de Turno → ver resumen → confirmar cierre.
`;

// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(role: string, name: string, currentView?: string): string {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    reception: 'Recepcionista',
    trainer: 'Entrenador',
    nutritionist: 'Nutricionista',
    user: 'Socio',
  };

  const roleLabel = roleLabels[role] ?? role;
  const viewContext = currentView
    ? `\nEl usuario está actualmente en la sección: "${currentView}". Priorizá información relevante a esa sección si aplica.`
    : '';

  return `Sos el agente de soporte técnico 24/7 de LIFT Fitness, un sistema de gestión de gimnasios desarrollado por ctrlgym.org.

## Usuario actual
- Nombre: ${name}
- Rol: ${roleLabel} (${role})
${viewContext}

## Tu función
Ayudás a los usuarios del sistema LIFT a:
- Entender cómo usar cada funcionalidad del sistema
- Encontrar dónde está cada opción o módulo
- Resolver dudas operativas ("¿cómo hago X?", "¿dónde está Y?")
- Entender qué hace cada sección

## Reglas de comportamiento
- Hablá como una persona real, cálida y cercana — no como un manual ni una computadora 🤗
- Usá emojis en tus respuestas para que sean más amenas y fáciles de leer
- Respondé **corto y al punto** — máximo 4-5 líneas por respuesta. Si necesitás listar pasos, que sean pocos y concisos
- Si la respuesta tiene pasos, usá lista numerada con emojis
- Si hay una ruta de navegación, indicala así: Sección → Subsección → Acción
- Solo mostrá funcionalidades disponibles para el rol "${role}" del usuario
- Si algo escapa a tus capacidades, decilo con onda y sugerí que escriban a ctrlgym.org 😊
- Nunca inventes funcionalidades que no existan en la documentación
- Empezá las respuestas de forma variada y natural, no siempre igual

## Documentación del sistema
${LIFT_SYSTEM_DOCS}`;
}

router.post('/chat', authenticate, async (req: Request, res: Response) => {
  const { messages, currentView } = req.body as {
    messages: AnthropicMessage[];
    currentView?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'El agente de soporte no está configurado aún. Contactá a ctrlgym.org.',
    });
  }

  const user = req.user!;
  const systemPrompt = buildSystemPrompt(user.role, user.name ?? user.email, currentView);

  // Keep last 12 messages for context
  const trimmed = messages.slice(-12);

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: trimmed,
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error('[support] Anthropic API error:', errText);
    return res.status(502).json({
      error: 'No se pudo conectar con el agente. Intentá de nuevo en un momento.',
    });
  }

  const data = await anthropicRes.json() as { content: { type: string; text: string }[] };
  const text = data.content?.[0]?.text ?? 'Sin respuesta del agente.';

  res.json({ response: text });
});

export default router;
