/**
 * Transactional email copy and layout, in English and Arabic (plan P1-02).
 *
 * renderEmail(kind, locale, vars) → { subject, text, html }. Every mail is
 * sent as multipart: a plain-text part (always readable, what spam filters
 * like) and a small HTML part with dir="rtl" for Arabic. All variables are
 * escaped in the HTML; links are the only markup a variable can become.
 *
 * Arabic keeps Latin digits for money, ids and dates, like the storefront.
 */
const { escapeHtml } = require('./invoice');

const LOCALES = ['en', 'ar'];

function resolveEmailLocale(value) {
  return value === 'ar' ? 'ar' : 'en';
}

function money(amount, locale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount) || 0);
}

/** Short order reference shoppers see on the site (#1A2B3C4D). */
function orderRef(orderId) {
  return `#${String(orderId || '').slice(-8).toUpperCase()}`;
}

/*
 * Copy per kind. Each entry: subject, heading, lines (paragraphs, may use
 * {placeholders}), optional button { label, urlVar }, optional footnote.
 */
const COPY = {
  orderConfirmed: {
    en: {
      subject: 'Order confirmed {ref}',
      heading: 'Thank you for your order!',
      lines: ['We received your payment and are preparing order {ref}.', 'Total: {total}'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تم تأكيد طلبك {ref}',
      heading: 'شكرًا لطلبك!',
      lines: ['استلمنا دفعتك ونجهّز الآن الطلب {ref}.', 'الإجمالي: {total}'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  orderShipped: {
    en: {
      subject: 'Your order {ref} has shipped',
      heading: 'Your order is on its way',
      lines: ['Order {ref} has left our warehouse.', '{tracking}'],
      button: { label: 'Track your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تم شحن طلبك {ref}',
      heading: 'طلبك في الطريق إليك',
      lines: ['غادر الطلب {ref} مستودعنا.', '{tracking}'],
      button: { label: 'تتبّع طلبك', urlVar: 'orderUrl' },
    },
  },
  orderDelivered: {
    en: {
      subject: 'Your order {ref} was delivered',
      heading: 'Delivered',
      lines: ['Order {ref} has been delivered. We hope you love it!'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تم توصيل طلبك {ref}',
      heading: 'تم التوصيل',
      lines: ['تم توصيل الطلب {ref}. نتمنى أن ينال إعجابك!'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  orderCanceled: {
    en: {
      subject: 'Your order {ref} was canceled',
      heading: 'Order canceled',
      lines: ['Order {ref} has been canceled. If you were charged, the refund is on its way.', 'Questions? Just reply to this email.'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تم إلغاء طلبك {ref}',
      heading: 'تم إلغاء الطلب',
      lines: ['تم إلغاء الطلب {ref}. إن كنت قد دفعت، فالمبلغ المسترد في طريقه إليك.', 'لديك سؤال؟ ردّ على هذه الرسالة فقط.'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  orderRefunded: {
    en: {
      subject: 'Refund issued for order {ref}',
      heading: 'Your refund is on its way',
      lines: ['We refunded {amount} for order {ref} to your original payment method.', 'Banks usually show it within 5–10 business days.'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تم استرداد مبلغ الطلب {ref}',
      heading: 'المبلغ المسترد في طريقه إليك',
      lines: ['أعدنا {amount} عن الطلب {ref} إلى وسيلة الدفع الأصلية.', 'يظهر المبلغ عادةً خلال 5 إلى 10 أيام عمل.'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  returnRequested: {
    en: {
      subject: 'We received your return request for {ref}',
      heading: 'Return request received',
      lines: ['Thanks, we received your return request for order {ref}. Our team will review it and email you the next step.'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'استلمنا طلب الإرجاع للطلب {ref}',
      heading: 'تم استلام طلب الإرجاع',
      lines: ['شكرًا، استلمنا طلب الإرجاع للطلب {ref}. سيراجعه فريقنا ويرسل إليك الخطوة التالية.'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  returnApproved: {
    en: {
      subject: 'Your return for {ref} is approved',
      heading: 'Return approved',
      lines: ['Your return for order {ref} is approved. Please send the items back; we refund you once they arrive.', '{note}'],
      button: { label: 'Return details', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تمت الموافقة على إرجاع الطلب {ref}',
      heading: 'تمت الموافقة على الإرجاع',
      lines: ['تمت الموافقة على إرجاع الطلب {ref}. يرجى إرسال المنتجات، وسنعيد المبلغ فور وصولها.', '{note}'],
      button: { label: 'تفاصيل الإرجاع', urlVar: 'orderUrl' },
    },
  },
  returnRejected: {
    en: {
      subject: 'Update on your return for {ref}',
      heading: 'We could not accept this return',
      lines: ['We are unable to accept the return for order {ref}.', '{note}', 'If you have questions, reply to this email.'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'تحديث بشأن إرجاع الطلب {ref}',
      heading: 'تعذّر قبول هذا الإرجاع',
      lines: ['لم نتمكن من قبول إرجاع الطلب {ref}.', '{note}', 'إن كان لديك سؤال فردّ على هذه الرسالة.'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  returnReceived: {
    en: {
      subject: 'We received your returned items for {ref}',
      heading: 'Return received',
      lines: ['The items you returned from order {ref} have arrived. We will issue your refund shortly.'],
      button: { label: 'View your order', urlVar: 'orderUrl' },
    },
    ar: {
      subject: 'وصلتنا المنتجات المرتجعة من الطلب {ref}',
      heading: 'تم استلام المرتجع',
      lines: ['وصلتنا المنتجات التي أرجعتها من الطلب {ref}. سنعيد المبلغ إليك قريبًا.'],
      button: { label: 'عرض طلبك', urlVar: 'orderUrl' },
    },
  },
  emailVerification: {
    en: {
      subject: 'Confirm your email',
      heading: 'Confirm your email address',
      lines: ['Hi {name}, please confirm the email address for your TrendVaulta account.'],
      button: { label: 'Confirm my email', urlVar: 'link' },
      footnote: 'The link works once and expires in 24 hours. If you did not create an account, ignore this email.',
    },
    ar: {
      subject: 'تأكيد بريدك الإلكتروني',
      heading: 'تأكيد بريدك الإلكتروني',
      lines: ['مرحبًا {name}، يرجى تأكيد البريد الإلكتروني لحسابك في TrendVaulta.'],
      button: { label: 'تأكيد بريدي', urlVar: 'link' },
      footnote: 'يعمل الرابط مرة واحدة وتنتهي صلاحيته خلال 24 ساعة. إن لم تُنشئ حسابًا فتجاهل هذه الرسالة.',
    },
  },
  emailChanged: {
    en: {
      subject: 'Your email address was changed',
      heading: 'Your email address was changed',
      lines: ['The email of your TrendVaulta account was changed to {newEmail}.', 'If this was you, no action is needed. If not, reset your password right away and contact us.'],
    },
    ar: {
      subject: 'تم تغيير بريدك الإلكتروني',
      heading: 'تم تغيير بريدك الإلكتروني',
      lines: ['تم تغيير البريد الإلكتروني لحسابك في TrendVaulta إلى {newEmail}.', 'إن كنت أنت فلا حاجة لأي إجراء. وإن لم تكن أنت، فأعد تعيين كلمة المرور فورًا وتواصل معنا.'],
    },
  },
  passwordChanged: {
    en: {
      subject: 'Your password was changed',
      heading: 'Your password was changed',
      lines: ['The password of your TrendVaulta account was just changed, and you were signed out on your other devices.', 'If this was not you, reset your password now and contact us.'],
      button: { label: 'Reset my password', urlVar: 'resetUrl' },
    },
    ar: {
      subject: 'تم تغيير كلمة المرور',
      heading: 'تم تغيير كلمة المرور',
      lines: ['تم للتو تغيير كلمة مرور حسابك في TrendVaulta، وتم تسجيل خروجك من أجهزتك الأخرى.', 'إن لم تكن أنت، فأعد تعيين كلمة المرور الآن وتواصل معنا.'],
      button: { label: 'إعادة تعيين كلمة المرور', urlVar: 'resetUrl' },
    },
  },
};

const FOOTER = {
  en: 'TrendVaulta · This is an automatic message about your account or order.',
  ar: 'TrendVaulta · هذه رسالة تلقائية بخصوص حسابك أو طلبك.',
};

const TRACKING = {
  en: ({ trackingNumber, trackingCarrier }) =>
    trackingNumber ? `Tracking: ${trackingNumber}${trackingCarrier ? ` (${trackingCarrier})` : ''}` : '',
  ar: ({ trackingNumber, trackingCarrier }) =>
    trackingNumber ? `رقم التتبّع: ${trackingNumber}${trackingCarrier ? ` (${trackingCarrier})` : ''}` : '',
};

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_m, key) => (vars[key] == null ? '' : String(vars[key])));
}

/**
 * @param {keyof typeof COPY} kind
 * @param {'en'|'ar'} locale
 * @param {Record<string, unknown>} vars orderId, orderUrl, totalPrice, refundAmount,
 *   trackingNumber, trackingCarrier, note, name, newEmail, link, resetUrl
 * @returns {{ subject: string, text: string, html: string }}
 */
function renderEmail(kind, locale, vars = {}) {
  const lang = resolveEmailLocale(locale);
  const copy = COPY[kind]?.[lang];
  if (!copy) throw new Error(`Unknown email template: ${kind}`);

  const values = {
    ...vars,
    ref: orderRef(vars.orderId),
    total: money(vars.totalPrice, lang),
    amount: money(vars.refundAmount, lang),
    tracking: TRACKING[lang](vars),
    name: vars.name || (lang === 'ar' ? 'عميلنا العزيز' : 'there'),
  };
  const lines = copy.lines.map((line) => fill(line, values)).filter((line) => line.trim());
  const buttonUrl = copy.button ? values[copy.button.urlVar] : '';
  const subject = fill(copy.subject, values);

  const text = [
    copy.heading,
    '',
    ...lines,
    ...(buttonUrl ? ['', `${copy.button.label}: ${buttonUrl}`] : []),
    ...(copy.footnote ? ['', copy.footnote] : []),
    '',
    '—',
    FOOTER[lang],
  ].join('\n');

  const e = escapeHtml;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<div dir="${dir}" style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;color:#111827;text-align:${lang === 'ar' ? 'right' : 'left'};">
<div style="background:#ffffff;border-radius:12px;padding:28px;">
<p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#4f46e5;">TrendVaulta</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${e(copy.heading)}</h1>
${lines.map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${e(line)}</p>`).join('\n')}
${buttonUrl ? `<p style="margin:24px 0;"><a href="${e(buttonUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">${e(copy.button.label)}</a></p>` : ''}
${copy.footnote ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">${e(copy.footnote)}</p>` : ''}
</div>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280;text-align:center;">${e(FOOTER[lang])}</p>
</div>
</body>
</html>`;

  return { subject, text, html };
}

module.exports = {
  EMAIL_KINDS: Object.keys(COPY),
  LOCALES,
  resolveEmailLocale,
  renderEmail,
};
