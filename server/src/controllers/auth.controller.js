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

async function changePassword(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Please provide both current and new password.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    try {
        const admin = admins.findById(req.admin.id);
        if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });
        const valid = await verifyPassword(currentPassword, admin.passwordHash);
        if (!valid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        const { hashPassword } = require('../services/password.service');
        const newHash = await hashPassword(newPassword);
        admins.updatePassword(admin.id, newHash);
        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error('[AUTH] Change password failed:', err.message);
        res.status(500).json({ success: false, message: 'Failed to update password.' });
    }
}

module.exports = { login, currentAdmin, logout, changePassword };
