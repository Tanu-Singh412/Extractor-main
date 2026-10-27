const fs = require('fs');
const path = require('path');
const { REGISTRY_FILE: DB_PATH } = require('../config/paths');

function loadDB() { 
    try {
        if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) { console.warn('[DB] Load error:', e.message); }
    return [];
}

function saveDB(records) {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2));
    } catch (e) { console.warn('[DB] Save error:', e.message); }
}

let dbRecords = loadDB();

function listRecords() { return dbRecords; }

function createRecord(fields) {
    const { previewImage: _unused, ...cleanFields } = fields || {};
    const newRecord = { id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, ...cleanFields };
    dbRecords.push(newRecord);
    saveDB(dbRecords);
    return newRecord;
}

function updateRecord(id, fields) {
    const idx = dbRecords.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const { previewImage: _unused, ...cleanFields } = fields || {};
    dbRecords[idx] = { ...dbRecords[idx], ...cleanFields, id };
    saveDB(dbRecords);
    return dbRecords[idx];
}

function deleteRecord(id) {
    const initialLen = dbRecords.length;
    dbRecords = dbRecords.filter(r => r.id !== id);
    if (dbRecords.length === initialLen) return false;
    saveDB(dbRecords);
    return true;
}

module.exports = { listRecords, createRecord, updateRecord, deleteRecord };
