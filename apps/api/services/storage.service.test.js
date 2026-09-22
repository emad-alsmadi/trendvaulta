const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveExtension,
  buildFileName,
} = require('./storage.service');

describe('resolveExtension', () => {
  it('maps known image mimetypes to their canonical extension', () => {
    assert.equal(resolveExtension({ mimeType: 'image/jpeg' }), 'jpg');
    assert.equal(resolveExtension({ mimeType: 'image/png' }), 'png');
    assert.equal(resolveExtension({ mimeType: 'image/webp' }), 'webp');
    assert.equal(resolveExtension({ mimeType: 'image/gif' }), 'gif');
  });

  it('falls back to the original filename extension for unknown mimetypes', () => {
    assert.equal(
      resolveExtension({ mimeType: 'application/octet-stream', originalName: 'logo.PNG' }),
      'png',
    );
  });

  it('sanitizes an unsafe filename extension', () => {
    assert.equal(
      resolveExtension({ originalName: 'weird.na/me..sh' }),
      'sh',
    );
  });

  it('defaults to "bin" when nothing usable is available', () => {
    assert.equal(resolveExtension({}), 'bin');
    assert.equal(resolveExtension({ originalName: 'noextension' }), 'bin');
  });
});

describe('buildFileName', () => {
  it('produces a uuid-based filename with the resolved extension', () => {
    const name = buildFileName({ mimeType: 'image/webp' });
    assert.match(
      name,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/,
    );
  });

  it('produces distinct filenames on each call', () => {
    const a = buildFileName({ mimeType: 'image/png' });
    const b = buildFileName({ mimeType: 'image/png' });
    assert.notEqual(a, b);
  });
});
