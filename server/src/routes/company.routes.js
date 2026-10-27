const { Router } = require('express');
const { getCompanies, addCompany, editCompany, removeCompany } = require('../controllers/company.controller');

const router = Router();

router.get('/', getCompanies);
router.post('/', addCompany);
router.put('/:id', editCompany);
router.delete('/:id', removeCompany);

module.exports = router;
