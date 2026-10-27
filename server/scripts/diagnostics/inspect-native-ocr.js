const path = require('path');
const { SERVER_ROOT, UPLOAD_DIR } = require('../../src/config/paths');
const sharp = require('sharp');
const { execFileSync } = require('child_process');
(async () => {
  const src = path.join(UPLOAD_DIR, '1788588207561-kkkkkkkkkkkkkkkkk.webp');
  const out = path.join(SERVER_ROOT, 'debug.png');
  try {
    await sharp(src).png().toFile(out);
    console.log('Converted to PNG');
    const result = execFileSync('tesseract', [out, 'stdout', '-l', 'eng'], { encoding: 'utf8' });
    console.log('Tesseract output:\n', result);
  } catch (e) {
    console.error('Error:', e);
  }
})();
