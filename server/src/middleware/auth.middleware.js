        const admins = require('../repositories/admin.repository');
const { getSession, deleteSession } = require('../services/session.service');

function requireAdmin(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const session = getSession(req);
        const admin = session && admins.findById(session.adminId);
        if (!admin || admin.role !== 'admin') return res.status(401).json({ success: false, message: 'Please sign in.' });
        if (admin.passwordChangedAt && session.createdAt && session.createdAt < admin.passwordChangedAt) {
            deleteSession(req);
            return res.status(401).json({ success: false, message: 'Password has been changed. Please sign in again.' });
        }
        req.admin = { id: admin.id, username: admin.username, role: admin.role };
        next();
    } catch (error) {
        console.error('[AUTH] Session validation failed:', error.message);
        res.status(503).json({ success: false, message: 'Authentication is temporarily unavailable.' });
    }
}

module.exports = { requireAdmin };
