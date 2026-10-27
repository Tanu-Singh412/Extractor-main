const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const nativeRequire = createRequire(path.join(SERVER_ROOT, 'package.json'));

// Each test gets its own module cache and storage; real documents are never read.
function createTestRuntime(overrides = {}) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'extractor-test-'));
    const paths = {
        SERVER_ROOT,
        DATA_DIR: path.join(directory, 'data'),
        UPLOAD_DIR: path.join(directory, 'uploads'),
        CLIENT_DIR: path.join(directory, 'client'),
        OCR_OUTPUT_FILE: path.join(directory, 'ocr_last.txt'),
    };
    paths.REGISTRY_FILE = path.join(paths.DATA_DIR, 'passports.json');
    paths.INSURANCE_ACCOUNTS_FILE = path.join(paths.DATA_DIR, 'insurance_accounts.json');
    paths.ADMINS_FILE = path.join(paths.DATA_DIR, 'admins.json');
    fs.mkdirSync(paths.DATA_DIR);
    fs.writeFileSync(paths.REGISTRY_FILE, '[]');
    fs.writeFileSync(paths.ADMINS_FILE, '[]');

    const mocks = new Map([
        [path.join(SERVER_ROOT, 'src/config/paths.js'), paths],
        [path.join(SERVER_ROOT, 'src/middleware/auth.middleware.js'), {
            requireAdmin(req, res, next) {
                req.admin = { id: 'test-admin', username: 'admin', role: 'admin' };
                next();
            }
        }],
    ]);
    for (const [file, value] of Object.entries(overrides)) {
        const fullPath = path.resolve(SERVER_ROOT, file);
        if (value === null) mocks.delete(fullPath);
        else mocks.set(fullPath, value);
    }
    const cache = new Map();
    function load(file) {
        const filename = nativeRequire.resolve(path.resolve(SERVER_ROOT, file));
        if (mocks.has(filename)) return mocks.get(filename);
        if (cache.has(filename)) return cache.get(filename).exports;
        if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
        const module = { exports: {} };
        cache.set(filename, module);
        const localRequire = name => name.startsWith('.')
            ? load(path.resolve(path.dirname(filename), name))
            : nativeRequire(name);
        const wrapper = vm.runInNewContext(
            `(function(require, module, exports, __dirname, __filename) { ${fs.readFileSync(filename, 'utf8')}\n})`,
            { Buffer, process, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} } },
            { filename }
        );
        wrapper(localRequire, module, module.exports, path.dirname(filename), filename);
        return module.exports;
    }
    function dispose() {
        const target = path.resolve(directory);
        assert.ok(target.startsWith(path.resolve(os.tmpdir()) + path.sep));
        assert.ok(path.basename(target).startsWith('extractor-test-'));
        fs.rmSync(target, { recursive: true, force: true });
    }
    return { load, paths, dispose };
}

module.exports = { createTestRuntime };
