const { createHash, randomBytes } = require('node:crypto');
const { COOKIE_NAME, SESSION_TTL_MS } = require('../config/auth.config');

const sessions = new Map();
const digest = token => createHash('sha256').update(token).digest('hex');

function requestToken(req) {
    const cookie = (req.headers.cookie || '').split(';').map(value => value.trim())
        .find(value => value.startsWith(`${COOKIE_NAME}=`));
    const token = cookie ? cookie.slice(COOKIE_NAME.length + 1) : '';
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function prune() {
    const now = Date.now();
    for (const [key, session] of sessions) if (session.expiresAt <= now) sessions.delete(key);
}

function createSession(admin) {
    prune();
    // Bound the in-memory store; a fresh login replaces this admin's older sessions.
    for (const [key, session] of sessions) if (session.adminId === admin.id) sessions.delete(key);
    const token = randomBytes(32).toString('hex');
    sessions.set(digest(token), { adminId: admin.id, expiresAt: Date.now() + SESSION_TTL_MS });
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
        return null;
    }
    return session;
}

function deleteSession(req) {
    const token = requestToken(req);
    if (token) sessions.delete(digest(token));
}

module.exports = { createSession, getSession, deleteSession };
