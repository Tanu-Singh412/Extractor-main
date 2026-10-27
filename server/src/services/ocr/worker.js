const Tesseract = require('tesseract.js');
const { isPdfBuffer } = require('./pdf-detection');
const { SERVER_ROOT } = require('../../config/paths');

let _ocrWorker = null;
let _workerInitPromise = null;
let _workerBusy = false;
const _workerQueue = [];

async function getOcrWorker() {
    if (_ocrWorker) return _ocrWorker;
    if (!_workerInitPromise) {
        _workerInitPromise = (async () => {
            console.log('[OCR] Initializing persistent Tesseract worker...');
            const worker = await Tesseract.createWorker('eng', 1, {
                cachePath: SERVER_ROOT,
                logger: () => { }, // silence internal logs
            });
            console.log('[OCR] Persistent Tesseract worker ready.');
            _ocrWorker = worker;
            return worker;
        })().catch((err) => {
            _workerInitPromise = null;
            throw err;
        });
    }
    return _workerInitPromise;
}

/* Queue-based OCR — worker ek time pe ek kaam karta hai */
async function workerOcr(input) {
    return new Promise((resolve, reject) => {
        _workerQueue.push({ input, resolve, reject });
        processWorkerQueue();
    });
}

async function processWorkerQueue() {
    if (_workerBusy || !_workerQueue.length) return;
    _workerBusy = true;
    const { input, resolve, reject } = _workerQueue.shift();
    try {
        const worker = await getOcrWorker();
        const { data } = await worker.recognize(input);
        resolve(data || { text: '' });
    } catch (e) {
        reject(e);
    } finally {
        _workerBusy = false;
        processWorkerQueue(); // next item
    }
}

async function safeOcr(input, opts = {}) {
    try {
        if (isPdfBuffer(input)) {
            console.warn('[OCR] BLOCKED: PDF buffer Tesseract ko nahi ja sakta');
            return { text: '' };
        }
        // Persistent worker use karo (faster), logger opts ke saath fallback
        if (opts.logger) {
            // logger ke saath old path (progress reporting ke liye)
            const { data } = await Tesseract.recognize(input, 'eng', { cachePath: SERVER_ROOT, ...opts });
            return data || { text: '' };
        }
        const data = await workerOcr(input);
        return data || { text: '' };
    } catch (e) {
        console.warn('[OCR] Tesseract failed safely:', e.message);
        return { text: '' };
    }
}

function warmUpOcrWorker() {
    setTimeout(() => getOcrWorker().catch(e => console.warn('[OCR] Worker warm-up failed:', e.message)), 500);
}

module.exports = { safeOcr, warmUpOcrWorker };
