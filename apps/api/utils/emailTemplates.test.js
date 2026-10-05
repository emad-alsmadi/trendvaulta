const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EMAIL_KINDS, renderEmail, resolveEmailLocale } = require('./emailTemplates');

const VARS = {
  orderId: '64b7f0c2a1b2c3d4e5f60718',
  orderUrl: 'https://shop.example/user/orders/64b7f0c2a1b2c3d4e5f60718',
  totalPrice: 107.7,
  refundAmount: 25,
  trackingNumber: '1Z999',
  trackingCarrier: 'UPS',
  note: 'Use the prepaid label',
  name: 'Layla',
  newEmail: 'new@example.com',
  link: 'https://shop.example/auth/verify-email?token=abc',
  resetUrl: 'https://shop.example/password/forgot-password',
};

describe('renderEmail', () => {
  it('has every kind in both languages, with no placeholder left unfilled', () => {
    // 5 order, 4 return, 4 account emails (OPS-712 added passwordReset)
    assert.equal(EMAIL_KINDS.length, 13);
    for (const kind of EMAIL_KINDS) {
      for (const locale of ['en', 'ar']) {
        const { subject, text, html } = renderEmail(kind, locale, VARS);
        for (const [part, value] of Object.entries({ subject, text, html })) {
          assert.ok(value.length > 0, `${kind}/${locale} ${part}`);
          assert.equal(/\{\w+\}/.test(value), false, `${kind}/${locale} ${part} has a leftover placeholder`);
        }
      }
    }
  });

  it('writes Arabic right-to-left with Latin digits, English left-to-right', () => {
    const ar = renderEmail('orderConfirmed', 'ar', VARS);
    assert.match(ar.html, /<html lang="ar" dir="rtl">/);
    assert.match(ar.subject, /تم تأكيد طلبك #E5F60718/);
    assert.match(ar.text, /107\.70/);
    assert.equal(/[٠-٩]/.test(ar.text + ar.html), false);

    const en = renderEmail('orderConfirmed', 'en', VARS);
    assert.match(en.html, /<html lang="en" dir="ltr">/);
    assert.equal(en.subject, 'Order confirmed #E5F60718');
    assert.match(en.text, /\$107\.70/);
  });

  it('puts the action link in both parts', () => {
    const { text, html } = renderEmail('orderShipped', 'en', VARS);
    assert.ok(text.includes(`Track your order: ${VARS.orderUrl}`));
    assert.ok(html.includes(`href="${VARS.orderUrl}"`));
    assert.ok(text.includes('Tracking: 1Z999 (UPS)'));
  });

  it('escapes variables in the HTML part', () => {
    const { html } = renderEmail('returnRejected', 'en', { ...VARS, note: '<script>alert(1)</script>' });
    assert.equal(html.includes('<script>'), false);
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('drops a line whose only content was an empty variable', () => {
    const { text } = renderEmail('returnApproved', 'en', { ...VARS, note: '' });
    assert.equal(/\n\n\n/.test(text.split('—')[0]), false);
  });

  it('falls back to English for an unknown language, and rejects unknown kinds', () => {
    assert.equal(resolveEmailLocale('fr'), 'en');
    assert.equal(renderEmail('orderDelivered', 'fr', VARS).subject, renderEmail('orderDelivered', 'en', VARS).subject);
    assert.throws(() => renderEmail('nope', 'en', VARS), /Unknown email template/);
  });
});
