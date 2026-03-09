const fs = require('fs');
const path = require('path');

// Minimal valid 16x16 ICO (single blue pixel style, rest transparent)
// ICO: 6 byte header + 16 byte dir entry + 40 byte BITMAPINFOHEADER + 16*16*4 (XOR) + 8 (AND mask)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = 16;  // width
entry[1] = 16;  // height
entry[2] = 0;
entry[3] = 0;
entry[4] = 1;   // planes
entry[5] = 0;
entry[6] = 32;  // bpp
entry[7] = 0;
const bmpSize = 40 + 16 * 16 * 4 + 16 * 2; // info + XOR + AND mask (16 rows × 2 bytes)
entry.writeUInt32LE(bmpSize, 8);
entry.writeUInt32LE(22, 12); // offset to image

const info = Buffer.alloc(40);
info.writeUInt32LE(40, 0);      // size
info.writeUInt32LE(16, 4);      // width
info.writeUInt32LE(32, 8);      // height (double for ICO)
info.writeUInt16LE(1, 12);      // planes
info.writeUInt16LE(32, 14);     // bpp
info.writeUInt32LE(0, 16);     // compression
info.writeUInt32LE(16 * 16 * 4, 20); // image size
info.writeUInt32LE(0, 24);
info.writeUInt32LE(0, 28);
info.writeUInt32LE(0, 32);
info.writeUInt32LE(0, 36);

// 16x16 BGRA (bottom-up), blue #2563eb
const r = 0x25, g = 0x63, b = 0xeb;
const xor = Buffer.alloc(16 * 16 * 4);
for (let i = 0; i < 16 * 16; i++) {
  xor[i * 4 + 0] = b;
  xor[i * 4 + 1] = g;
  xor[i * 4 + 2] = r;
  xor[i * 4 + 3] = 255;
}
const andMask = Buffer.alloc(32); // 16 rows, 2 bytes each, padded to 4 bytes per row = 32

const ico = Buffer.concat([header, entry, info, xor, andMask]);
const outDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'favicon.ico'), ico);
console.log('Generated public/favicon.ico');
