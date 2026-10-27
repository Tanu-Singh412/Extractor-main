const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { COOKIE_NAME, SESSION_TTL_MS } = require('../config/auth.config');
const { DATA_DIR } = require('../config/paths');

const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

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
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify([...sessionsMap.entries()]));
    } catch (_) {}
}

const sessions = loadPersistedSessions();
const digest = token => createHash('sha256').update(token).digest('hex');

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
        }
    }
    if (changed) savePersistedSessions(sessions);
}

function createSession(admin) {
    prune();
    // Bound the in-memory store; a fresh login replaces this admin's older sessions.
    for (const [key, session] of sessions) if (session.adminId === admin.id) sessions.delete(key);
    const token = randomBytes(32).toString('hex');
    sessions.set(digest(token), { adminId: admin.id, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
    savePersistedSessions(sessions);
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
        savePersistedSessions(sessions);
        return null;
    }
    return session;
}

function deleteSession(req) {
    const token = requestToken(req);
    if (token) {
        sessions.delete(digest(token));
        savePersistedSessions(sessions);
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
    if (changed) savePersistedSessions(sessions);
}

function revokeAllSessions(adminId) {
    let changed = false;
    for (const [key, session] of sessions) {
        if (session.adminId === adminId) {
            sessions.delete(key);
            changed = true;
        }
    }
    if (changed) savePersistedSessions(sessions);
}

module.exports = { createSession, getSession, deleteSession, revokeOtherSessions, revokeAllSessions };
