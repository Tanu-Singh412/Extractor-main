const { LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS } = require('../config/auth.config');
const attempts = new Map();

function limitLogin(req, res, next) {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.expiresAt <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, expiresAt: now + LOGIN_WINDOW_MS };
    if (entry.count >= LOGIN_MAX_ATTEMPTS || (!attempts.has(key) && attempts.size >= 10000)) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)));
        return res.status(429).json({ success: false, message: 'Too many sign-in attempts. Please try again later.' });
    }
    entry.count++;
    attempts.set(key, entry);
    next();
}

module.exports = { limitLogin };
