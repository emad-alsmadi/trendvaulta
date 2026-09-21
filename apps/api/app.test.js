const { describe, it } = require('node:test');
const assert = require('node:assert');

// Smoke test: the Express app must load with every router/controller/model
// resolvable. Catches broken requires (e.g. a missing middleware file) that
// would otherwise crash `node app.js` at boot without any unit test failing.
describe('app bootstrap', () => {
  it('requires app.js without throwing', () => {
    process.env.JWT_SECRET_KEY ||= 'test-secret';
    process.env.NODE_ENV ||= 'test';
    const app = require('./app');
    assert.strictEqual(typeof app, 'function');
    assert.strictEqual(typeof app.listen, 'function');
  });
});
