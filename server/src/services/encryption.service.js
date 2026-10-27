const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a consistent 32-byte (256-bit) buffer key from environment secret
 */
function getMasterKey() {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'extractor_secure_master_key_default_2026';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM authenticated encryption.
 * Output format: ivHex:authTagHex:ciphertextHex
 */
function encrypt(text) {
  if (text === null || text === undefined) return text;
  const str = String(text).trim();
  if (!str) return '';

  // Prevent double-encryption if already formatted as iv:authTag:cipher
  if (isEncrypted(str)) return str;

  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(str, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${ciphertext}`;
  } catch (err) {
    console.error('[CRYPTO] Encryption failure:', err.message);
    return str;
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 * Backward compatible: returns plaintext unchanged if not encrypted.
 */
function decrypt(data) {
  if (data === null || data === undefined) return data;
  const str = String(data).trim();
  if (!str || !isEncrypted(str)) return str;

  try {
    const [ivHex, authTagHex, cipherHex] = str.split(':');
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // If decryption or authentication fails (e.g. wrong key or corrupt data), return original
    return str;
  }
}

/**
 * Creates an HMAC-SHA256 blind index for exact search matching on encrypted fields
 * without exposing the plaintext in the database index.
 */
function hashSearchIndex(value) {
  if (!value) return '';
  const normalized = String(value).trim().toUpperCase();
  const key = getMasterKey();
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * Check if a string matches the ivHex:authTagHex:cipherHex pattern
 */
function isEncrypted(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split(':');
  // IV is 12 bytes = 24 hex, authTag is 16 bytes = 32 hex, ciphertext is hex
  return parts.length === 3 && parts[0].length === 24 && parts[1].length === 32 && /^[0-9a-fA-F]+$/.test(parts[2]);
}

module.exports = {
  encrypt,
  decrypt,
  hashSearchIndex,
  isEncrypted
};
