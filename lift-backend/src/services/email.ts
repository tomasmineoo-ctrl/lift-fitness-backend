// Email service using Resend API (https://resend.com)
// Requires RESEND_API_KEY environment variable

const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[email] Resend API error:', err);
    throw new Error('Error al enviar el email');
  }
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111111;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#E5087E,#34388E);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">LIFT Fitness</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">ctrlgym.org</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;">Este email fue enviado automáticamente por el sistema LIFT Fitness.</p>
              <p style="margin:6px 0 0;font-size:12px;color:#555;">Si no creaste una cuenta, podés ignorar este mensaje.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  gymName: string,
  token: string,
  gymUrl: string,
): Promise<void> {
  const verifyUrl = `${gymUrl}?action=verify-email&token=${token}`;

  const body = `
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8eaf0;">¡Bienvenido/a, ${name}! 👋</p>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Tu cuenta en <strong style="color:#E5087E;">${gymName}</strong> fue creada exitosamente.
      Solo falta un paso: confirmá tu email para activarla.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#E5087E,#34388E);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
        ✅ Confirmar mi email
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#555;text-align:center;">
      Este enlace expira en <strong style="color:#e8eaf0;">24 horas</strong>.
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#444;text-align:center;word-break:break-all;">
      ${verifyUrl}
    </p>
  `;

  await sendEmail({
    from: 'LIFT Fitness <no-reply@ctrlgym.org>',
    to,
    subject: `Confirmá tu email — ${gymName}`,
    html: baseTemplate(`Confirmá tu email — ${gymName}`, body),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  gymName: string,
  token: string,
  gymUrl: string,
): Promise<void> {
  const resetUrl = `${gymUrl}?action=reset-password&token=${token}`;

  const body = `
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8eaf0;">Recuperar contraseña 🔐</p>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Hola <strong style="color:#e8eaf0;">${name}</strong>, recibimos una solicitud para restablecer
      la contraseña de tu cuenta en <strong style="color:#E5087E;">${gymName}</strong>.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#E5087E,#34388E);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
        🔑 Crear nueva contraseña
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#555;text-align:center;">
      Este enlace expira en <strong style="color:#e8eaf0;">1 hora</strong>. Si no solicitaste este cambio, ignorá este mensaje.
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#444;text-align:center;word-break:break-all;">
      ${resetUrl}
    </p>
  `;

  await sendEmail({
    from: 'LIFT Fitness <no-reply@ctrlgym.org>',
    to,
    subject: `Recuperar contraseña — ${gymName}`,
    html: baseTemplate(`Recuperar contraseña — ${gymName}`, body),
  });
}
