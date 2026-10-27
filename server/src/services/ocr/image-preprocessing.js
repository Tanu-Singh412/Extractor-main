const sharp = require('sharp');

async function preprocessImage(buffer, options = {}) {
    try {
        let pipeline = sharp(buffer);
        const meta = await pipeline.metadata();

        // Auto-orient based on EXIF, flatten alpha channel, and convert to grayscale
        pipeline = pipeline.rotate().flatten({ background: '#ffffff' }).greyscale();

        // Enhance contrast (linear formula: a * pixel + b) and normalize
        pipeline = pipeline.linear(1.2, -10).normalize();

        // Upscale small images for better OCR accuracy (1400px — good tradeoff)
        if (options.resize) {
            pipeline = pipeline.resize(options.resize);
        } else if (meta.width && meta.width < 1200) {
            pipeline = pipeline.resize({ width: 1400, withoutEnlargement: false });
        }

        // Noise removal / Sharpening
        if (options.median) {
            pipeline = pipeline.median(options.median);
        }
        pipeline = pipeline.sharpen({ sigma: 1.2 });

        if (options.threshold) {
            pipeline = pipeline.threshold(typeof options.threshold === 'number' ? options.threshold : 128);
        }

        return await pipeline.png().toBuffer();
    } catch (e) {
        console.warn('[OCR] Image preprocessing failed:', e.message);
        return buffer; // fallback
    }
}

module.exports = { preprocessImage };
