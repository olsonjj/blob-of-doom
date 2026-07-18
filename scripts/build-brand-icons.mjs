#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';

const svg = readFileSync('assets/brand/icon.svg');

// Rasterize the brand PNGs
await sharp(svg, { density: 384 })
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile('public/logo512.png');

await sharp(svg, { density: 192 })
  .resize(192, 192)
  .png({ compressionLevel: 9 })
  .toFile('public/logo192.png');

// Build a multi-resolution .ico (16, 32, 48) containing PNG-encoded images.
// ICO directory format: header (6 bytes) + n * 16-byte entries, then image data.
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) {
  const buf = await sharp(svg, { density: s * 4 })
    .resize(s, s)
    .png({ compressionLevel: 9 })
    .toBuffer();
  pngs.push(buf);
}

const headerSize = 6 + sizes.length * 16;
const totalSize = headerSize + pngs.reduce((n, b) => n + b.length, 0);
const ico = Buffer.alloc(totalSize);
let off = 0;

// ICONDIR header
ico.writeUInt16LE(0, off); off += 2;          // reserved
ico.writeUInt16LE(1, off); off += 2;          // type = icon
ico.writeUInt16LE(sizes.length, off); off += 2; // count

// Directory entries
let imgOffset = headerSize;
for (let i = 0; i < sizes.length; i++) {
  const s = sizes[i];
  const b = pngs[i];
  ico.writeUInt8(s >= 256 ? 0 : s, off); off += 1;  // width
  ico.writeUInt8(s >= 256 ? 0 : s, off); off += 1;  // height
  ico.writeUInt8(0, off); off += 1;                  // palette
  ico.writeUInt8(0, off); off += 1;                  // reserved
  ico.writeUInt16LE(1, off); off += 2;               // planes
  ico.writeUInt16LE(32, off); off += 2;              // bpp
  ico.writeUInt32LE(b.length, off); off += 4;        // size
  ico.writeUInt32LE(imgOffset, off); off += 4;       // offset
  imgOffset += b.length;
}

// Image data
for (const b of pngs) {
  b.copy(ico, off);
  off += b.length;
}

writeFileSync('public/favicon.ico', ico);
console.log('✅ Generated public/favicon.ico, logo192.png, logo512.png');