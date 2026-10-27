const { CLIENT_ORIGINS, isOriginAllowed } = require('../config/auth.config');

function allowedOrigin(req, origin) {
    if (!origin) return true;
    if (origin === `${req.protocol}://${req.get('host')}`) return true;
    return isOriginAllowed ? isOriginAllowed(origin) : CLIENT_ORIGINS.includes(origin);
}

function requireTrustedOrigin(req, res, next) {
    if (!allowedOrigin(req, req.get('origin'))) {
        return res.status(403).json({ success: false, message: 'Origin is not allowed.' });
    }
    next();
}

module.exports = { allowedOrigin, requireTrustedOrigin };
