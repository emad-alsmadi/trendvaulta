/**
 * Order invoices: gap-free numbering and a printable, self-contained HTML
 * document in English or Arabic.
 *
 * Everything interpolated into the HTML goes through escapeHtml: shipping
 * addresses and product titles are user-controlled, and the dashboard opens
 * the invoice on its own origin. The document also carries a CSP <meta> that
 * forbids scripts outright, so even a missed escape cannot run code.
 */
const { nextSequence } = require('../models/Counter');

/** Payment states that have a receipt: money was captured (and maybe refunded). */
const INVOICEABLE_PAYMENT_STATUSES = ['paid', 'refunded'];

/** Also sent as a response header; the <meta> copy survives blob: URLs. */
const INVOICE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'";

const CLAIM_TTL_MS = 60 * 1000;

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Multi-line admin text (the seller address) as escaped lines. */
function escapeLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br>');
}

function formatInvoiceNumber(prefix, year, seq) {
  const safePrefix = String(prefix || 'TV').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'TV';
  return `${safePrefix}-${year}-${String(seq).padStart(6, '0')}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function storeTimeZone() {
  const zone = process.env.STORE_TIMEZONE || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    // A mistyped STORE_TIMEZONE (RangeError) must not break invoices
    return 'UTC';
  }
}

/** Calendar year in the store's time zone: the same one the invoice date prints in. */
function storeYear(value) {
  return Number(
    new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: storeTimeZone() }).format(
      new Date(value),
    ),
  );
}

/**
 * Give a paid order its invoice number exactly once and return it ('' when
 * the order has no captured payment).
 *
 * The order is claimed (invoiceClaimedAt) before a sequence value is drawn,
 * so concurrent callers (webhook + verify-payment + an invoice view) never
 * each burn a number: numbering stays gap-free except after a crash between
 * drawing and saving, whose claim a later caller takes over after 1 minute.
 *
 * @param {import('mongoose').Model} OrderModel
 * @param {string|import('mongoose').Types.ObjectId} orderId
 * @param {{ prefix?: string }} [options]
 * @returns {Promise<string>}
 */
async function ensureInvoiceNumber(OrderModel, orderId, { prefix } = {}) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const order = await OrderModel.findById(orderId)
      .select('invoiceNumber paymentStatus paidAt')
      .lean();
    if (!order) return '';
    if (order.invoiceNumber) return order.invoiceNumber;
    if (!INVOICEABLE_PAYMENT_STATUSES.includes(order.paymentStatus)) return '';

    const claim = await OrderModel.updateOne(
      {
        _id: orderId,
        invoiceNumber: { $in: ['', null] },
        $or: [
          { invoiceClaimedAt: null },
          { invoiceClaimedAt: { $lt: new Date(Date.now() - CLAIM_TTL_MS) } },
        ],
      },
      { $set: { invoiceClaimedAt: new Date() } },
    );
    if ((claim.modifiedCount ?? 0) !== 1) {
      // Another caller is numbering it right now: wait for its result
      await sleep(50);
      continue;
    }

    const year = storeYear(order.paidAt || Date.now());
    const number = formatInvoiceNumber(prefix, year, await nextSequence(`invoice:${year}`));
    await OrderModel.updateOne(
      { _id: orderId, invoiceNumber: { $in: ['', null] } },
      { $set: { invoiceNumber: number, invoiceIssuedAt: new Date(), invoiceClaimedAt: null } },
    );
    return number;
  }
  const settled = await OrderModel.findById(orderId).select('invoiceNumber').lean();
  return settled?.invoiceNumber || '';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const LABELS = {
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice no.',
    invoiceDate: 'Invoice date',
    orderRef: 'Order',
    status: 'Payment',
    paid: 'Paid',
    refunded: 'Refunded',
    partlyRefunded: 'Partly refunded',
    taxId: 'Tax ID',
    billTo: 'Bill to',
    fulfilment: 'Fulfilment',
    delivery: 'Delivery',
    pickup: 'Store pickup',
    product: 'Product',
    qty: 'Qty',
    unitPrice: 'Unit price',
    lineTotal: 'Total',
    size: 'Size',
    color: 'Color',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    tax: 'Tax',
    total: 'Total',
    amountPaid: 'Amount paid',
    refundedAmount: 'Refunded',
    thanks: 'Thank you for shopping with us.',
    printHint: 'To save as PDF, use your browser’s Print command (Ctrl+P / ⌘P).',
  },
  ar: {
    invoice: 'فاتورة',
    invoiceNumber: 'رقم الفاتورة',
    invoiceDate: 'تاريخ الفاتورة',
    orderRef: 'الطلب',
    status: 'الدفع',
    paid: 'مدفوعة',
    refunded: 'مستردّة',
    partlyRefunded: 'مستردّة جزئيًا',
    taxId: 'الرقم الضريبي',
    billTo: 'الفاتورة باسم',
    fulfilment: 'طريقة الاستلام',
    delivery: 'توصيل',
    pickup: 'استلام من المتجر',
    product: 'المنتج',
    qty: 'الكمية',
    unitPrice: 'سعر الوحدة',
    lineTotal: 'الإجمالي',
    size: 'المقاس',
    color: 'اللون',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    shipping: 'الشحن',
    tax: 'الضريبة',
    total: 'الإجمالي',
    amountPaid: 'المبلغ المدفوع',
    refundedAmount: 'المبلغ المسترد',
    thanks: 'شكرًا لتسوقك معنا.',
    printHint: 'لحفظها بصيغة PDF استخدم أمر الطباعة في المتصفح (Ctrl+P / ⌘P).',
  },
};

function resolveInvoiceLocale(value) {
  return value === 'ar' ? 'ar' : 'en';
}

/** Arabic keeps Latin digits, like the storefront (lib/locale.ts intlLocale). */
function intlTag(locale) {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
}

function money(amount, locale) {
  return new Intl.NumberFormat(intlTag(locale), {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount) || 0);
}

function date(value, locale) {
  if (!value) return '';
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: 'long',
    timeZone: storeTimeZone(),
  }).format(new Date(value));
}

function variantText(variant, t) {
  if (!variant) return '';
  const parts = [];
  if (variant.size) parts.push(`${t.size}: ${variant.size}`);
  if (variant.color) parts.push(`${t.color}: ${variant.color}`);
  return parts.join(' · ');
}

function paymentLabel(order, t) {
  if (order.paymentStatus !== 'refunded') {
    return Number(order.refundAmount) > 0 ? t.partlyRefunded : t.paid;
  }
  return t.refunded;
}

/**
 * @param {object} args
 * @param {object} args.order  lean Order (with invoiceNumber)
 * @param {object|null} [args.settings] lean StoreSettings
 * @param {'en'|'ar'} [args.locale]
 * @param {string} [args.storefrontUrl]
 * @returns {string} a complete HTML document
 */
function renderInvoiceHtml({ order, settings, locale = 'en', storefrontUrl = '' }) {
  const lang = resolveInvoiceLocale(locale);
  const t = LABELS[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const e = escapeHtml;
  // Amounts are isolated left-to-right: in an RTL page the bidi algorithm
  // otherwise reorders "50.00 US$" into "$US 50.00" and moves the minus sign.
  const amount = (text) => `<bdi dir="ltr">${e(text)}</bdi>`;

  const storeName = settings?.storeName || 'TrendVaulta';
  const seller = settings?.invoice || {};
  const address = order.shippingAddress || {};
  const orderRef = String(order._id).slice(-8).toUpperCase();
  const isPickup = order.delivery === false || order.shippingMethod === 'none';
  const refunded = Number(order.refundAmount) || 0;

  const rows = (order.items || [])
    .map((item) => {
      const variant = variantText(item.variant, t);
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      return `
        <tr>
          <td><bdi>${e(item.title)}</bdi>${variant ? `<div class="muted">${e(variant)}</div>` : ''}${
            item.variant?.sku ? `<div class="muted">SKU ${e(item.variant.sku)}</div>` : ''
          }</td>
          <td class="num">${e(qty)}</td>
          <td class="num">${amount(money(price, lang))}</td>
          <td class="num">${amount(money(price * qty, lang))}</td>
        </tr>`;
    })
    .join('');

  const summary = [
    [t.subtotal, money(order.itemsPrice, lang)],
    Number(order.discountAmount) > 0
      ? [
          `${t.discount}${order.couponCode ? ` (${order.couponCode})` : ''}`,
          `−${money(order.discountAmount, lang)}`,
        ]
      : null,
    [t.shipping, money(order.shippingPrice, lang)],
    [t.tax, money(order.taxPrice, lang)],
  ].filter(Boolean);

  const paidLines = [
    Number.isFinite(order.amountPaid) ? [t.amountPaid, money(order.amountPaid, lang)] : null,
    refunded > 0 ? [t.refundedAmount, `−${money(refunded, lang)}`] : null,
  ].filter(Boolean);

  const summaryRow = ([label, value]) =>
    `<tr><td>${e(label)}</td><td class="num">${amount(value)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${e(INVOICE_CSP)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${e(`${t.invoice} ${order.invoiceNumber || orderRef}`)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; color: #111827; margin: 0; background: #f3f4f6; }
  .page { max-width: 820px; margin: 24px auto; padding: 40px; background: #fff; border-radius: 12px; }
  header { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 32px; }
  h1 { margin: 0 0 8px; font-size: 28px; color: #4f46e5; }
  h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
  .seller strong { font-size: 18px; }
  .meta { text-align: end; }
  .meta dl { display: grid; grid-template-columns: auto auto; gap: 4px 16px; margin: 0; justify-content: end; }
  .meta dt { color: #6b7280; }
  .meta dd { margin: 0; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
  .badge.refunded { background: #fee2e2; color: #991b1b; }
  .cols { display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 28px; }
  .cols > section { flex: 1 1 240px; }
  p { margin: 2px 0; }
  .muted { color: #6b7280; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 8px; text-align: start; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; color: #6b7280; background: #f9fafb; }
  .num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { width: 100%; max-width: 340px; margin-inline-start: auto; margin-top: 16px; }
  .totals td { border-bottom: 0; padding: 4px 8px; }
  .totals .grand td { border-top: 2px solid #111827; font-weight: 700; font-size: 17px; padding-top: 10px; }
  footer { margin-top: 36px; text-align: center; color: #6b7280; font-size: 13px; }
  .hint { margin-top: 8px; font-size: 12px; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; padding: 0; max-width: none; border-radius: 0; }
    .hint { display: none; }
  }
</style>
</head>
<body>
<main class="page">
  <header>
    <div class="seller">
      <h1>${e(t.invoice)}</h1>
      <p><strong>${e(seller.legalName || storeName)}</strong></p>
      ${seller.address ? `<p>${escapeLines(seller.address)}</p>` : ''}
      ${seller.taxId ? `<p>${e(t.taxId)}: <bdi>${e(seller.taxId)}</bdi></p>` : ''}
      ${settings?.contactEmail ? `<p>${e(settings.contactEmail)}</p>` : ''}
    </div>
    <div class="meta">
      <dl>
        <dt>${e(t.invoiceNumber)}</dt><dd><bdi>${e(order.invoiceNumber)}</bdi></dd>
        <dt>${e(t.invoiceDate)}</dt><dd>${e(date(order.paidAt || order.invoiceIssuedAt || order.createdAt, lang))}</dd>
        <dt>${e(t.orderRef)}</dt><dd><bdi>#${e(orderRef)}</bdi></dd>
        <dt>${e(t.status)}</dt><dd><span class="badge${order.paymentStatus === 'refunded' ? ' refunded' : ''}">${e(paymentLabel(order, t))}</span></dd>
      </dl>
    </div>
  </header>

  <div class="cols">
    <section>
      <h2>${e(t.billTo)}</h2>
      <p><strong><bdi>${e(address.name)}</bdi></strong></p>
      ${address.address ? `<p><bdi>${e(address.address)}</bdi></p>` : ''}
      <p><bdi>${e([address.city, address.zip].filter(Boolean).join(' '))}</bdi></p>
      ${address.country ? `<p><bdi>${e(address.country)}</bdi></p>` : ''}
      ${address.phone ? `<p><bdi>${e(address.phone)}</bdi></p>` : ''}
    </section>
    <section>
      <h2>${e(t.fulfilment)}</h2>
      <p>${e(isPickup ? t.pickup : t.delivery)}</p>
    </section>
  </div>

  <table>
    <thead>
      <tr><th>${e(t.product)}</th><th class="num">${e(t.qty)}</th><th class="num">${e(t.unitPrice)}</th><th class="num">${e(t.lineTotal)}</th></tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>

  <table class="totals">
    ${summary.map(summaryRow).join('')}
    <tr class="grand"><td>${e(t.total)}</td><td class="num">${amount(money(order.totalPrice, lang))}</td></tr>
    ${paidLines.map(summaryRow).join('')}
  </table>

  <footer>
    <p>${e(t.thanks)}</p>
    ${storefrontUrl ? `<p>${e(storefrontUrl)}</p>` : ''}
    <p class="hint">${e(t.printHint)}</p>
  </footer>
</main>
</body>
</html>`;
}

module.exports = {
  storeYear,
  INVOICEABLE_PAYMENT_STATUSES,
  INVOICE_CSP,
  escapeHtml,
  formatInvoiceNumber,
  ensureInvoiceNumber,
  renderInvoiceHtml,
  resolveInvoiceLocale,
};
