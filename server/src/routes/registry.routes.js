const { Router } = require('express');
const controller = require('../controllers/registry.controller');

const router = Router();
router.get('/', controller.listRecords);
router.post('/', controller.createRecord);
router.put('/:id', controller.updateRecord);
router.delete('/:id', controller.deleteRecord);

module.exports = router;
