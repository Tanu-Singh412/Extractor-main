module.exports = {

  ENABLE_OCR_PREPROCESS: process.env.ENABLE_OCR_PREPROCESS !== 'false', // default true
  OCR_PREPROCESS_OPTIONS: {

  },
  // Force OCR for PDFs even if embedded text exists
  FORCE_OCR_FOR_PDF: process.env.FORCE_OCR_FOR_PDF === 'true',
};
