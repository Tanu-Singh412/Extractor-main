const fs = require('fs');
const sharp = require('sharp');
const { ENABLE_OCR_PREPROCESS, OCR_PREPROCESS_OPTIONS } = require('../../config/extraction.config');
const { preprocessImage } = require('./image-preprocessing');
const { safeOcr } = require('./worker');
const { isPdfFile } = require('./pdf-detection');
const { hasMrzText, mergeNovelLines, scoreOcrText } = require('./text-quality');

async function ocrBestRotation(filePath, currentText) {
    let best = { text: currentText || '', score: scoreOcrText(currentText) };
    // Already good quality — skip rotation attempts
    if (best.score >= 50) {
        console.log(`[OCR] Rotation rescue skipped — initial score already good (${best.score})`);
        return best.text;
    }
    for (const angle of [90, 270, 180]) {
        try {
            const buf = await sharp(filePath).rotate(angle).greyscale().normalize().png().toBuffer();
            const data = await safeOcr(buf);
            const t = (data.text || '').trim(), sc = scoreOcrText(t);
            if (sc > best.score) {
                console.log(`[OCR] rotation ${angle}° wins (score ${sc} > ${best.score})`);
                best = { text: t, score: sc };
                // Stop if we found a clearly good result
                if (sc >= 80) break;
            }
        } catch (e) { console.warn(`[OCR] rotation ${angle} failed:`, e.message); }
    }
    return best.text;
}

async function ocrMrzStrip(filePath) {
    try {
        const meta = await sharp(filePath).metadata();
        const totalH = meta.height || 0;
        const totalW = meta.width || 1;
        if (totalH < 50) return '';

        // Pass A: Bottom 30% normalized
        const h1 = Math.max(60, Math.round(totalH * 0.30));
        const buf1 = await sharp(filePath)
            .extract({ left: 0, top: Math.max(0, totalH - h1), width: totalW, height: h1 })
            .resize({ width: 1500, withoutEnlargement: false })
            .greyscale().normalize().sharpen().png().toBuffer();
        const data1 = await safeOcr(buf1);
        const t1 = data1.text || '';
        if (hasMrzText(t1)) return t1;

        // Pass B: Bottom 35% with high contrast binarization for OCR-B
        const h2 = Math.max(70, Math.round(totalH * 0.35));
        const buf2 = await sharp(filePath)
            .extract({ left: 0, top: Math.max(0, totalH - h2), width: totalW, height: h2 })
            .resize({ width: 1600, withoutEnlargement: false })
            .greyscale().linear(1.5, -30).threshold(140).png().toBuffer();
        const data2 = await safeOcr(buf2);
        const t2 = data2.text || '';
        if (hasMrzText(t2)) return t2;

        return t1 || t2;
    } catch (e) { console.warn('[OCR] MRZ strip failed:', e.message); return ''; }
}

async function ocrDetailPass(filePath) {
    try {
        const buf = await sharp(filePath)
            .resize({ width: 1600, withoutEnlargement: false })
            .greyscale()
            .linear(1.35, -25)
            .sharpen({ sigma: 1.2 })
            .png()
            .toBuffer();
        const data = await safeOcr(buf);
        console.log('[OCR] Detail pass completed');
        return (data.text || '').trim();
    } catch (e) { console.warn('[OCR] detail pass failed:', e.message); return ''; }
}

async function ocrImageFile(filePath, originalName, ocrScannedPdf) {
    /* ★ Double guard: PDF yahan kabhi nahi pahunchne chahiye */
    if (isPdfFile(filePath)) {
        console.log('[OCR] ocrImageFile ko PDF mila — scanned-PDF handler pe route kar raha hoon');
        return ocrScannedPdf(filePath);
    }

    console.log('[OCR] Running Tesseract OCR on:', originalName || filePath);

    let imageBuffer;
    try {
        const fileBuf = fs.readFileSync(filePath);
        if (ENABLE_OCR_PREPROCESS) {
            try {
                imageBuffer = await preprocessImage(fileBuf, OCR_PREPROCESS_OPTIONS);
            } catch (prepErr) {
                console.warn('[OCR] Preprocess failed, falling back to raw image:', prepErr.message);
                imageBuffer = await sharp(fileBuf).greyscale().normalize().sharpen().png().toBuffer();
            }
        } else {
            imageBuffer = await sharp(fileBuf).greyscale().normalize().sharpen().png().toBuffer();
        }
    } catch (err) {
        console.warn('[OCR] File read or processing failed:', err.message);
        return '';
    }

    // Persistent worker
    const data = await safeOcr(imageBuffer);

    let finalText = (data.text || '').trim();
    console.log(`[OCR] Tesseract extracted ${finalText.length} chars`);

    if (finalText.replace(/\s/g, '').length < 40) {
        console.log('[OCR] Very little text detected — trying rotation rescue');
        finalText = await ocrBestRotation(filePath, finalText);
    }

    const passportish = /PASSPORT|PASSEPORT|PASAPORTE|REPUBLIC|KINGDOM|MRZ|BAILIWICK/i.test(finalText)
        || finalText.replace(/\s/g, '').length < 200;
    const insuranceish = /INSURANCE|ASSURANCE|POLICY|PREMIUM|INSURED|COVERAGE|EFFECTIVE|BIMA|POLISY|POUCY|POLCY|PERIOD\s*OF/i.test(finalText);

    // If passport MRZ is missing, run targeted strip rescue
    if (passportish && !hasMrzText(finalText)) {
        const strip = await ocrMrzStrip(filePath);
        if (strip && hasMrzText(strip)) {
            console.log('[OCR] MRZ recovered from bottom-strip pass');
            finalText = finalText + '\n' + strip;
        }
    }

    // Detail pass for passports if missing issue/expiry dates
    if (passportish) {
        const hasIssueLabel = /ISSUE|WYDANIA|DELIV|EFFECTIVE|VALID|PERIOD|COMMENCE/i.test(finalText);
        const dateCount = (finalText.match(/\d{1,2}[\/\-. ]\s*[A-Z]{3,9}[\/\-. ]\s*\d{2,4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/g) || []).length;
        if (!hasIssueLabel || dateCount < 2) {
            console.log('[OCR] Passport issue-date/dates missing — running detail pass');
            const detail = await ocrDetailPass(filePath);
            if (detail) finalText = mergeNovelLines(finalText, detail);
        }
    }

    // Detail pass for insurance documents to capture small print tables, policy numbers, dates
    if (insuranceish) {
        const hasPolicy = /(?:POL[I1L|!][CO0]?[YV]?|CERT(?:IFICATE)?|SCHEDULE)\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*[A-Z0-9\-\/]{5,}/i.test(finalText);
        const dateCount = (finalText.match(/\d{1,2}[\/\-. ](?:[A-Za-z]{3,9}|\d{1,2})[\/\-. ]\d{2,4}/g) || []).length;
        if (!hasPolicy || dateCount < 2) {
            console.log('[OCR] Insurance missing policy-no or validity dates — running detail pass');
            const detail = await ocrDetailPass(filePath);
            if (detail) finalText = mergeNovelLines(finalText, detail);
        }
    }

    return finalText;
}

module.exports = { ocrImageFile };
