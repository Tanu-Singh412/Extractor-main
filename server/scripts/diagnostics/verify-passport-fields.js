const { UPLOAD_DIR } = require('../../src/config/paths');
// verify_passport_fields.js
// This script scans uploaded passport images, runs OCR + parsing, and reports any missing or empty fields.
// It uses the existing `parsePassportText` function from parser.js and the OCR pipeline from test_all_images.js.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { parsePassportText } = require('../../src/parsers');

// Reuse the OCR variant logic from test_all_images.js (simplified to main variant)
async function ocrImage(buffer) {
  // Basic preprocessing: resize to max width 2000, sharpen, grayscale, normalize
  const processed = await sharp(buffer)
    .resize({ width: 2000, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
  const { data } = await Tesseract.recognize(processed, 'eng');
  return data.text;
}

function checkAllFields(result) {
  const required = [
    'passportNo',
    'surname',
    'givenNames',
    'issuingCountry',
    'nationality',
    'dob',
    'doe',
    'sex'
  ];
  const missing = required.filter(key => !result[key] || result[key].trim() === '');
  return missing;
}

async function verifyFile(filePath) {
  console.log(`\n=== Verifying ${filePath} ===`);
  const raw = fs.readFileSync(filePath);
  const text = await ocrImage(raw);
  const parsed = await parsePassportText(text);
  const missing = checkAllFields(parsed);
  if (missing.length === 0) {
    console.log('✅ All fields extracted successfully.');
  } else {
    console.log('⚠️ Missing/empty fields:', missing.join(', '));
    console.log('Extracted data:', JSON.stringify(parsed, null, 2));
  }
}

(async () => {
  const uploadDir = UPLOAD_DIR;
  if (!fs.existsSync(uploadDir)) {
    console.error('Uploads directory not found:', uploadDir);
    process.exit(1);
  }
  const imageFiles = fs.readdirSync(uploadDir)
    .filter(f => /\.(jpe?g|png|webp|bmp)$/i.test(f))
    .map(f => path.join(uploadDir, f));

  if (imageFiles.length === 0) {
    console.log('No images found in uploads folder.');
    return;
  }

  // Process each image sequentially to avoid overwhelming Tesseract workers.
  for (const file of imageFiles) {
    try {
      await verifyFile(file);
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }

  console.log('\nVerification completed.');
})();
