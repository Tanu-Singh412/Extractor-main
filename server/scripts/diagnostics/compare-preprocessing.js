const path = require('path');
const { UPLOAD_DIR } = require('../../src/config/paths');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { parsePassportText } = require('../../src/parsers');

async function testImage(filePath) {
    console.log(`\nTesting: ${filePath}`);
    
    const rawBuffer = fs.readFileSync(filePath);
    
    // Convert to PNG
    const pngBuf = await sharp(rawBuffer)
        .resize({ width: 2000, withoutEnlargement: true })
        .toFormat('png')
        .toBuffer();
    
    // Create 8 variants
    const variants = [
        { name: "Color", buf: pngBuf },
        { name: "Sharpen", buf: await sharp(pngBuf).sharpen().toBuffer() },
        { name: "Grayscale", buf: await sharp(pngBuf).grayscale().toBuffer() },
        { name: "Gray+Norm", buf: await sharp(pngBuf).grayscale().normalize().toBuffer() },
        { name: "Gray+Sharp", buf: await sharp(pngBuf).grayscale().sharpen({ sigma: 3 }).toBuffer() },
        { name: "Threshold", buf: await sharp(pngBuf).grayscale().threshold(140).toBuffer() },
        { name: "Rot90", buf: await sharp(pngBuf).rotate(90).toBuffer() },
        { name: "Rot270", buf: await sharp(pngBuf).rotate(270).toBuffer() },
    ];
    
    // OCR all
    const ocrResults = await Promise.all(
        variants.map(v => Tesseract.recognize(v.buf, 'eng'))
    );
    
    const texts = ocrResults.map((r, i) => ({
        text: r.data.text,
        name: variants[i].name
    }));
    
    // Score
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
    
    // Print all scores
    for (const t of texts) {
        const s = scoreText(t.text);
        console.log(`  ${t.name}: score=${s}, len=${t.text.length}, first80="${t.text.slice(0,80).replace(/\n/g,'\\n')}"`);
    }
    
    let best = texts[0];
    let maxScore = scoreText(best.text);
    for (let i = 1; i < texts.length; i++) {
        const s = scoreText(texts[i].text);
        if (s > maxScore) { maxScore = s; best = texts[i]; }
    }
    
    console.log(`\nBest: ${best.name} (score: ${maxScore})`);
    console.log(`--- Full OCR ---`);
    console.log(best.text);
    console.log(`--- END ---`);
    
    const parsed = await parsePassportText(best.text);
    console.log(`\n--- PARSED ---`);
    console.log(JSON.stringify(parsed, null, 2));
}

(async () => {
    // Test the problematic SHAH NIYATI image (the latest uploaded ones)
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const f of files) {
        if (f.includes('yyyyy') || f.includes('1.webp')) {
            await testImage(path.join(UPLOAD_DIR, f));
        }
    }
    // Also test the main passport
    for (const f of files) {
        if (f.includes('kkkkk')) {
            await testImage(path.join(UPLOAD_DIR, f));
            break;
        }
    }
    console.log('\nDone!');
})();
