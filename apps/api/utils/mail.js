const nodemailer = require('nodemailer');

function createTransporter() {
  const transportOptions = process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
        },
      };

  return nodemailer.createTransport({
    ...transportOptions,
    ...(process.env.NODE_ENV !== 'production'
      ? { tls: { rejectUnauthorized: false } }
      : {}),
  });
}

function getFromAddress() {
  return (
    process.env.FROM_EMAIL ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    'no-reply@trendvaulta.com'
  );
}

/**
 * Send order confirmation email. Fail-soft: logs and returns false on error.
 * @param {{ to: string, orderId: string, totalPrice: number, items?: Array<{ title?: string, qty?: number }> }} opts
 */
async function sendOrderConfirmationEmail(opts) {
  const { to, orderId, totalPrice, items = [] } = opts;
  if (!to) return false;

  const hasCreds =
    process.env.SMTP_HOST ||
    process.env.EMAIL_USER ||
    process.env.SMTP_USER;
  if (!hasCreds) {
    console.warn(
      '[mail] Skipping order confirmation — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const lines = items
    .slice(0, 20)
    .map((it) => `- ${it.title || 'Item'} × ${it.qty || 1}`)
    .join('\n');

  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  const text = [
    'Thank you for your TrendVaulta order!',
    '',
    `Order ID: ${orderId}`,
    `Total: $${Number(totalPrice || 0).toFixed(2)}`,
    '',
    lines ? `Items:\n${lines}` : '',
    '',
    `View your orders: ${frontend}/profile`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Order confirmed — ${orderId}`,
      text,
    });
    return true;
  } catch (err) {
    console.error('[mail] Order confirmation failed:', err?.message || err);
    return false;
  }
}

/**
 * Send a best-effort notification to the store inbox when a contact form is
 * submitted. Fail-soft: logs and returns false on error, never throws.
 * @param {{ name: string, email: string, subject: string, message: string }} opts
 */
async function sendContactNotificationEmail(opts) {
  const { name, email, subject, message } = opts;

  const inbox =
    process.env.CONTACT_INBOX_EMAIL ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER;
  if (!inbox) {
    console.warn(
      '[mail] Skipping contact notification — no CONTACT_INBOX_EMAIL/SMTP_USER/EMAIL_USER configured',
    );
    return false;
  }

  const hasCreds =
    process.env.SMTP_HOST ||
    process.env.EMAIL_USER ||
    process.env.SMTP_USER;
  if (!hasCreds) {
    console.warn(
      '[mail] Skipping contact notification — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const text = [
    'New contact message received on TrendVaulta',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    '',
    message,
  ].join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to: inbox,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text,
    });
    return true;
  } catch (err) {
    console.error('[mail] Contact notification failed:', err?.message || err);
    return false;
  }
}

module.exports = {
  createTransporter,
  getFromAddress,
  sendOrderConfirmationEmail,
  sendContactNotificationEmail,
};
