const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml,
  formatInvoiceNumber,
  renderInvoiceHtml,
  resolveInvoiceLocale,
  storeYear,
  INVOICE_CSP,
} = require('./invoice');

const XSS = '<script>alert(1)</script>';

function order(overrides = {}) {
  return {
    _id: '64b7f0c2a1b2c3d4e5f60718',
    invoiceNumber: 'TV-2026-000042',
    paymentStatus: 'paid',
    paidAt: new Date('2026-09-29T10:00:00Z'),
    createdAt: new Date('2026-09-29T09:55:00Z'),
    shippingAddress: {
      name: 'Grace Hopper',
      phone: '0123456789',
      address: '1 Harbour St',
      city: 'Arlington',
      zip: '22201',
      country: 'US',
    },
    delivery: true,
    shippingMethod: 'standard',
    items: [
      { title: 'Linen Shirt', qty: 2, price: 25, variant: { size: 'M', color: 'Sand', sku: 'LS-M' } },
      { title: 'Lip Balm', qty: 1, price: 4.5 },
    ],
    itemsPrice: 54.5,
    discountAmount: 5,
    couponCode: 'SAVE5',
    shippingPrice: 5,
    taxPrice: 0,
    totalPrice: 54.5,
    amountPaid: 54.5,
    refundAmount: 0,
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes every character that can break out of text or an attribute', () => {
    assert.equal(escapeHtml(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });

  it('renders null and undefined as nothing, numbers as text', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(0), '0');
  });
});

describe('formatInvoiceNumber', () => {
  it('pads the yearly sequence to six digits', () => {
    assert.equal(formatInvoiceNumber('TV', 2026, 123), 'TV-2026-000123');
  });

  it('keeps only letters and digits in the prefix, falling back to TV', () => {
    assert.equal(formatInvoiceNumber('ab-c', 2026, 1), 'ABC-2026-000001');
    assert.equal(formatInvoiceNumber('', 2026, 1), 'TV-2026-000001');
    assert.equal(formatInvoiceNumber('<x>', 2026, 1), 'X-2026-000001');
  });
});

describe('renderInvoiceHtml', () => {
  it('escapes customer- and admin-controlled text everywhere', () => {
    const html = renderInvoiceHtml({
      order: order({
        shippingAddress: { name: XSS, address: XSS, city: XSS, zip: XSS, phone: XSS, country: XSS },
        items: [{ title: XSS, qty: 1, price: 1, variant: { size: XSS, color: XSS, sku: XSS } }],
        couponCode: XSS,
      }),
      settings: {
        storeName: XSS,
        contactEmail: XSS,
        invoice: { legalName: XSS, address: `${XSS}\n${XSS}`, taxId: XSS },
      },
    });

    assert.equal(html.includes('<script'), false);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  });

  it('forbids scripts through its own CSP meta, not just the response header', () => {
    const html = renderInvoiceHtml({ order: order() });
    assert.ok(html.includes(`<meta http-equiv="Content-Security-Policy" content="${escapeHtml(INVOICE_CSP)}">`));
    assert.match(INVOICE_CSP, /default-src 'none'/);
    assert.equal(/script-src/.test(INVOICE_CSP), false);
  });

  it('shows the number, lines with variants, discount, totals and the seller block', () => {
    const html = renderInvoiceHtml({
      order: order(),
      settings: {
        storeName: 'TrendVaulta',
        invoice: { legalName: 'TrendVaulta LLC', address: 'Line 1\nLine 2', taxId: '300123456700003' },
      },
    });

    assert.ok(html.includes('TV-2026-000042'));
    assert.ok(html.includes('TrendVaulta LLC'));
    assert.ok(html.includes('Line 1<br>Line 2'));
    assert.ok(html.includes('Tax ID: <bdi>300123456700003</bdi>'));
    assert.ok(html.includes('Size: M · Color: Sand'));
    assert.ok(html.includes('SKU LS-M'));
    assert.ok(html.includes('Discount (SAVE5)'));
    assert.ok(html.includes('$50.00'), 'line total 2 × 25');
    assert.ok(html.includes('$54.50'));
    assert.ok(html.includes('<html lang="en" dir="ltr">'));
  });

  it('renders Arabic right-to-left with Latin digits', () => {
    const html = renderInvoiceHtml({ order: order({ delivery: false, shippingMethod: 'none' }), locale: 'ar' });
    assert.ok(html.includes('<html lang="ar" dir="rtl">'));
    assert.ok(html.includes('فاتورة'));
    assert.ok(html.includes('استلام من المتجر'));
    assert.match(html, /54\.50/);
    assert.equal(/[٠-٩]/.test(html), false, 'no Arabic-Indic digits');
  });

  it('labels refunded and partly refunded payments', () => {
    const refunded = renderInvoiceHtml({ order: order({ paymentStatus: 'refunded', refundAmount: 54.5 }) });
    assert.ok(refunded.includes('badge refunded">Refunded'));
    assert.ok(refunded.includes('−$54.50'));

    const partial = renderInvoiceHtml({ order: order({ refundAmount: 10 }) });
    assert.ok(partial.includes('>Partly refunded<'));
  });

  it('prints dates and picks the number year in STORE_TIMEZONE, surviving a mistyped zone', () => {
    const paidAt = new Date('2026-12-31T22:30:00Z');
    const late = order({ paidAt });
    const saved = process.env.STORE_TIMEZONE;
    try {
      process.env.STORE_TIMEZONE = 'Asia/Riyadh'; // UTC+3: already Jan 1
      assert.ok(renderInvoiceHtml({ order: late }).includes('January 1, 2027'));
      assert.equal(storeYear(paidAt), 2027);
      process.env.STORE_TIMEZONE = 'Mars/Olympus';
      assert.ok(renderInvoiceHtml({ order: late }).includes('December 31, 2026'));
      assert.equal(storeYear(paidAt), 2026);
    } finally {
      if (saved === undefined) delete process.env.STORE_TIMEZONE;
      else process.env.STORE_TIMEZONE = saved;
    }
  });

  it('only accepts en and ar', () => {
    assert.equal(resolveInvoiceLocale('ar'), 'ar');
    assert.equal(resolveInvoiceLocale('fr'), 'en');
    assert.equal(resolveInvoiceLocale(['ar']), 'en');
  });
});
