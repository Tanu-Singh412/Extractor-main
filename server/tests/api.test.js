const assert = require('node:assert/strict');
const fs = require('node:fs');
const { once } = require('node:events');
const { test } = require('node:test');
const { createTestRuntime } = require('./helpers/test-runtime');

const passportText = [
    'PASSPORT', 'Passport Number: A1234567', 'Surname: ANDERSON',
    'Given Names: JANE ALICE', 'Nationality: UTO', 'Sex: F',
    'Date of Birth: 12/03/1990', 'Date of Issue: 12/03/2020',
    'Date of Expiry: 12/03/2030', 'Place of Issue: LONDON',
    'Place of Birth: LONDON'
].join('\n');

async function startTestApp(t) {
    const runtime = createTestRuntime({
        'src/services/document-text.service.js': {
            async extractTextFromFile(file) {
                const text = fs.readFileSync(file, 'utf8');
                if (text === 'FAIL') throw new Error('Synthetic extraction failure');
                return text;
            }
        }
    });
    const server = runtime.load('src/app.js').listen(0, '127.0.0.1');
    t.after(async () => {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        runtime.dispose();
    });
    await once(server, 'listening');
    return { ...runtime, base: `http://127.0.0.1:${server.address().port}` };
}

test('registry routes persist records and preserve export and error contracts', async t => {
    const { base, paths } = await startTestApp(t);
    assert.deepEqual(await (await fetch(`${base}/api/passports`)).json(), []);
    let response = await fetch(`${base}/api/passports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'test-record', docType: 'PASSPORT', firstName: 'Jane', address: 'Road, "One"\nLondon' })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).record.id, 'test-record');
    assert.equal(JSON.parse(fs.readFileSync(paths.REGISTRY_FILE, 'utf8')).length, 1);

    response = await fetch(`${base}/api/passports/test-record`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Alice', id: 'must-not-change' })
    });
    assert.equal((await response.json()).record.id, 'test-record');
    assert.equal((await (await fetch(`${base}/api/passports`)).json())[0].firstName, 'Alice');
    response = await fetch(`${base}/api/export/csv`);
    assert.match(response.headers.get('content-disposition'), /registry_export\.csv/);
    assert.ok((await response.text()).includes('"Road, ""One""\nLondon"'));
    response = await fetch(`${base}/api/export/json`);
    assert.equal((await response.json())[0].id, 'test-record');
    assert.equal((await fetch(`${base}/api/passports/missing`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
    assert.equal((await fetch(`${base}/api/passports/test-record`, { method: 'DELETE' })).status, 200);
    assert.deepEqual(JSON.parse(fs.readFileSync(paths.REGISTRY_FILE, 'utf8')), []);
    assert.equal((await fetch(`${base}/api/passports/test-record`, { method: 'DELETE' })).status, 404);
    assert.equal((await fetch(`${base}/api/not-a-route`)).status, 404);
});

test('multipart scans, previews, snippets, and partial failures use the same routes', async t => {
    const { base } = await startTestApp(t);
    const upload = () => {
        const form = new FormData();
        form.append('docType', 'PASSPORT');
        form.append('file', new Blob([passportText], { type: 'text/plain' }), 'passport.txt');
        return form;
    };
    let response = await fetch(`${base}/api/scan`, { method: 'POST', body: upload() });
    const scan = await response.json();
    assert.equal(response.status, 200);
    assert.equal(scan.data.passportNo, 'A1234567');
    assert.equal(scan.data.lastName, 'Anderson');
    assert.equal(scan.fileName, 'passport.txt');
    assert.equal(await (await fetch(scan.previewUrl)).text(), passportText);

    const snippet = upload();
    snippet.append('length', '25');
    response = await fetch(`${base}/api/scan/snippet`, { method: 'POST', body: snippet });
    assert.equal((await response.json()).snippet, passportText.slice(0, 25));

    const multiple = new FormData();
    multiple.append('docType', 'PASSPORT');
    multiple.append('files', new Blob([passportText]), 'good.txt');
    multiple.append('files', new Blob(['FAIL']), 'bad.txt');
    response = await fetch(`${base}/api/scan-multi`, { method: 'POST', body: multiple });
    const batch = await response.json();
    assert.equal(batch.success, true);
    assert.equal(batch.results.length, 2);
    assert.equal(batch.results[0].success, true);
    assert.equal(batch.results[1].success, false);
    assert.equal(batch.results[1].fileName, 'bad.txt');
    assert.deepEqual(await (await fetch(`${base}/api/passports`)).json(), []);

    for (const route of ['scan', 'scan-multi', 'scan/snippet']) {
        assert.equal((await fetch(`${base}/api/${route}`, { method: 'POST' })).status, 400);
    }
});
