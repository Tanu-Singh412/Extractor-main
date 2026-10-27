const fs = require('fs');
const { DATA_DIR, INSURANCE_ACCOUNTS_FILE: ACCOUNTS_FILE } = require('../config/paths');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[INSURANCE] Failed to load accounts:', e.message);
    return [];
  }
}

function saveAccount(account) {
  const accounts = loadAccounts();
  accounts.push({ id: Date.now(), ...account });
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.warn('[INSURANCE] Failed to save account:', e.message);
    return false;
  }
}

function getAllAccounts() {
  return loadAccounts();
}

module.exports = { saveAccount, getAllAccounts };
