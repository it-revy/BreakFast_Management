const express = require('express');
const router = express.Router();
const { getHolidays, createHoliday, deleteHoliday } = require('../controllers/holidayController');
const { protect } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(protect);

router.get('/', requirePermission('breakfast.view'), getHolidays);
router.post('/', requirePermission('breakfast.holiday.manage'), createHoliday);
router.delete('/:id', requirePermission('breakfast.holiday.manage'), deleteHoliday);

module.exports = router;
