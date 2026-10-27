const LOCALHOST_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function parseConfiguredOrigins() {
    return (process.env.CLIENT_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
}

function isOriginAllowed(origin) {
    if (!origin) return true;
    const configured = parseConfiguredOrigins();
    if (configured.includes(origin)) return true;
    if (process.env.NODE_ENV !== 'production' || configured.length === 0) {
        if (LOCALHOST_REGEX.test(origin)) return true;
    }
    return false;
}

// Dynamic CLIENT_ORIGINS proxy so CLIENT_ORIGINS.includes(origin) evaluates dynamically
const CLIENT_ORIGINS = new Proxy([], {
    get(target, prop, receiver) {
        if (prop === 'includes') {
            return (origin) => isOriginAllowed(origin);
        }
        return Reflect.get(parseConfiguredOrigins(), prop, receiver);
    }
});

module.exports = {
    CLIENT_ORIGINS,
    isOriginAllowed,
    COOKIE_NAME: 'extractor_session',
    COOKIE_OPTIONS: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    SESSION_TTL_MS: 8 * 60 * 60 * 1000,
    LOGIN_WINDOW_MS: 15 * 60 * 1000,
    LOGIN_MAX_ATTEMPTS: 10,
};
