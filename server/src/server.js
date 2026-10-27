const path = require('path');
const { SERVER_ROOT } = require('./config/paths');

require('dotenv').config({ path: path.join(SERVER_ROOT, '.env') });

const app = require('./app');
const { warmUpOcrWorker } = require('./services/ocr/worker');
const { connectDB } = require('./config/db');
const { ensureDefaultAdmin } = require('./repositories/admin.repository');
const { initDB: initRegistryDB } = require('./repositories/registry.repository');
const { initDB: initCompanyDB } = require('./repositories/company.repository');
const { initSessions } = require('./services/session.service');
const { initInsuranceAccounts } = require('./repositories/insurance-account.repository');

const DEFAULT_PORT = 5058;
const MAX_PORT = 5100;
let initialized = false;

function initializeRuntime() {
    if (initialized) return;
    initialized = true;
    process.on('uncaughtException', err => {
        console.error('[FATAL-GUARD] uncaughtException caught, server alive:', err.message);
    });
    process.on('unhandledRejection', err => {
        console.error('[FATAL-GUARD] unhandledRejection caught, server alive:', err && err.message ? err.message : err);
    });

    (async () => {
        try {
            await connectDB();
            await initRegistryDB();
            await initCompanyDB();
            await ensureDefaultAdmin();
            await initSessions();
            await initInsuranceAccounts();
        } catch (err) {
            console.warn('[SERVER] Database initialization warning:', err.message);
        }
    })();

    warmUpOcrWorker();
}



function startServer(port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT) {
    initializeRuntime();
    const server = app.listen(port, () => console.log(`[SERVER] Running on http://localhost:${port}`));
    server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
            if (port < MAX_PORT) {
                console.warn(`[FATAL-GUARD] Port ${port} in use – trying ${port + 1}`);
                startServer(port + 1);
            } else {
                console.error(`[FATAL-GUARD] No free port found between ${DEFAULT_PORT} and ${MAX_PORT}. Exiting.`);
                process.exit(1);
            }
        } else {
            console.error(`[FATAL-GUARD] Server failed to start on port ${port}:`, err);
            process.exit(1);
        }
    });
    return server;
}

if (require.main === module) startServer();

module.exports = { startServer };
