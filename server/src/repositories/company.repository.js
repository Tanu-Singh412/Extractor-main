const fs = require('fs');
const path = require('path');
const { connectDB, getCollection, isMongoConnected: checkMongoConnected } = require('../config/db');
const { COMPANIES_FILE: DB_PATH } = require('../config/paths');

let collection = null;
let isMongoConnected = false;

const DEFAULT_COMPANIES = [
    { id: 'comp-1', name: 'Company 1', created_at: new Date().toISOString() },
    { id: 'comp-2', name: 'Company 2', created_at: new Date().toISOString() },
    { id: 'comp-3', name: 'Company 3', created_at: new Date().toISOString() }
];

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch (e) { console.warn('[DB] Companies load error:', e.message); }
    return [...DEFAULT_COMPANIES];
}

function saveDB(records) {
    if (isMongoConnected) return;
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2));
    } catch (e) { console.warn('[DB] Companies save error:', e.message); }
}

let dbCompanies = loadDB();

async function initDB() {
    await connectDB();
    if (!checkMongoConnected()) {
        isMongoConnected = false;
        return;
    }

    try {
        collection = getCollection('companies');
        await collection.createIndex({ id: 1 }, { unique: true });
        isMongoConnected = true;

        const count = await collection.countDocuments({});
        if (count === 0) {
            // Seed defaults
            await collection.insertMany(DEFAULT_COMPANIES.map(c => ({ ...c })));
            dbCompanies = [...DEFAULT_COMPANIES];
            console.log('[DB] Seeded initial companies to MongoDB.');
        } else {
            const mongoDocs = await collection.find({}).sort({ name: 1 }).toArray();
            dbCompanies = mongoDocs.map(({ _id, ...doc }) => doc);
            console.log(`[DB] Loaded ${dbCompanies.length} companies from MongoDB collection "companies".`);
        }
    } catch (err) {
        console.warn(`[DB] MongoDB companies setup failed (${err.message}).`);
        isMongoConnected = false;
    }
}

function listCompanies() {
    return [...dbCompanies];
}

async function createCompany(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
        const err = new Error('Company name is required');
        err.statusCode = 400;
        throw err;
    }

    const existing = dbCompanies.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
        const err = new Error(`Company "${trimmed}" already exists`);
        err.statusCode = 409;
        throw err;
    }

    const newCompany = {
        id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed,
        created_at: new Date().toISOString()
    };

    dbCompanies.push(newCompany);
    saveDB(dbCompanies);

    if (isMongoConnected && collection) {
        try {
            await collection.insertOne({ ...newCompany });
        } catch (err) {
            console.warn('[DB] MongoDB company insert error:', err.message);
        }
    }

    return newCompany;
}

async function deleteCompany(idOrName) {
    const target = String(idOrName || '').trim();
    if (!target) return false;

    const idx = dbCompanies.findIndex(c => c.id === target || c.name.toLowerCase() === target.toLowerCase());
    if (idx === -1) return false;

    const removed = dbCompanies[idx];
    dbCompanies.splice(idx, 1);
    saveDB(dbCompanies);

    if (isMongoConnected && collection) {
        try {
            await collection.deleteOne({ $or: [{ id: removed.id }, { name: removed.name }] });
        } catch (err) {
            console.warn('[DB] MongoDB company delete error:', err.message);
        }
    }

    return true;
}

async function updateCompany(idOrName, newName) {
    const target = String(idOrName || '').trim();
    const trimmedNew = String(newName || '').trim();
    if (!target || !trimmedNew) {
        const err = new Error('Company ID and new name are required');
        err.statusCode = 400;
        throw err;
    }

    const idx = dbCompanies.findIndex(c => c.id === target || c.name.toLowerCase() === target.toLowerCase());
    if (idx === -1) {
        const err = new Error('Company not found');
        err.statusCode = 404;
        throw err;
    }

    const existing = dbCompanies.find((c, i) => i !== idx && c.name.toLowerCase() === trimmedNew.toLowerCase());
    if (existing) {
        const err = new Error(`Company "${trimmedNew}" already exists`);
        err.statusCode = 409;
        throw err;
    }

    const oldName = dbCompanies[idx].name;
    dbCompanies[idx].name = trimmedNew;
    dbCompanies[idx].updated_at = new Date().toISOString();
    saveDB(dbCompanies);

    if (isMongoConnected && collection) {
        try {
            await collection.updateOne(
                { id: dbCompanies[idx].id },
                { $set: { name: trimmedNew, updated_at: dbCompanies[idx].updated_at } }
            );
        } catch (err) {
            console.warn('[DB] MongoDB company update error:', err.message);
        }
    }

    return { ...dbCompanies[idx], oldName };
}

module.exports = {
    initDB,
    initCompanyDB: initDB,
    listCompanies,
    createCompany,
    updateCompany,
    deleteCompany
};
