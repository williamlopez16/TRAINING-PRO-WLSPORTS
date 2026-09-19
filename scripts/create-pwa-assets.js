import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, bgColor, drawSymbol = true) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: filter byte 0 + RGBA per pixel per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const [bgR, bgG, bgB, bgA] = bgColor;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background
      let r = bgR;
      let g = bgG;
      let b = bgB;
      let a = bgA;

      // Draw rounded emblem / trophy shield shape
      if (drawSymbol) {
        if (dist < radius) {
          // Inside emblem circle / shield
          const innerDist = Math.abs(dist - radius * 0.7);
          if (dist < radius * 0.75) {
            // White trophy / W shape
            r = 255;
            g = 255;
            b = 255;
            a = 255;
          } else {
            // Glow border
            r = Math.min(255, bgR + 40);
            g = Math.min(255, bgG + 60);
            b = Math.min(255, bgB + 80);
            a = 255;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuffer, data]);
  crcBuffer.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = c ^ buf[n];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

// Blue color #2563eb -> [37, 99, 235, 255]
const blue = [37, 99, 235, 255];

fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, blue));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, blue));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, blue));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, blue));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#2563eb"/>
  <circle cx="256" cy="256" r="180" fill="url(#grad)" opacity="0.15"/>
  <path d="M160 160h192v64c0 53.02-42.98 96-96 96s-96-42.98-96-96v-64z" fill="#ffffff"/>
  <path d="M224 320h64v64h-64zM176 384h160v32H176z" fill="#ffffff"/>
  <path d="M160 192H112c0 35.35 28.65 64 64 64v-32c-17.67 0-32-14.33-32-32h16zm192 0h48c0 35.35-28.65 64-64 64v-32c17.67 0 32-14.33 32-32h-16z" fill="#ffffff" opacity="0.8"/>
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </radialGradient>
  </defs>
</svg>`;

fs.writeFileSync('./public/favicon.svg', svg);
fs.writeFileSync('./public/icon.svg', svg);
console.log('PWA assets generated in public/');
