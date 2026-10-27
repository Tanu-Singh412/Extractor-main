const express = require('express');
const cors = require('cors');
const path = require('path');
const { CLIENT_DIR, UPLOAD_DIR } = require('./config/paths');
const apiRoutes = require('./routes');
const authRoutes = require('./routes/auth.routes');
const { requireAdmin } = require('./middleware/auth.middleware');
const { allowedOrigin, requireTrustedOrigin } = require('./middleware/origin.middleware');

const app = express();
app.use(cors((req, callback) => callback(null, {
    origin: allowedOrigin(req, req.get('origin')),
    credentials: true,
})));
app.use(express.json());
// Serve built assets, never the source tree containing reference documents.
app.use(express.static(path.join(CLIENT_DIR, 'dist'), {
    etag: false,
    maxAge: 0,
    setHeaders(res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
app.use(express.static(path.join(CLIENT_DIR, 'public')));
app.use('/uploads', requireAdmin, express.static(UPLOAD_DIR, { cacheControl: false, etag: false, lastModified: false }));
app.use('/api', requireTrustedOrigin);
app.use('/api/auth', authRoutes);
app.use('/api', requireAdmin, apiRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Importing the app does not bind a port or warm up OCR workers.
module.exports = app;
