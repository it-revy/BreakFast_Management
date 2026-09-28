const express = require('express');
const router = express.Router();
const {
  getAvailableYears,
  getMonthlyReport,
  exportMonthlyReportExcel,
  getCeoReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../middleware/rbac');

router.use(protect);

router.get('/years', requireAnyPermission(['breakfast.report', 'breakfast.money.report']), getAvailableYears);
router.get('/monthly', requireAnyPermission(['breakfast.report', 'breakfast.money.report']), getMonthlyReport);
router.get('/export-excel', requireAnyPermission(['breakfast.report', 'breakfast.money.report']), exportMonthlyReportExcel);
router.get('/ceo', requirePermission('breakfast.dashboard.view'), getCeoReport);

module.exports = router;
