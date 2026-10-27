const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { connectDB, getCollection, isMongoConnected } = require('../config/db');
const { ADMINS_FILE } = require('../config/paths');

let adminRecords = [];
let collection = null;
let isInitialized = false;

function readFromFile() {
    try {
        if (!fs.existsSync(ADMINS_FILE)) return [];
        const content = fs.readFileSync(ADMINS_FILE, 'utf8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function saveToFile(admins) {
    if (isMongoConnected()) return; // Stored in MongoDB; no local file needed
    try {
        fs.mkdirSync(path.dirname(ADMINS_FILE), { recursive: true });
        const temporary = `${ADMINS_FILE}.${randomUUID()}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(admins, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
        fs.renameSync(temporary, ADMINS_FILE);
    } catch (_) {}
}

// Initial load from file as synchronous fallback before async DB initialization completes
adminRecords = readFromFile();

async function initAdmins() {
    if (isInitialized && collection) return;
    await connectDB();
    if (!isMongoConnected()) {
        adminRecords = readFromFile();
        return;
    }

    try {
        collection = getCollection('admins');
        await collection.createIndex({ username: 1 }, { unique: true });
        const docs = await collection.find({}).toArray();

        if (docs.length > 0) {
            adminRecords = docs.map(({ _id, ...doc }) => doc);
            console.log(`[AUTH] Loaded ${adminRecords.length} admin accounts from MongoDB collection "admins".`);
        } else {
            // If MongoDB has no admins yet, check if there is an existing admin to migrate
            const existing = readFromFile();
            if (existing.length > 0) {
                await collection.insertMany(existing.map(a => ({ ...a })));
                adminRecords = existing;
                console.log(`[AUTH] Migrated ${existing.length} admin accounts into MongoDB collection "admins".`);
            }
        }
        isInitialized = true;
    } catch (err) {
        console.warn(`[AUTH] MongoDB admin setup error (${err.message}). Using local records.`);
    }
}

function readAdmins() {
    return adminRecords;
}

function findByUsername(username) {
    return adminRecords.find(admin => admin.username === username) || null;
}

function findById(id) {
    return adminRecords.find(admin => admin.id === id) || null;
}

function createAdmin(username, passwordHash) {
    if (adminRecords.some(admin => admin.username === username)) throw new Error('Admin already exists');
    const admin = { id: randomUUID(), username, role: 'admin', passwordHash, createdAt: new Date().toISOString() };
    adminRecords.push(admin);
    
    if (isMongoConnected() && collection) {
        collection.insertOne({ ...admin }).catch(err => {
            console.warn('[AUTH] MongoDB insert admin error:', err.message);
        });
    } else {
        saveToFile(adminRecords);
    }
    
    return { id: admin.id, username: admin.username, role: admin.role };
}

function countAdmins() {
    return adminRecords.length;
}

async function ensureDefaultAdmin() {
    await initAdmins();
    if (adminRecords.length === 0) {
        const { hashPassword } = require('../services/password.service');
        const defaultUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
        const defaultPass = process.env.ADMIN_PASSWORD || 'admin';
        const created = createAdmin(defaultUser, await hashPassword(defaultPass));
        console.log(`[AUTH] Initialized default admin account '${defaultUser}'.`);
        return created;
    }
    return null;
}

function updatePassword(id, newPasswordHash) {
    const admin = adminRecords.find(a => a.id === id);
    if (!admin) throw new Error('Admin not found');
    admin.passwordHash = newPasswordHash;
    admin.updatedAt = new Date().toISOString();
    admin.passwordChangedAt = Date.now();

    if (isMongoConnected() && collection) {
        collection.updateOne(
            { id }, 
            { $set: { passwordHash: admin.passwordHash, updatedAt: admin.updatedAt, passwordChangedAt: admin.passwordChangedAt } }
        ).catch(err => {
            console.warn('[AUTH] MongoDB update admin password error:', err.message);
        });
    } else {
        saveToFile(adminRecords);
    }

    return true;
}

module.exports = { 
    initAdmins, 
    findByUsername, 
    findById, 
    createAdmin, 
    countAdmins, 
    ensureDefaultAdmin, 
    updatePassword 
};

