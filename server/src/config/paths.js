const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(SERVER_ROOT, 'data');
const UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads');
const CLIENT_DIR = path.resolve(SERVER_ROOT, '..', 'client');
const REGISTRY_FILE = path.join(DATA_DIR, 'passports.json');
const INSURANCE_ACCOUNTS_FILE = path.join(DATA_DIR, 'insurance_accounts.json');
const OCR_OUTPUT_FILE = path.join(SERVER_ROOT, 'ocr_last.txt');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');

module.exports = { SERVER_ROOT, DATA_DIR, UPLOAD_DIR, CLIENT_DIR, REGISTRY_FILE, INSURANCE_ACCOUNTS_FILE, OCR_OUTPUT_FILE, ADMINS_FILE, COMPANIES_FILE };
