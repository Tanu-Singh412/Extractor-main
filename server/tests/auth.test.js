const assert = require('node:assert/strict');
const fs = require('node:fs');
const { once } = require('node:events');
const { test } = require('node:test');
const { createTestRuntime } = require('./helpers/test-runtime');
const { hashPassword } = require('../src/services/password.service');

async function startAuthTestApp(t) {
    const runtime = createTestRuntime({
        'src/middleware/auth.middleware.js': null
    });
    const realAuth = runtime.load('src/middleware/auth.middleware.js');
    const authService = runtime.load('src/services/session.service.js');
    const adminRepo = runtime.load('src/repositories/admin.repository.js');

    // Seed test admin
    const passwordHash = await hashPassword('password123');
    adminRepo.createAdmin('testadmin', passwordHash);

    const app = runtime.load('src/app.js');
    const server = app.listen(0, '127.0.0.1');
    t.after(async () => {
        await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
        runtime.dispose();
    });
    await once(server, 'listening');
    return { ...runtime, base: `http://127.0.0.1:${server.address().port}`, adminRepo };
}

test('auth routes: login, me, and logout cycle', async t => {
    const { base } = await startAuthTestApp(t);

    // 1. Invalid credentials
    let res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testadmin', password: 'wrongpassword' })
    });
    assert.equal(res.status, 401);

    // 2. Missing credentials
    res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: '' })
    });
    assert.equal(res.status, 400);

    // 3. Valid login
    res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testadmin', password: 'password123' })
    });
    assert.equal(res.status, 200);
    const loginData = await res.json();
    assert.equal(loginData.success, true);
    assert.equal(loginData.admin.username, 'testadmin');

    const cookieHeader = res.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Expected set-cookie header');
    const cookieValue = cookieHeader.split(';')[0];

    // 4. Verify /api/auth/me with session cookie
    res = await fetch(`${base}/api/auth/me`, {
        headers: { Cookie: cookieValue }
    });
    assert.equal(res.status, 200);
    const meData = await res.json();
    assert.equal(meData.success, true);
    assert.equal(meData.admin.username, 'testadmin');

    // 5. Change password with invalid current password
    res = await fetch(`${base}/api/auth/change-password`, {
        method: 'POST',
        headers: { Cookie: cookieValue, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' })
    });
    assert.equal(res.status, 400);

    // 6. Change password successfully
    res = await fetch(`${base}/api/auth/change-password`, {
        method: 'POST',
        headers: { Cookie: cookieValue, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'password123', newPassword: 'newpassword123' })
    });
    assert.equal(res.status, 200);
    const pwdData = await res.json();
    assert.equal(pwdData.success, true);

    // 7. Verify login with new password works
    res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testadmin', password: 'newpassword123' })
    });
    assert.equal(res.status, 200);

    // 8. Logout
    res = await fetch(`${base}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: cookieValue }
    });
    assert.equal(res.status, 200);

    // 9. /api/auth/me after logout should now fail
    res = await fetch(`${base}/api/auth/me`, {
        headers: { Cookie: cookieValue }
    });
    assert.equal(res.status, 401);
});

