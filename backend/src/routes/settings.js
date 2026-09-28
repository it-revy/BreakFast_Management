const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, addReasonType } = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(protect);

router.get('/', requirePermission('breakfast.settings.manage'), getSettings);
router.put('/', requirePermission('breakfast.settings.manage'), updateSettings);
router.post('/reasons', requirePermission('breakfast.settings.manage'), addReasonType);

module.exports = router;
