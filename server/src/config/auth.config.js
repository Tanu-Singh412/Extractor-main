const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(value => value.trim()).filter(Boolean);

module.exports = {
    CLIENT_ORIGINS,
    COOKIE_NAME: 'extractor_session',
    COOKIE_OPTIONS: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    SESSION_TTL_MS: 8 * 60 * 60 * 1000,
    LOGIN_WINDOW_MS: 15 * 60 * 1000,
    LOGIN_MAX_ATTEMPTS: 10,
};
