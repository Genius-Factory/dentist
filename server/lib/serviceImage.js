const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function serviceImage(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return '';
  const invalid = () => { const error = new Error('Choose a JPG, PNG, or WebP image up to 2 MB.'); error.status = 400; throw error; };
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 32) return invalid();
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return invalid();
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2]) return invalid();
  const valid = match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) return invalid();
  return value;
}

module.exports = { serviceImage };
