const { UPLOAD_DIR } = require('../../src/config/paths');
const fs = require('fs');
const http = require('http');
const FormData = require('form-data');
const path = require('path');

const uploadsDir = UPLOAD_DIR;
const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));

if (files.length === 0) {
    console.log("No PDFs found");
    process.exit(0);
}
const latest = files[files.length - 1]; // Just test on a recent one
console.log('Testing on:', latest);

const form = new FormData();
form.append('file', fs.createReadStream(path.join(uploadsDir, latest)));
form.append('docType', 'PASSPORT');

const req = http.request(`http://localhost:${process.env.PORT || 5058}/api/scan`, { method: 'POST', headers: form.getHeaders() }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log(JSON.parse(data).data));
});
form.pipe(req);
