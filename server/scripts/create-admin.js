const { randomBytes } = require('node:crypto');
const { hashPassword } = require('../src/services/password.service');
const { createAdmin, findByUsername } = require('../src/repositories/admin.repository');

async function main() {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url');
    if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error('Username must be 3–64 letters, digits, dots, underscores or hyphens.');
    if (password.length < 4 || password.length > 1024) throw new Error('Password must be 4–1024 characters.');
    if (findByUsername(username)) {
        console.log(`Admin '${username}' already exists; existing credentials were not changed.`);
        return;
    }
    createAdmin(username, await hashPassword(password));
    console.log(`Admin created: ${username}`);
    if (!process.env.ADMIN_PASSWORD) console.log(`Generated password (shown once): ${password}`);
    console.log('The backend stores only a salted password hash.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
