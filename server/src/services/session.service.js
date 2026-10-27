const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { COOKIE_NAME, SESSION_TTL_MS } = require('../config/auth.config');
const { connectDB, getCollection, isMongoConnected } = require('../config/db');
const { DATA_DIR } = require('../config/paths');

const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
let collection = null;

function loadPersistedSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
            const map = new Map();
            const now = Date.now();
            if (Array.isArray(data)) {
                for (const [key, session] of data) {
                    if (session && session.expiresAt > now) {
                        map.set(key, session);
                    }
                }
            }
            return map;
        }
    } catch (_) {}
    return new Map();
}

function savePersistedSessions(sessionsMap) {
    if (isMongoConnected()) return; // Stored in MongoDB; no local file needed
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify([...sessionsMap.entries()]));
    } catch (_) {}
}

const sessions = loadPersistedSessions();
const digest = token => createHash('sha256').update(token).digest('hex');

async function initSessions() {
    await connectDB();
    if (!isMongoConnected()) return;

    try {
        collection = getCollection('sessions');
        await collection.createIndex({ expiresAtDate: 1 }, { expireAfterSeconds: 0 });
        await collection.createIndex({ tokenHash: 1 }, { unique: true });
        const now = Date.now();
        const docs = await collection.find({ expiresAt: { $gt: now } }).toArray();
        for (const doc of docs) {
            sessions.set(doc.tokenHash, {
                adminId: doc.adminId,
                createdAt: doc.createdAt,
                expiresAt: doc.expiresAt
            });
        }
        console.log(`[AUTH] Loaded ${docs.length} active sessions from MongoDB collection "sessions".`);
    } catch (err) {
        console.warn(`[AUTH] MongoDB sessions setup warning (${err.message}).`);
    }
}

function requestToken(req) {
    const cookie = (req.headers.cookie || '').split(';').map(value => value.trim())
        .find(value => value.startsWith(`${COOKIE_NAME}=`));
    const token = cookie ? cookie.slice(COOKIE_NAME.length + 1) : '';
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function prune() {
    const now = Date.now();
    let changed = false;
    for (const [key, session] of sessions) {
        if (session.expiresAt <= now) {
            sessions.delete(key);
            changed = true;
            if (isMongoConnected() && collection) {
                collection.deleteOne({ tokenHash: key }).catch(() => {});
            }
        }
    }
    if (changed) savePersistedSessions(sessions);
}

function createSession(admin) {
    prune();
    const token = randomBytes(32).toString('hex');
    const tokenHash = digest(token);
    const createdAt = Date.now();
    const expiresAt = createdAt + SESSION_TTL_MS;

    // Bound the in-memory store; a fresh login replaces this admin's older sessions.
    for (const [key, session] of sessions) {
        if (session.adminId === admin.id) sessions.delete(key);
    }
    sessions.set(tokenHash, { adminId: admin.id, createdAt, expiresAt });

    if (isMongoConnected() && collection) {
        collection.deleteMany({ adminId: admin.id }).catch(() => {});
        collection.updateOne(
            { tokenHash },
            { $set: { tokenHash, adminId: admin.id, createdAt, expiresAt, expiresAtDate: new Date(expiresAt) } },
            { upsert: true }
        ).catch(err => console.warn('[AUTH] MongoDB save session error:', err.message));
    } else {
        savePersistedSessions(sessions);
    }

    return token;
}

function getSession(req) {
    const token = requestToken(req);
    if (!token) return null;
    const key = digest(token);
    const session = sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        sessions.delete(key);
        if (isMongoConnected() && collection) {
            collection.deleteOne({ tokenHash: key }).catch(() => {});
        } else {
            savePersistedSessions(sessions);
        }
        return null;
    }
    return session;
}

function deleteSession(req) {
    const token = requestToken(req);
    if (token) {
        const key = digest(token);
        sessions.delete(key);
        if (isMongoConnected() && collection) {
            collection.deleteOne({ tokenHash: key }).catch(() => {});
        } else {
            savePersistedSessions(sessions);
        }
    }
}

function revokeOtherSessions(req, adminId) {
    const currentToken = requestToken(req);
    const currentKey = currentToken ? digest(currentToken) : null;
    let changed = false;
    for (const [key, session] of sessions) {
        if (session.adminId === adminId && key !== currentKey) {
            sessions.delete(key);
            changed = true;
        }
    }
    if (currentKey && sessions.has(currentKey)) {
        sessions.get(currentKey).createdAt = Date.now();
        changed = true;
    }
    if (isMongoConnected() && collection) {
        collection.deleteMany({ adminId, tokenHash: { $ne: currentKey } }).catch(() => {});
    } else if (changed) {
        savePersistedSessions(sessions);
    }
}

function revokeAllSessions(adminId) {
    let changed = false;
    for (const [key, session] of sessions) {
        if (session.adminId === adminId) {
            sessions.delete(key);
            changed = true;
        }
    }
    if (isMongoConnected() && collection) {
        collection.deleteMany({ adminId }).catch(() => {});
    } else if (changed) {
        savePersistedSessions(sessions);
    }
}

module.exports = { 
    initSessions, 
    createSession, 
    getSession, 
    deleteSession, 
    revokeOtherSessions, 
    revokeAllSessions 
};

