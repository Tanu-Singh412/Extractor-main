const { Router } = require('express');
const { login, currentAdmin, logout, changePassword } = require('../controllers/auth.controller');
const { requireAdmin } = require('../middleware/auth.middleware');
const { limitLogin } = require('../middleware/login-limit.middleware');

const router = Router();
router.post('/login', limitLogin, login);
router.get('/me', requireAdmin, currentAdmin);
router.post('/logout', logout);
router.post('/change-password', requireAdmin, changePassword);

module.exports = router;
