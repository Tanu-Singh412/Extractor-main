const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let isConnected = false;

async function connectDB() {
    const uri = (process.env.MONGODB_URI || '').trim();
    if (!uri) {
        console.log('[DB] No MONGODB_URI configured. Running in local fallback mode.');
        isConnected = false;
        return null;
    }
    if (db && isConnected) return db;

    try {
        client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
        await client.connect();
        const dbName = process.env.DB_NAME || 'passport_db';
        db = client.db(dbName);
        isConnected = true;
        console.log(`[DB] MongoDB connected successfully to database "${dbName}"!`);
        return db;
    } catch (err) {
        console.warn(`[DB] MongoDB connection failed (${err.message}). Running in fallback mode.`);
        isConnected = false;
        return null;
    }
}

function getDB() {
    return isConnected ? db : null;
}

function isMongoConnected() {
    return isConnected;
}

function getCollection(name) {
    if (!isConnected || !db) return null;
    return db.collection(name);
}

module.exports = {
    connectDB,
    getDB,
    getCollection,
    isMongoConnected
};
