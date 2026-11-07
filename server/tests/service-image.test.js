const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serviceImage } = require('../lib/serviceImage');

test('images can be retained, removed, or saved', () => {
  assert.equal(serviceImage(undefined), undefined);
  assert.equal(serviceImage(''), '');
  assert.equal(serviceImage(null), '');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
  assert.equal(serviceImage(png), png);
});
test('rejects unsupported, disguised, malformed, and oversized images', () => {
  for (const value of ['https://example.com/image.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,aGVsbG8=', 'data:image/jpeg;base64,%%%=', {}, `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`]) {
    assert.throws(() => serviceImage(value), { status: 400 });
  }
});
