import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Array.from({ length: 256 }, (_, entry) => {
  let crc = entry;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export interface RgbaImage { width: number; height: number; pixels: Buffer }

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Only the project's bounded, non-interlaced RGBA8 PNGs; never an upload decoder. */
export function decodeRgbaPng(bytes: Buffer, maxDimension = 1024, maxBytes = 4 * 1024 * 1024): RgbaImage {
  if (bytes.length < 57 || bytes.length > maxBytes || !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error('Invalid portrait PNG signature or size');
  let offset = 8, width = 0, height = 0, ended = false, dataEnded = false;
  const data: Buffer[] = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('Truncated portrait PNG chunk');
    const length = bytes.readUInt32BE(offset);
    if (length > maxBytes || offset + 12 + length > bytes.length) throw new Error('Invalid portrait PNG chunk size');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const content = bytes.subarray(offset + 8, offset + 8 + length);
    if (!/^[A-Za-z]{4}$/.test(type) || crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length)) throw new Error('Invalid portrait PNG chunk checksum');
    if (offset === 8 && type !== 'IHDR') throw new Error('Missing portrait PNG header');
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) throw new Error('Invalid portrait PNG header');
      width = content.readUInt32BE(0); height = content.readUInt32BE(4);
      if (width < 1 || height < 1 || width > maxDimension || height > maxDimension || width * height * 4 > maxBytes
        || content[8] !== 8 || content[9] !== 6 || content[10] !== 0 || content[11] !== 0 || content[12] !== 0) throw new Error('Unsupported portrait PNG dimensions or format');
    } else if (type === 'IDAT') {
      if (dataEnded || !width) throw new Error('Invalid portrait PNG data order');
      data.push(content);
    } else if (type === 'IEND') {
      if (length !== 0 || data.length === 0 || offset + 12 !== bytes.length) throw new Error('Invalid portrait PNG end');
      ended = true;
    } else {
      // Palette/animation/foreign critical chunks are not part of the accepted RGBA8 format.
      if (type[0] === type[0].toUpperCase() || ['acTL', 'fcTL', 'fdAT'].includes(type)) throw new Error('Unsupported portrait PNG chunk');
      if (data.length) dataEnded = true;
    }
    offset += 12 + length;
  }
  if (!ended) throw new Error('Incomplete portrait PNG');
  const stride = width * 4;
  const expected = (stride + 1) * height;
  const raw = inflateSync(Buffer.concat(data), { maxOutputLength: expected });
  if (raw.length !== expected) throw new Error('Invalid portrait PNG pixel data length');
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error('Unsupported portrait PNG filter');
    for (let x = 0; x < stride; x += 1) {
      const index = y * stride + x;
      const left = x >= 4 ? pixels[index - 4] : 0;
      const above = y > 0 ? pixels[index - stride] : 0;
      const upperLeft = x >= 4 && y > 0 ? pixels[index - stride - 4] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : paeth(left, above, upperLeft);
      pixels[index] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return { width, height, pixels };
}

function chunk(type: string, bytes: Buffer): Buffer {
  const result = Buffer.alloc(bytes.length + 12);
  result.writeUInt32BE(bytes.length, 0);
  result.write(type, 4, 4, 'ascii');
  bytes.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, bytes.length + 8)), bytes.length + 8);
  return result;
}

/** Stable PNG bytes, no timestamps, text, profiles, EXIF or embedded URLs. */
export function encodeRgbaPng(image: RgbaImage): Buffer {
  const { width, height, pixels } = image;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 1024 || height > 1024 || pixels.length !== width * height * 4) throw new Error('Invalid portrait pixels');
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
