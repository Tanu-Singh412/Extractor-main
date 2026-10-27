const { CLIENT_ORIGINS } = require('../config/auth.config');

function allowedOrigin(req, origin) {
    return !origin || CLIENT_ORIGINS.includes(origin) || origin === `${req.protocol}://${req.get('host')}`;
}

function requireTrustedOrigin(req, res, next) {
    if (!allowedOrigin(req, req.get('origin'))) {
        return res.status(403).json({ success: false, message: 'Origin is not allowed.' });
    }
    next();
}

module.exports = { allowedOrigin, requireTrustedOrigin };
