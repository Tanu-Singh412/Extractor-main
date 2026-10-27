const { Router } = require('express');
const registryRoutes = require('./registry.routes');
const exportRoutes = require('./export.routes');
const scanRoutes = require('./scan.routes');
const companyRoutes = require('./company.routes');

const router = Router();
router.use('/passports', registryRoutes);
router.use('/companies', companyRoutes);
router.use('/export', exportRoutes);
router.use('/', scanRoutes);

module.exports = router;
