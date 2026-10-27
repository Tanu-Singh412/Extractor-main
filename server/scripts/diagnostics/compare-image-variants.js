const path = require('path');
const { UPLOAD_DIR } = require('../../src/config/paths');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { parsePassportText } = require('../../src/parsers');

async function testImage(filePath) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${filePath}`);
    console.log('='.repeat(60));
    
    const rawBuffer = fs.readFileSync(filePath);
    
    // Convert to PNG - simple resize + sharpen only
    const pngBuf = await sharp(rawBuffer)
        .resize({ width: 2000, withoutEnlargement: true })
        .sharpen()
        .toFormat('png')
        .toBuffer();
    
    console.log(`PNG buffer size: ${pngBuf.length} bytes`);
    
    // Create rotation variants
    const buf0   = pngBuf;
    const buf90  = await sharp(pngBuf).rotate(90).toBuffer();
    const buf180 = await sharp(pngBuf).rotate(180).toBuffer();
    const buf270 = await sharp(pngBuf).rotate(270).toBuffer();
    const bufEnh = await sharp(pngBuf).grayscale().normalize().sharpen().toBuffer();
    
    // OCR all variants
    const [res0, res90, res180, res270, resEnh] = await Promise.all([
        Tesseract.recognize(buf0, 'eng'),
        Tesseract.recognize(buf90, 'eng'),
        Tesseract.recognize(buf180, 'eng'),
        Tesseract.recognize(buf270, 'eng'),
        Tesseract.recognize(bufEnh, 'eng')
    ]);
    
    const texts = [
        { text: res0.data.text, name: "0 deg" },
        { text: res90.data.text, name: "90 deg" },
        { text: res180.data.text, name: "180 deg" },
        { text: res270.data.text, name: "270 deg" },
        { text: resEnh.data.text, name: "Enhanced" }
    ];
    
    // Score each variant
    const scoreText = (t) => {
        if (!t || t.trim().length < 10) return -1000;
        let score = 0;
        if (/P<[A-Z]{3}/i.test(t)) score += 100;
        if (/[0-9A-Z<]{9}[0-9<][A-Z<]{3}[0-9A-Z<]{6}/i.test(t)) score += 80;
        if (/<{5,}/.test(t)) score += 30;
        const dateMatches = t.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g);
        if (dateMatches) score += dateMatches.length * 15;
        const passportKW = t.match(/(?:SURNAME|GIVEN|PASSPORT|REPUBLIC|INDIA|BIRTH|DATE|SEX|NATIONALITY|EXPIRY|ISSUE|AUTHORITY|SIGNATURE)/gi);
        if (passportKW) score += passportKW.length * 5;
        const noiseCount = (t.match(/[\{\}\[\]\~\`\_]/g) || []).length;
        score -= noiseCount * 2;
        score += Math.min(50, t.length / 100);
        return score;
    };
    
    let bestText = texts[0].text;
    let maxScore = scoreText(bestText);
    let bestVariant = texts[0].name;
    
    for (let i = 1; i < texts.length; i++) {
        const s = scoreText(texts[i].text);
        console.log(`  ${texts[i].name}: score=${s}, length=${texts[i].text.length}`);
        if (s > maxScore) {
            maxScore = s; bestText = texts[i].text; bestVariant = texts[i].name;
        }
    }
    
    console.log(`\nBest: ${bestVariant} (score: ${maxScore})`);
    console.log(`--- OCR Text (first 400 chars) ---`);
    console.log(bestText.slice(0, 400));
    console.log(`--- END ---`);
    
    // Parse
    const parsed = await parsePassportText(bestText);
    console.log(`\n--- PARSED DATA ---`);
    console.log(JSON.stringify(parsed, null, 2));
    
    return parsed;
}

(async () => {
    const files = fs.readdirSync(UPLOAD_DIR).filter(f => /\.(jpg|jpeg|png|webp|bmp)$/i.test(f));
    
    // Test first 3 unique images
    const tested = new Set();
    for (const f of files) {
        if (tested.size >= 3) break;
        // Skip duplicates by name pattern
        const baseName = f.replace(/^\d+-/, '');
        if (tested.has(baseName)) continue;
        tested.add(baseName);
        
        try {
            await testImage(path.join(UPLOAD_DIR, f));
        } catch (e) {
            console.error(`Error testing ${f}:`, e.message);
        }
    }
    
    console.log('\n\nDone!');
})();
