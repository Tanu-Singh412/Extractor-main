const { Router } = require('express');
const controller = require('../controllers/export.controller');

const router = Router();
router.get('/csv', controller.downloadCsv);
router.get('/json', controller.downloadJson);

module.exports = router;
