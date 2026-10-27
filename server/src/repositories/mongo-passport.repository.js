const { MongoClient } = require('mongodb');
const fs = require('fs');
const { DATA_DIR, REGISTRY_FILE: DB_FILE } = require('../config/paths');

// Ensure JSON DB exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

let mongoClient = null;
let collection = null;
let useMongo = false;

// Initialize MongoDB connection (fallback to JSON if it fails)
async function initDB() {
    const uri = process.env.MONGODB_URI || '';
    if (!uri) {
        console.warn('[DB] No MONGODB_URI provided – falling back to JSON database.');
        useMongo = false;
        return;
    }
    try {
        mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await mongoClient.connect();
        const dbName = process.env.DB_NAME || 'passport_db';
        const db = mongoClient.db(dbName);
        collection = db.collection('passports');
        // Ensure an index on the custom id field for faster lookups
        await collection.createIndex({ id: 1 }, { unique: true });
        console.log(`[DB] MongoDB connected successfully! Using database: "${dbName}"`);
        useMongo = true;
    } catch (err) {
        console.warn(`[DB] MongoDB connection failed: ${err.message}`);
        console.warn('[DB] Falling back to local JSON database.');
        useMongo = false;
    }
}

// Read JSON database helper
function readJSON() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[DB] JSON Read Error:', e);
        return [];
    }
}

// Write JSON database helper
function writeJSON(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[DB] JSON Write Error:', e);
    }
}

// Get all passports
async function getPassports() {
    if (useMongo && collection) {
        try {
            const docs = await collection.find({}).sort({ created_at: -1 }).toArray();
            return docs;
        } catch (err) {
            console.error('[DB] MongoDB query failed, falling back to JSON:', err.message);
            return readJSON();
        }
    }
    return readJSON();
}

// Add a passport
async function addPassport(record) {
    if (useMongo && collection) {
        try {
            // Ensure the record has a created_at timestamp for sorting
            record.created_at = new Date();
            await collection.insertOne(record);
            return record;
        } catch (err) {
            console.error('[DB] MongoDB insert failed, falling back to JSON:', err.message);
        }
    }
    // JSON fallback
    const db = readJSON();
    db.unshift(record);
    writeJSON(db);
    return record;
}

// Update a passport
async function updatePassport(id, fields) {
    if (useMongo && collection) {
        try {
            const result = await collection.updateOne({ id }, { $set: fields });
            if (result.matchedCount === 0) return null;
            return { id, ...fields };
        } catch (err) {
            console.error('[DB] MongoDB update failed, falling back to JSON:', err.message);
        }
    }
    // JSON fallback
    const db = readJSON();
    const idx = db.findIndex(item => item.id === id);
    if (idx !== -1) {
        db[idx] = { ...db[idx], ...fields };
        writeJSON(db);
        return db[idx];
    }
    return null;
}

// Delete a passport
async function deletePassport(id) {
    if (useMongo && collection) {
        try {
            const result = await collection.deleteOne({ id });
            return result.deletedCount > 0;
        } catch (err) {
            console.error('[DB] MongoDB delete failed, falling back to JSON:', err.message);
        }
    }
    // JSON fallback
    let db = readJSON();
    const initialLen = db.length;
    db = db.filter(item => item.id !== id);
    if (db.length === initialLen) {
        return false;
    }
    writeJSON(db);
    return true;
}

module.exports = {
    initDB,
    getPassports,
    addPassport,
    updatePassport,
    deletePassport,
    isUsingMongo: () => useMongo
};
