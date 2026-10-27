const fs = require('fs');

const PDF_MAGIC = Buffer.from('%PDF');
function isPdfFile(filePath) {
    try {
        const head = fs.readFileSync(filePath).slice(0, 5);
        return head.equals(PDF_MAGIC);
    } catch { return false; }
}
function isPdfBuffer(buf) {
    try { return Buffer.isBuffer(buf) && buf.slice(0, 5).equals(PDF_MAGIC); } catch { return false; }
}

module.exports = { isPdfFile, isPdfBuffer };
