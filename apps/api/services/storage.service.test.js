const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveExtension,
  buildFileName,
  uploadToCloudinary,
  signCloudinaryParams,
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

describe('uploadToCloudinary', () => {
  const realFetch = global.fetch;
  const saved = {};
  let sent;

  beforeEach(() => {
    for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_FOLDER']) {
      saved[k] = process.env[k];
    }
    Object.assign(process.env, {
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      CLOUDINARY_FOLDER: 'trendvaulta',
    });
    sent = null;
    global.fetch = async (url, init) => {
      sent = { url, form: Object.fromEntries(init.body.entries()) };
      return new Response(
        JSON.stringify({ public_id: `trendvaulta/${sent.form.public_id}`, secure_url: 'https://res.cloudinary.com/demo/x.png' }),
        { status: 200 },
      );
    };
  });

  afterEach(() => {
    global.fetch = realFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('pins the public id and signs overwrite=false when one is given (re-runnable migration)', async () => {
    const res = await uploadToCloudinary(Buffer.from('img'), { mimeType: 'image/png' }, { publicId: 'uuid-1' });

    assert.equal(res.url, 'https://res.cloudinary.com/demo/x.png');
    assert.equal(sent.url, 'https://api.cloudinary.com/v1_1/demo/image/upload');
    assert.equal(sent.form.public_id, 'uuid-1');
    assert.equal(sent.form.overwrite, 'false');
    const signed = {
      folder: 'trendvaulta',
      public_id: 'uuid-1',
      timestamp: sent.form.timestamp,
      overwrite: 'false',
    };
    assert.equal(sent.form.signature, signCloudinaryParams(signed, 'secret'));
  });

  it('keeps random ids and default overwriting for ordinary uploads', async () => {
    await uploadToCloudinary(Buffer.from('img'), { mimeType: 'image/png' });
    assert.match(sent.form.public_id, /^[0-9a-f-]{36}$/);
    assert.equal('overwrite' in sent.form, false);
  });
});
