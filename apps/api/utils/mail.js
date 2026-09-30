const nodemailer = require('nodemailer');
const logger = require('./logger');
const { renderEmail, resolveEmailLocale } = require('./emailTemplates');

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
 * Storefront order page (the account area lives under /user/*). Callers
 * pass `opts.orderUrl` when the order needs another link, e.g. a guest
 * order's tokenised page (utils/guestOrders.js orderEmailTarget).
 */
function orderPageUrl(orderId, override) {
  if (override) return override;
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${frontend}/user/orders/${orderId}`;
}

/**
 * The language a recipient reads (plan P1-02). An order's email goes out in
 * its account's language, or for a guest the language they checked out in;
 * an account email in that account's language. English when unknown.
 */
async function localeForOrder(orderId) {
  try {
    const { Order } = require('../models/Order');
    const order = await Order.findById(orderId)
      .select('locale user')
      .populate('user', 'locale')
      .lean();
    return resolveEmailLocale(order?.user?.locale || order?.locale);
  } catch {
    return 'en';
  }
}

async function localeForEmail(email) {
  try {
    const { User } = require('../models/User');
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('locale').lean();
    return resolveEmailLocale(user?.locale);
  } catch {
    return 'en';
  }
}

/**
 * Render a template in the recipient's language and send it as text + HTML.
 * Fail-soft: never throws; returns whether the mail was handed to SMTP.
 * @param {{ to: string, kind: string, locale?: string, vars?: object, label: string }} opts
 */
async function deliver({ to, kind, locale, vars = {}, label }) {
  if (!to) return false;
  if (!mailConfigured()) {
    logger.warn(`[mail] Skipping ${label} — SMTP/EMAIL credentials not configured`);
    return false;
  }
  try {
    const { subject, text, html } = renderEmail(kind, locale, vars);
    await createTransporter().sendMail({ from: getFromAddress(), to, subject, text, html });
    return true;
  } catch (err) {
    logger.error({ err, template: kind }, `[mail] ${label} failed`);
    return false;
  }
}

/** Common vars + language for every order email. */
async function orderMail(opts, kind, label, extra = {}) {
  return deliver({
    to: opts.to,
    kind,
    label,
    locale: opts.locale || (await localeForOrder(opts.orderId)),
    vars: { orderId: opts.orderId, orderUrl: orderPageUrl(opts.orderId, opts.orderUrl), ...extra },
  });
}

/**
 * Order confirmation (payment captured). Fail-soft.
 * @param {{ to: string, orderId: string, totalPrice: number, orderUrl?: string, locale?: string }} opts
 */
async function sendOrderConfirmationEmail(opts) {
  return orderMail(opts, 'orderConfirmed', 'order confirmation', { totalPrice: opts.totalPrice });
}

/**
 * Send a best-effort notification to the store inbox when a contact form is
 * submitted. Fail-soft: logs and returns false on error, never throws.
 * @param {{ name: string, email: string, subject: string, message: string, inbox?: string }} opts
 */
async function sendContactNotificationEmail(opts) {
  const { name, email, subject, message } = opts;

  // Settings → Contact email (editable in the dashboard) wins over env.
  const inbox =
    opts.inbox ||
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
 * Newsletter double opt-in mail (English + Arabic). Fail-soft: logs and
 * returns false on error. Outside production, an unconfigured mailer logs
 * the link instead so the flow can be completed locally.
 * @param {{ to: string, confirmUrl: string, unsubscribeUrl: string }} opts
 */
async function sendNewsletterConfirmEmail(opts) {
  const { to, confirmUrl, unsubscribeUrl } = opts;

  const hasCreds =
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!hasCreds) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info({ confirmUrl }, '[mail] Newsletter confirm link (mail not configured)');
    } else {
      logger.warn('[mail] Skipping newsletter confirmation — SMTP/EMAIL credentials not configured');
    }
    return false;
  }

  const text = [
    'Please confirm your TrendVaulta newsletter subscription:',
    confirmUrl,
    '',
    "If you didn't sign up, ignore this email and you won't be subscribed.",
    '',
    'يرجى تأكيد اشتراكك في نشرة TrendVaulta البريدية:',
    confirmUrl,
    '',
    'إذا لم تشترك بنفسك، تجاهل هذه الرسالة ولن يتم اشتراكك.',
    '',
    `Unsubscribe / إلغاء الاشتراك: ${unsubscribeUrl}`,
  ].join('\n');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: 'Confirm your subscription · تأكيد الاشتراك',
      text,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    });
    return true;
  } catch (err) {
    logger.error({ err }, '[mail] Newsletter confirmation failed');
    return false;
  }
}

/**
 * Order shipped (with tracking when known). Fail-soft.
 * @param {{ to: string, orderId: string, trackingNumber?: string, trackingCarrier?: string, orderUrl?: string, locale?: string }} opts
 */
async function sendOrderShippedEmail(opts) {
  return orderMail(opts, 'orderShipped', 'order shipped notification', {
    trackingNumber: opts.trackingNumber,
    trackingCarrier: opts.trackingCarrier,
  });
}

/**
 * Order delivered. Fail-soft.
 * @param {{ to: string, orderId: string, orderUrl?: string, locale?: string }} opts
 */
async function sendOrderDeliveredEmail(opts) {
  return orderMail(opts, 'orderDelivered', 'order delivered notification');
}

/**
 * Order canceled. Fail-soft.
 * @param {{ to: string, orderId: string, orderUrl?: string, locale?: string }} opts
 */
async function sendOrderCanceledEmail(opts) {
  return orderMail(opts, 'orderCanceled', 'order canceled notification');
}

/**
 * Refund issued. Fail-soft.
 * @param {{ to: string, orderId: string, refundAmount?: number, orderUrl?: string, locale?: string }} opts
 */
async function sendOrderRefundedEmail(opts) {
  return orderMail(opts, 'orderRefunded', 'order refunded notification', {
    refundAmount: opts.refundAmount,
  });
}

const RETURN_KINDS = {
  requested: 'returnRequested',
  approved: 'returnApproved',
  rejected: 'returnRejected',
  received: 'returnReceived',
};

/**
 * A return moved to a new step (requested, approved, rejected, received).
 * The refunded step sends sendOrderRefundedEmail instead. Fail-soft.
 * @param {{ to: string, orderId: string, status: string, note?: string, orderUrl?: string, locale?: string }} opts
 */
async function sendReturnUpdateEmail(opts) {
  const kind = RETURN_KINDS[opts.status];
  if (!kind) return false;
  return orderMail(opts, kind, `return ${opts.status} notification`, { note: opts.note || '' });
}

function mailConfigured() {
  return Boolean(
    process.env.SMTP_HOST || process.env.EMAIL_USER || process.env.SMTP_USER,
  );
}

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3001';
}

/** Storefront link that confirms an email address (utils/emailVerification.js). */
function verifyEmailUrl(token) {
  return `${frontendUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Ask the owner of an address to confirm it, in the account's language.
 * Fail-soft.
 * @param {{ to: string, token: string, username?: string, locale?: string }} opts
 */
async function sendEmailVerificationEmail(opts) {
  if (!opts.token) return false;
  return deliver({
    to: opts.to,
    kind: 'emailVerification',
    label: 'email verification',
    locale: opts.locale || (await localeForEmail(opts.to)),
    vars: { name: opts.username, link: verifyEmailUrl(opts.token) },
  });
}

/**
 * Tell the previous address that the account's email was changed, so a
 * takeover doesn't go unnoticed. Fail-soft.
 * @param {{ to: string, newEmail: string, locale?: string }} opts
 */
async function sendEmailChangedNotice(opts) {
  return deliver({
    to: opts.to,
    kind: 'emailChanged',
    label: 'email-changed notice',
    // The old address no longer maps to the account: look up the new one
    locale: opts.locale || (await localeForEmail(opts.newEmail)),
    vars: { newEmail: opts.newEmail },
  });
}

/**
 * The account password was changed or reset: a heads-up with a way back
 * in if it was not the owner. Fail-soft.
 * @param {{ to: string, locale?: string }} opts
 */
async function sendPasswordChangedEmail(opts) {
  return deliver({
    to: opts.to,
    kind: 'passwordChanged',
    label: 'password-changed notice',
    locale: opts.locale || (await localeForEmail(opts.to)),
    vars: { resetUrl: `${frontendUrl()}/password/forgot-password` },
  });
}

module.exports = {
  sendNewsletterConfirmEmail,
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
  sendReturnUpdateEmail,
  sendPasswordChangedEmail,
  localeForOrder,
  localeForEmail,
};
