const { Router } = require('express');
const upload = require('../middleware/upload.middleware');
const controller = require('../controllers/scan.controller');

const router = Router();
router.post('/scan', upload.single('file'), controller.scanDocument);
router.post('/scan-multi', upload.array('files'), controller.scanDocuments);
router.post('/scan-merge', upload.array('files'), controller.scanMergedDocument);
router.post('/scan/snippet', upload.single('file'), controller.scanSnippet);

module.exports = router;
