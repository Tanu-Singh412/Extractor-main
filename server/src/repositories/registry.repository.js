const fs = require('fs');
const path = require('path');
const { connectDB, getCollection, isMongoConnected: checkMongoConnected } = require('../config/db');
const { REGISTRY_FILE: DB_PATH } = require('../config/paths');

let collection = null;
let isMongoConnected = false;

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) { console.warn('[DB] Load error:', e.message); }
    return [];
}

function saveDB(records) {
    if (isMongoConnected) return; // Stored in MongoDB; no local file needed
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2));
    } catch (e) { console.warn('[DB] Save error:', e.message); }
}

let dbRecords = loadDB();

async function initDB() {
    await connectDB();
    if (!checkMongoConnected()) {
        isMongoConnected = false;
        return;
    }

    try {
        collection = getCollection('passports');
        await collection.createIndex({ id: 1 }, { unique: true });
        isMongoConnected = true;

        // When connected to MongoDB, load records from the MongoDB database
        const mongoDocs = await collection.find({}).sort({ created_at: -1, _id: -1 }).toArray();
        dbRecords = mongoDocs.map(({ _id, ...doc }) => doc);
        console.log(`[DB] Loaded ${dbRecords.length} records from MongoDB collection "passports".`);
    } catch (err) {
        console.warn(`[DB] MongoDB passports setup failed (${err.message}).`);
        isMongoConnected = false;
    }
}


function listRecords() { return dbRecords; }

function findDuplicateIdentifier(fields, excludeId = null) {
    if (!fields || typeof fields !== 'object') return null;

    if (fields.passportNo) {
        const pno = String(fields.passportNo).trim().toUpperCase();
        if (pno) {
            const match = dbRecords.find(r =>
                r.id !== excludeId &&
                r.passportNo &&
                String(r.passportNo).trim().toUpperCase() === pno
            );
            if (match) {
                return {
                    field: 'passportNo',
                    value: pno,
                    message: `A document with Passport Number "${pno}" is already recorded.`
                };
            }
        }
    }

    if (fields.policyNo) {
        const pno = String(fields.policyNo).trim().toUpperCase();
        if (pno) {
            const match = dbRecords.find(r =>
                r.id !== excludeId &&
                r.policyNo &&
                String(r.policyNo).trim().toUpperCase() === pno
            );
            if (match) {
                return {
                    field: 'policyNo',
                    value: pno,
                    message: `A document with Policy Number "${String(fields.policyNo).trim()}" is already recorded.`
                };
            }
        }
    }

    return null;
}

function createRecord(fields) {
    const duplicate = findDuplicateIdentifier(fields);
    if (duplicate) {
        const err = new Error(duplicate.message);
        err.statusCode = 409;
        err.field = duplicate.field;
        throw err;
    }
    const { previewImage: _unused, ...cleanFields } = fields || {};
    const newRecord = { 
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, 
        created_at: new Date().toISOString(),
        ...cleanFields 
    };
    dbRecords.push(newRecord);
    saveDB(dbRecords);
    if (isMongoConnected && collection) {
        collection.insertOne({ ...newRecord }).catch(err => {
            console.warn('[DB] MongoDB insert error:', err.message);
        });
    }
    return newRecord;
}

function updateRecord(id, fields) {
    const idx = dbRecords.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const duplicate = findDuplicateIdentifier(fields, id);
    if (duplicate) {
        const err = new Error(duplicate.message);
        err.statusCode = 409;
        err.field = duplicate.field;
        throw err;
    }
    const { previewImage: _unused, ...cleanFields } = fields || {};
    dbRecords[idx] = { ...dbRecords[idx], ...cleanFields, id };
    saveDB(dbRecords);
    if (isMongoConnected && collection) {
        collection.updateOne({ id }, { $set: cleanFields }).catch(err => {
            console.warn('[DB] MongoDB update error:', err.message);
        });
    }
    return dbRecords[idx];
}

function deleteRecord(id) {
    const initialLen = dbRecords.length;
    dbRecords = dbRecords.filter(r => r.id !== id);
    if (dbRecords.length === initialLen) return false;
    saveDB(dbRecords);
    if (isMongoConnected && collection) {
        collection.deleteOne({ id }).catch(err => {
            console.warn('[DB] MongoDB delete error:', err.message);
        });
    }
    return true;
}

function isUsingMongo() {
    return isMongoConnected;
}

module.exports = { 
    initDB,
    isUsingMongo,
    listRecords, 
    createRecord, 
    updateRecord, 
    deleteRecord, 
    findDuplicateIdentifier 
};

