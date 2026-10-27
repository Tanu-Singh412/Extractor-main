const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const deriveKey = promisify(scrypt);
// OWASP's scrypt option for 32 MiB memory, with parallelization factor 3.
const OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = await deriveKey(password, salt, KEY_LENGTH, OPTIONS);
    return `scrypt$${OPTIONS.N}$${OPTIONS.r}$${OPTIONS.p}$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
    const parts = typeof encoded === 'string' ? encoded.split('$') : [];
    const valid = parts.length === 6 && parts[0] === 'scrypt' &&
        parts[1] === String(OPTIONS.N) && parts[2] === String(OPTIONS.r) && parts[3] === String(OPTIONS.p) &&
        /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{128}$/.test(parts[5]);
    // Missing accounts still perform the expensive derivation.
    const salt = valid ? parts[4] : '0'.repeat(32);
    const expected = valid ? Buffer.from(parts[5], 'hex') : Buffer.alloc(KEY_LENGTH);
    const actual = await deriveKey(password, salt, KEY_LENGTH, OPTIONS);
    return timingSafeEqual(actual, expected) && valid;
}

module.exports = { hashPassword, verifyPassword };
