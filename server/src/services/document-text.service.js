const fs = require('fs');
const { OCR_OUTPUT_FILE } = require('../config/paths');
const { FORCE_OCR_FOR_PDF } = require('../config/extraction.config');
const { isPdfFile } = require('./ocr/pdf-detection');
const { ocrImageFile } = require('./ocr/image-ocr.service');
const { extractEmbeddedPdfText, ocrPdfWithBestEngine, ocrScannedPdf } = require('./ocr/pdf-ocr.service');
const { mergeNovelLines } = require('./ocr/text-quality');

function hasKeyDocumentIdentifiers(text) {
    if (!text) return false;
    const upper = text.toUpperCase();
    const hasPassportSignals = /P<[A-Z]{3}/.test(upper) || /PASSPORT\s*(?:NO|NUMBER)/.test(upper);
    const hasInsuranceSignals = /(?:POLICY|CERTIFICATE|SCHEDULE|COVER\s*NOTE)\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*[A-Z0-9\-\/]{5,}/i.test(upper);
    const hasDates = (upper.match(/\b(?:\d{1,2}[\/\-. ](?:[A-Za-z]{3,9}|\d{1,2})[\/\-. ]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/g) || []).length >= 2;
    return (hasPassportSignals || hasInsuranceSignals) && hasDates;
}

async function extractTextFromFile(filePath, originalName) {
    const nameIsPdf = String(originalName || '').toLowerCase().endsWith('.pdf');
    const fileIsPdf = isPdfFile(filePath);

    if (nameIsPdf || fileIsPdf) {
        console.log('[OCR] PDF detected');
        let embedded = '';
        try {
            embedded = await extractEmbeddedPdfText(filePath);
        } catch (e) {
            console.warn('[OCR] extractEmbeddedPdfText failed:', e.message);
        }

        const isRichEmbedded = embedded && embedded.length >= 400 && hasKeyDocumentIdentifiers(embedded);
        const needsOcr = FORCE_OCR_FOR_PDF || !embedded || !isRichEmbedded;

        if (!needsOcr) {
            console.log('[OCR] Using rich embedded PDF text (no OCR needed)');
            try { fs.writeFileSync(OCR_OUTPUT_FILE, embedded); } catch { }
            return embedded;
        }

        console.log('[OCR] Running OCR on PDF pages with best engine');
        const ocrText = await ocrPdfWithBestEngine(filePath);

        // If embedded text had partial words, merge with OCR text for maximum accuracy
        let finalText = ocrText;
        if (embedded && embedded.length > 50 && ocrText) {
            finalText = mergeNovelLines(ocrText, embedded);
        } else if (!ocrText && embedded) {
            finalText = embedded;
        }

        try { fs.writeFileSync(OCR_OUTPUT_FILE, finalText); } catch { }
        return finalText;
    }

    // Image files (JPG, PNG, TIFF, WEBP, etc.)
    const finalText = await ocrImageFile(filePath, originalName, ocrScannedPdf);
    try { fs.writeFileSync(OCR_OUTPUT_FILE, finalText); } catch { }
    return finalText;
}

module.exports = { extractTextFromFile };
