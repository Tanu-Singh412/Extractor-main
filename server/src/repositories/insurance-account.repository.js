const fs = require('fs');
const { connectDB, getCollection, isMongoConnected } = require('../config/db');
const { DATA_DIR, INSURANCE_ACCOUNTS_FILE: ACCOUNTS_FILE } = require('../config/paths');

let accountsCache = [];
let collection = null;

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

accountsCache = loadAccounts();

async function initInsuranceAccounts() {
  await connectDB();
  if (!isMongoConnected()) return;
  try {
    collection = getCollection('insurance_accounts');
    const docs = await collection.find({}).toArray();
    if (docs.length > 0) {
      accountsCache = docs.map(({ _id, ...doc }) => doc);
    }
  } catch (e) {
    console.warn('[INSURANCE] MongoDB setup warning:', e.message);
  }
}

function saveAccount(account) {
  const newAccount = { id: Date.now(), ...account };
  accountsCache.push(newAccount);
  if (isMongoConnected() && collection) {
    collection.insertOne({ ...newAccount }).catch(e => {
      console.warn('[INSURANCE] MongoDB save error:', e.message);
    });
    return true;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.warn('[INSURANCE] Failed to save account:', e.message);
    return false;
  }
}

function getAllAccounts() {
  return accountsCache;
}

module.exports = { initInsuranceAccounts, saveAccount, getAllAccounts };

