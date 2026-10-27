const admins = require('../repositories/admin.repository');
const { verifyPassword } = require('../services/password.service');
const { createSession, deleteSession } = require('../services/session.service');
const { COOKIE_NAME, COOKIE_OPTIONS, SESSION_TTL_MS } = require('../config/auth.config');

async function login(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' ||
        !username.trim() || username.length > 64 || !password || password.length > 1024) {
        return res.status(400).json({ success: false, message: 'Enter a valid username and password.' });
    }
    try {
        const admin = admins.findByUsername(username.trim().toLowerCase());
        const valid = await verifyPassword(password, admin?.passwordHash);
        if (!valid || admin?.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        deleteSession(req);
        const token = createSession(admin);
        res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });
        res.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
    } catch (error) {
        console.error('[AUTH] Login failed:', error.message);
        res.status(503).json({ success: false, message: 'Sign-in is temporarily unavailable.' });
    }
}

function currentAdmin(req, res) {
    res.json({ success: true, admin: req.admin });
}

function logout(req, res) {
    deleteSession(req);
    res.setHeader('Cache-Control', 'no-store');
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.json({ success: true });
}

module.exports = { login, currentAdmin, logout };
