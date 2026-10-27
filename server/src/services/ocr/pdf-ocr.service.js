const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../../config/paths');
const { ocrImageFile } = require('./image-ocr.service');
const { scoreOcrText } = require('./text-quality');

let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }
let pdfPoppler = null;
try { pdfPoppler = require('pdf-poppler'); } catch { pdfPoppler = null; }
let pdfToImg = null;
try { pdfToImg = require('pdf-to-img'); } catch { pdfToImg = null; }

console.log(`[OCR] PDF engines — pdf-parse: ${!!pdfParse} | pdf-poppler: ${!!pdfPoppler} | pdf-to-img: ${!!pdfToImg}`);

async function ocrPdfViaPdfToImg(filePath) {
    const { pdf } = pdfToImg;
    const document = await pdf(filePath, { scale: 2.5 });
    const texts = [];
    let i = 0;
    for await (const img of document) {
        i++;
        const pagePath = path.join(UPLOAD_DIR, `p2i_${Date.now()}_${i}.png`);
        fs.writeFileSync(pagePath, img);
        console.log(`[OCR] pdf-to-img: page ${i} rendered`);
        const t = await ocrImageFile(pagePath, `page-${i}.png`, ocrScannedPdf);
        texts.push(t);
        try { fs.unlinkSync(pagePath); } catch { }
    }
    return texts.filter(Boolean).join('\n\n');
}

/* Scanned PDF → pages render → har page OCR. Engine 1: poppler, Engine 2: pdf-to-img */
async function ocrScannedPdf(filePath) {
    let text = '';

    // Engine 1: pdf-poppler
    if (pdfPoppler) {
        const outDir = path.join(UPLOAD_DIR, 'pdfpages_' + Date.now());
        fs.mkdirSync(outDir, { recursive: true });
        try {
            await pdfPoppler.convert(filePath, {
                format: 'png',
                scale: 2.5,
                out_dir: outDir,
                out_prefix: 'pg',
            });
            const pages = fs.readdirSync(outDir)
                .filter(f => f.startsWith('pg') && f.toLowerCase().endsWith('.png'))
                .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));
            console.log(`[OCR] pdf-poppler: ${pages.length} page(s) rendered`);
            const texts = [];
            for (const p of pages) {
                const pagePath = path.join(outDir, p);
                texts.push(await ocrImageFile(pagePath, p, ocrScannedPdf));
                try { fs.unlinkSync(pagePath); } catch { }
            }
            text = texts.filter(Boolean).join('\n\n');
        } catch (e) {
            console.warn('[OCR] pdf-poppler failed:', e.message);
        } finally {
            try { fs.rmSync(outDir, { recursive: true, force: true }); } catch { }
        }
    } else {
        console.warn('[OCR] pdf-poppler not loaded — trying pdf-to-img engine');
    }

    // Engine 2 fallback:   pdf-to-img
    if ((!text || text.length < 20) && pdfToImg) {
        console.log('[OCR] Falling back to pdf-to-img engine');
        try {
            text = await ocrPdfViaPdfToImg(filePath);
        } catch (e) {
            console.warn('[OCR] pdf-to-img also failed:', e.message);
        }
    }

    return text;
}

async function extractEmbeddedPdfText(filePath) {
    if (!pdfParse) return '';
    const buf = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buf);
    return (pdfData.text || '').trim();
}

async function ocrPdfWithBestEngine(filePath) {
    // Try poppler first — agar achha result mila to pdf-to-img skip karo
    if (pdfPoppler) {
        try {
            const txt = await ocrScannedPdf(filePath);
            const sc = scoreOcrText(txt);
            console.log(`[OCR] poppler engine score=${sc}`);
            if (txt && sc >= 20) {
                console.log('[OCR] poppler result sufficient — skipping pdf-to-img engine');
                return txt;
            }
            // poppler ne thoda text diya — pdf-to-img se try karo
            if (pdfToImg) {
                try {
                    console.log('[OCR] poppler score low — trying pdf-to-img fallback');
                    const txt2 = await ocrPdfViaPdfToImg(filePath);
                    const sc2 = scoreOcrText(txt2);
                    console.log(`[OCR] pdf-to-img engine score=${sc2}`);
                    return sc2 > sc ? txt2 : (txt || txt2);
                } catch (e) { console.warn('[OCR] pdf-to-img fallback failed:', e.message); }
            }
            return txt;
        } catch (e) { console.warn('[OCR] poppler OCR failed:', e.message); }
    }
    // poppler nahi hai — directly pdf-to-img
    if (pdfToImg) {
        try {
            const txt = await ocrPdfViaPdfToImg(filePath);
            console.log(`[OCR] pdf-to-img engine score=${scoreOcrText(txt)}`);
            return txt;
        } catch (e) { console.warn('[OCR] pdf-to-img OCR failed:', e.message); }
    }
    return '';
}

module.exports = { extractEmbeddedPdfText, ocrPdfWithBestEngine, ocrScannedPdf };
