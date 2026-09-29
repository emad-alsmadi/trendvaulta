const nodemailer = require('nodemailer');
const logger = require('./logger');

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

/** Storefront order page (the account area lives under /user/*). */
function orderPageUrl(orderId) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${frontend}/user/orders/${orderId}`;
}

/**
 * Send order confirmation email. Fail-soft: logs and returns false on error.
 * @param {{ to: string, orderId: string, totalPrice: number, items?: Array<{ title?: string, qty?: number }> }} opts
 */
async function sendOrderConfirmationEmail(opts) {
  const { to, orderId, totalPrice, items = [] } = opts;
  if (!to) return false;

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    logger.warn(
      '[mail] Skipping order confirmation — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const lines = items
    .slice(0, 20)
    .map((it) => `- ${it.title || 'Item'} × ${it.qty || 1}`)
    .join('\n');

  const text = [
    'Thank you for your TrendVaulta order!',
    '',
    `Order ID: ${orderId}`,
    `Total: $${Number(totalPrice || 0).toFixed(2)}`,
    '',
    lines ? `Items:\n${lines}` : '',
    '',
    `View your order: ${orderPageUrl(orderId)}`,
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
    logger.error({ err }, '[mail] Order confirmation failed');
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
    logger.warn(
      '[mail] Skipping contact notification — no CONTACT_INBOX_EMAIL/SMTP_USER/EMAIL_USER configured',
    );
    return false;
  }

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    logger.warn(
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
    logger.error({ err }, '[mail] Contact notification failed');
    return false;
  }
}

/**
 * Send order shipped email. Fail-soft: logs and returns false on error.
 * @param {{ to: string, orderId: string, trackingNumber?: string, trackingCarrier?: string }} opts
 */
async function sendOrderShippedEmail(opts) {
  const { to, orderId, trackingNumber, trackingCarrier } = opts;
  if (!to) return false;

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    logger.warn(
      '[mail] Skipping order shipped notification — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const text = [
    'Your TrendVaulta order has been shipped!',
    '',
    `Order ID: ${orderId}`,
    trackingNumber ? `Tracking Number: ${trackingNumber}` : '',
    trackingCarrier ? `Carrier: ${trackingCarrier}` : '',
    '',
    `Track your order: ${orderPageUrl(orderId)}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Order shipped — ${orderId}`,
      text,
    });
    return true;
  } catch (err) {
    logger.error(
      { err },
      '[mail] Order shipped notification failed',
    );
    return false;
  }
}

/**
 * Send order delivered email. Fail-soft: logs and returns false on error.
 * @param {{ to: string, orderId: string }} opts
 */
async function sendOrderDeliveredEmail(opts) {
  const { to, orderId } = opts;
  if (!to) return false;

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    logger.warn(
      '[mail] Skipping order delivered notification — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const text = [
    'Your TrendVaulta order has been delivered!',
    '',
    `Order ID: ${orderId}`,
    '',
    `View your order: ${orderPageUrl(orderId)}`,
    '',
    'Thank you for shopping with us!',
  ].join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Order delivered — ${orderId}`,
      text,
    });
    return true;
  } catch (err) {
    logger.error(
      { err },
      '[mail] Order delivered notification failed',
    );
    return false;
  }
}

/**
 * Send order canceled email. Fail-soft: logs and returns false on error.
 * @param {{ to: string, orderId: string }} opts
 */
async function sendOrderCanceledEmail(opts) {
  const { to, orderId } = opts;
  if (!to) return false;

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    logger.warn(
      '[mail] Skipping order canceled notification — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const text = [
    'Your TrendVaulta order has been canceled.',
    '',
    `Order ID: ${orderId}`,
    '',
    'If you have any questions, please contact our support team.',
    '',
    `View your order: ${orderPageUrl(orderId)}`,
  ].join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Order canceled — ${orderId}`,
      text,
    });
    return true;
  } catch (err) {
    logger.error(
      { err },
      '[mail] Order canceled notification failed',
    );
    return false;
  }
}

/**
 * Send order refunded email. Fail-soft: logs and returns false on error.
 * @param {{ to: string, orderId: string, refundAmount?: number }} opts
 */
async function sendOrderRefundedEmail(opts) {
  const { to, orderId, refundAmount } = opts;
  if (!to) return false;

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    logger.warn(
      '[mail] Skipping order refunded notification — SMTP/EMAIL credentials not configured',
    );
    return false;
  }

  const amountText = refundAmount
    ? `Refund amount: $${Number(refundAmount).toFixed(2)}`
    : '';
  const text = [
    'Your TrendVaulta order has been refunded.',
    '',
    `Order ID: ${orderId}`,
    amountText,
    '',
    'The refund has been processed to your original payment method.',
    '',
    `View your order: ${orderPageUrl(orderId)}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Order refunded — ${orderId}`,
      text,
    });
    return true;
  } catch (err) {
    logger.error(
      { err },
      '[mail] Order refunded notification failed',
    );
    return false;
  }
}

function mailConfigured() {
  return Boolean(
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER,
  );
}

/** Storefront link that confirms an email address (utils/emailVerification.js). */
function verifyEmailUrl(token) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${frontend}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Ask the owner of an address to confirm it. English and Arabic in one
 * message until users have a stored language (plan P1-02). Fail-soft.
 * @param {{ to: string, token: string, username?: string }} opts
 */
async function sendEmailVerificationEmail(opts) {
  const { to, token, username } = opts;
  if (!to || !token) return false;
  if (!mailConfigured()) {
    logger.warn('[mail] Skipping email verification — SMTP/EMAIL credentials not configured');
    return false;
  }

  const link = verifyEmailUrl(token);
  const text = [
    `Hi${username ? ` ${username}` : ''},`,
    '',
    'Please confirm your email address for your TrendVaulta account:',
    link,
    '',
    'The link works once and expires in 24 hours. If you did not create an account, you can ignore this email.',
    '',
    '—',
    '',
    'يرجى تأكيد بريدك الإلكتروني لحسابك في TrendVaulta:',
    link,
    '',
    'يعمل الرابط مرة واحدة وتنتهي صلاحيته خلال 24 ساعة. إن لم تُنشئ حسابًا فتجاهل هذه الرسالة.',
  ].join('\n');

  try {
    await createTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: 'Confirm your email — تأكيد بريدك الإلكتروني',
      text,
    });
    return true;
  } catch (err) {
    logger.error({ err }, '[mail] Email verification failed');
    return false;
  }
}

/**
 * Tell the previous address that the account's email was changed, so a
 * takeover doesn't go unnoticed. Fail-soft.
 * @param {{ to: string, newEmail: string }} opts
 */
async function sendEmailChangedNotice(opts) {
  const { to, newEmail } = opts;
  if (!to) return false;
  if (!mailConfigured()) {
    logger.warn('[mail] Skipping email-changed notice — SMTP/EMAIL credentials not configured');
    return false;
  }

  const text = [
    `The email address of your TrendVaulta account was changed to ${newEmail}.`,
    '',
    'If you made this change, no action is needed. If you did not, reset your password right away and contact us.',
    '',
    '—',
    '',
    `تم تغيير البريد الإلكتروني لحسابك في TrendVaulta إلى ${newEmail}.`,
    '',
    'إن كنت أنت من غيّره فلا حاجة لأي إجراء. وإن لم تكن أنت، فأعد تعيين كلمة المرور فورًا وتواصل معنا.',
  ].join('\n');

  try {
    await createTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: 'Your email address was changed — تم تغيير بريدك الإلكتروني',
      text,
    });
    return true;
  } catch (err) {
    logger.error({ err }, '[mail] Email-changed notice failed');
    return false;
  }
}

module.exports = {
  createTransporter,
  getFromAddress,
  verifyEmailUrl,
  sendEmailVerificationEmail,
  sendEmailChangedNotice,
  sendOrderConfirmationEmail,
  sendContactNotificationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCanceledEmail,
  sendOrderRefundedEmail,
};
