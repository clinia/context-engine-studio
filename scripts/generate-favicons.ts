import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { Resvg } from "@resvg/resvg-js";

const ROOT = resolve(__dirname, "..");
const svgContent = readFileSync(join(ROOT, "public/Logomark.svg"), "utf-8");

function renderPng(size: number): Buffer {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: "width", value: size },
  });
  return Buffer.from(resvg.render().asPng());
}

function buildIco(pngs: Buffer[]): Buffer {
  const count = pngs.length;
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + entrySize * count;

  const offsets: number[] = [];
  let offset = dataOffset;
  for (const png of pngs) {
    offsets.push(offset);
    offset += png.length;
  }

  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  // ICONDIR header
  ico.writeUInt16LE(0, 0); // reserved
  ico.writeUInt16LE(1, 2); // type: 1 = icon
  ico.writeUInt16LE(count, 4); // number of images

  // ICONDIRENTRY for each image
  for (let i = 0; i < count; i++) {
    const png = pngs[i];
    const base = headerSize + i * entrySize;

    // Read actual dimensions from PNG IHDR chunk (bytes 16-23)
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    ico.writeUInt8(width >= 256 ? 0 : width, base);
    ico.writeUInt8(height >= 256 ? 0 : height, base + 1);
    ico.writeUInt8(0, base + 2); // color count
    ico.writeUInt8(0, base + 3); // reserved
    ico.writeUInt16LE(1, base + 4); // planes
    ico.writeUInt16LE(32, base + 6); // bit count
    ico.writeUInt32LE(png.length, base + 8); // size
    ico.writeUInt32LE(offsets[i], base + 12); // offset
  }

  // Image data
  let pos = dataOffset;
  for (const png of pngs) {
    png.copy(ico, pos);
    pos += png.length;
  }

  return ico;
}

// Generate sizes
console.log("Rendering PNGs...");
const png16 = renderPng(16);
const png32 = renderPng(32);
const png48 = renderPng(48);
const png180 = renderPng(180);

// Write favicon.ico (16 + 32 + 48)
const ico = buildIco([png16, png32, png48]);
writeFileSync(join(ROOT, "src/app/favicon.ico"), ico);
console.log(`favicon.ico written (${ico.length} bytes)`);

// Write apple-icon.png
writeFileSync(join(ROOT, "src/app/apple-icon.png"), png180);
console.log(`apple-icon.png written (${png180.length} bytes)`);

// Write icon.svg (static copy for SVG favicon)
const svgOut = join(ROOT, "src/app/icon.svg");
writeFileSync(svgOut, svgContent);
console.log(`icon.svg written`);
