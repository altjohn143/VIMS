const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const roots = [path.join(__dirname, '..', 'public', 'images'), path.join(__dirname, '..', 'src', 'assets')];

async function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;
  const full = file;
  const webpPath = full.replace(ext, '.webp');
  try {
    const img = sharp(full);
    // create optimized original (overwrite)
    if (ext === '.png') {
      await img.png({ quality: 80, compressionLevel: 8 }).toFile(full + '.opt');
    } else {
      await img.jpeg({ quality: 80 }).toFile(full + '.opt');
    }
    // generate webp
    await img.webp({ quality: 80 }).toFile(webpPath);
    // replace original with optimized
    await fs.promises.rename(full + '.opt', full);
    console.log('Optimized:', path.relative(process.cwd(), full));
  } catch (e) {
    console.error('Failed to process', full, e.message);
  }
}

async function walk(dir) {
  let entries = [];
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(full);
    else await processFile(full);
  }
}

(async () => {
  for (const r of roots) await walk(r);
  console.log('Image optimization complete');
})();
