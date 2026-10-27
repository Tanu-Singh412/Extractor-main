const fs = require('fs');
const multer = require('multer');
const { UPLOAD_DIR } = require('../config/paths');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

module.exports = multer({ dest: UPLOAD_DIR });
