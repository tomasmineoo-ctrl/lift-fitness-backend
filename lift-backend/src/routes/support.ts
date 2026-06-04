import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

router.post('/chat', authenticateToken, async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: AnthropicMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Servicio de soporte no configurado. Contactá a ctrlgym.org.' });
  }

  // Keep last 10 messages to stay within token limits
  const trimmed = messages.slice(-10);

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
      system: `Sos el agente de soporte técnico 24/7 de LIFT Fitness, un sistema de gestión de gimnasios desarrollado por ctrlgym.org.

Tu rol es ayudar a los usuarios del sistema LIFT con:
- Cómo usar las funcionalidades: dashboard, socios, cuotas y pagos, clases y agenda, control de acceso, reportes financieros, staff y roles, notificaciones, backups, comunidad, shop y cafetería.
- Resolución de problemas técnicos comunes.
- Preguntas sobre configuración del sistema.
- Orientación sobre el módulo que estén usando.
- Dudas sobre permisos y roles (admin, recepción, entrenador, nutricionista, socio).

Respondé de forma clara, concisa y amigable en español rioplatense. Si no podés resolver algo, indicá que se comuniquen con soporte humano en ctrlgym.org.
Nunca inventes funcionalidades que no existen. Sé honesto si algo escapa a tu conocimiento.`,
      messages: trimmed,
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error('[support] Anthropic API error:', errText);
    return res.status(502).json({ error: 'No se pudo conectar con el agente de IA. Intentá de nuevo en un momento.' });
  }

  const data = await anthropicRes.json() as { content: { type: string; text: string }[] };
  const text = data.content?.[0]?.text ?? 'Sin respuesta del agente.';

  res.json({ response: text });
});

export default router;
