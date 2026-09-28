const express = require('express');
const router = express.Router();
const {
  getTodayStatus,
  submitDailyBreakfast,
  submitMultiDayAbsence,
  updateActualStatus,
  getOwnHistory,
  getAdminSummary,
  getAdminDailyRecords,
  getDailyEntry,
  saveDailyEntry,
  getAdditionalOrders,
  saveAdditionalOrder,
  updateAdditionalOrder,
  deleteAdditionalOrder,
  getAllOrders
} = require('../controllers/breakfastController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(protect);

router.get('/today', requirePermission('breakfast.view_own'), getTodayStatus);
router.post('/submit', requirePermission('breakfast.submit'), submitDailyBreakfast);
router.post('/multi-day-absence', requirePermission('breakfast.submit'), submitMultiDayAbsence);
router.get('/history', requirePermission('breakfast.history_own'), getOwnHistory);

// Admin / Operational routes
router.get('/admin/summary', requirePermission('breakfast.view'), getAdminSummary);
router.get('/admin/records', requirePermission('breakfast.view'), getAdminDailyRecords);
router.put('/actual-status', requirePermission('breakfast.manage'), updateActualStatus);

// Daily Entry & Additional Orders Workflow routes
router.get('/daily-entry', requirePermission('breakfast.view'), getDailyEntry);
router.post('/daily-entry', requirePermission('breakfast.manage'), saveDailyEntry);
router.get('/additional-orders', requirePermission('breakfast.view'), getAdditionalOrders);
router.post('/additional-orders', requirePermission('breakfast.manage'), saveAdditionalOrder);
router.put('/additional-orders/:id', requirePermission('breakfast.manage'), updateAdditionalOrder);
router.delete('/additional-orders/:id', requirePermission('breakfast.manage'), deleteAdditionalOrder);

// All Orders route (Unified list of Daily Entries + Additional Orders)
router.get('/orders', requirePermission('breakfast.view'), getAllOrders);

module.exports = router;
