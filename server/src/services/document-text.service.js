const fs = require('fs');
const { OCR_OUTPUT_FILE } = require('../config/paths');
const { FORCE_OCR_FOR_PDF } = require('../config/extraction.config');
const { isPdfFile } = require('./ocr/pdf-detection');
const { ocrImageFile } = require('./ocr/image-ocr.service');
const { extractEmbeddedPdfText, ocrPdfWithBestEngine, ocrScannedPdf } = require('./ocr/pdf-ocr.service');

async function extractTextFromFile(filePath, originalName) {
    const nameIsPdf = String(originalName || '').toLowerCase().endsWith('.pdf');
    const fileIsPdf = isPdfFile(filePath);

    if (nameIsPdf || fileIsPdf) {
        console.log('[OCR] PDF detected');
        const embedded = await extractEmbeddedPdfText(filePath);
        const needsOcr = FORCE_OCR_FOR_PDF || !embedded || embedded.length < 300;
        if (!needsOcr && embedded) {
            console.log('[OCR] Using embedded PDF text (no OCR needed)');
            try { fs.writeFileSync(OCR_OUTPUT_FILE, embedded); } catch { }
            return embedded;
        }
        console.log('[OCR] Embedded text insufficient — using best OCR engine');
        // ocrPdfWithBestEngine already tries fallback internally — no need to call ocrScannedPdf again
        const finalText = await ocrPdfWithBestEngine(filePath);
        try { fs.writeFileSync(OCR_OUTPUT_FILE, finalText); } catch { }
        return finalText;
    }
    // Fallback OCR for non-PDF files
    const finalText = await ocrImageFile(filePath, originalName, ocrScannedPdf);
    try { fs.writeFileSync(OCR_OUTPUT_FILE, finalText); } catch { }
    return finalText;
}

module.exports = { extractTextFromFile };
