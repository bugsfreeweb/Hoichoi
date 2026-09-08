import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const outDir = path.join(root, "apps", "desktop", "src-tauri", "icons");
fs.mkdirSync(outDir, { recursive: true });

function svg(size) {
  const s = String(size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <rect x="8" y="8" width="496" height="496" rx="96" fill="#0a0c10"/>
  <rect x="88" y="232" width="160" height="64" rx="32" fill="#c8f65d"/>
  <circle cx="348" cy="344" r="72" fill="#d2202c"/>
  <rect x="96" y="120" width="40" height="272" rx="20" fill="#f3eee1"/>
</svg>`;
}

async function png(size) {
  return sharp(Buffer.from(svg(size))).png().toBuffer();
}

function icoHeader(count) {
  const b = Buffer.alloc(6);
  b.writeUInt16LE(0, 0);
  b.writeUInt16LE(1, 2);
  b.writeUInt16LE(count, 4);
  return b;
}

function icoEntry(size, offset, byteLen) {
  const dim = size >= 256 ? 0 : size;
  const b = Buffer.alloc(16);
  b.writeUInt8(dim, 0);
  b.writeUInt8(dim, 1);
  b.writeUInt8(0, 2);
  b.writeUInt8(0, 3);
  b.writeUInt16LE(1, 4);
  b.writeUInt16LE(32, 6);
  b.writeUInt32LE(byteLen, 8);
  b.writeUInt32LE(offset, 12);
  return b;
}

const sizes = [16, 32, 48, 64, 128, 256];

const buffers = {};
for (const size of sizes) buffers[size] = await png(size);

await fs.promises.writeFile(path.join(outDir, "32x32.png"), buffers[32]);
await fs.promises.writeFile(path.join(outDir, "128x128.png"), buffers[128]);
await fs.promises.writeFile(path.join(outDir, "128x128@2x.png"), buffers[256]);
await fs.promises.writeFile(path.join(outDir, "icon.png"), buffers[256]);

let offset = 6 + sizes.length * 16;
const entries = [];
const chunks = [];
for (const size of sizes) {
  const data = buffers[size];
  entries.push(icoEntry(size, offset, data.length));
  chunks.push(data);
  offset += data.length;
}
const ico = Buffer.concat([icoHeader(sizes.length), ...entries, ...chunks]);
await fs.promises.writeFile(path.join(outDir, "icon.ico"), ico);

console.log("icons written to", outDir, "->", [32, 128, 256].map((s) => buffers[s].length).join(", "), "bytes");