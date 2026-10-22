import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const srcDir = 'assets/brand';
const outDir = 'public/icons';
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  { src: 'app-icon-source.svg',          out: 'icon-192.png',            size: 192 },
  { src: 'app-icon-source.svg',          out: 'icon-512.png',            size: 512 },
  { src: 'app-icon-maskable-source.svg', out: 'icon-maskable-512.png',   size: 512 },
  { src: 'app-icon-source.svg',          out: 'apple-touch-icon-180.png', size: 180 },
  { src: 'app-icon-source.svg',          out: 'favicon-32.png',          size: 32 },
];

for (const j of jobs) {
  await sharp(path.join(srcDir, j.src), { density: 384 })
    .resize(j.size, j.size)
    .flatten({ background: '#14120C' })
    .png()
    .toFile(path.join(outDir, j.out));
}
console.log('PWA icons generated in', outDir);
