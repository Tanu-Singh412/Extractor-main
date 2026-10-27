const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ADMINS_FILE } = require('../config/paths');

function readAdmins() {
    if (!fs.existsSync(ADMINS_FILE)) return [];
    const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
    if (!Array.isArray(admins)) throw new Error('Invalid admin database');
    return admins;
}

function findByUsername(username) {
    return readAdmins().find(admin => admin.username === username) || null;
}

function findById(id) {
    return readAdmins().find(admin => admin.id === id) || null;
}

function createAdmin(username, passwordHash) {
    const admins = readAdmins();
    if (admins.some(admin => admin.username === username)) throw new Error('Admin already exists');
    const admin = { id: randomUUID(), username, role: 'admin', passwordHash, createdAt: new Date().toISOString() };
    admins.push(admin);
    fs.mkdirSync(path.dirname(ADMINS_FILE), { recursive: true });
    const temporary = `${ADMINS_FILE}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(temporary, JSON.stringify(admins, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
        fs.renameSync(temporary, ADMINS_FILE);
    } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
    return { id: admin.id, username: admin.username, role: admin.role };
}

function countAdmins() {
    return readAdmins().length;
}

async function ensureDefaultAdmin() {
    const admins = readAdmins();
    if (admins.length === 0) {
        const { hashPassword } = require('../services/password.service');
        const defaultUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
        const defaultPass = process.env.ADMIN_PASSWORD || 'admin';
        const created = createAdmin(defaultUser, await hashPassword(defaultPass));
        console.log(`[AUTH] Initialized default admin account '${defaultUser}'.`);
        return created;
    }
    return null;
}

module.exports = { findByUsername, findById, createAdmin, countAdmins, ensureDefaultAdmin };
