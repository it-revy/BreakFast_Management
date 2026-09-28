const express = require('express');
const router = express.Router();
const {
  getMoneyBalance,
  postCreateFundRequest,
  getFundRequestsController,
  getActiveFundRequestController,
  postApproveFundRequest,
  postRejectFundRequest,
  postProvideFundMoney,
  postVerifyFundReceipt,
  postReceiveMoney,
  postRecordExpense,
  getTransactions,
  getDailyStatement,
  getMonthlyStatement
} = require('../controllers/breakfastMoneyController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(protect);

// Balance metrics & Active fund request
router.get('/balance', requirePermission('breakfast.money.view'), getMoneyBalance);

// Fund Request lifecycle
router.post('/requests', requirePermission('breakfast.money.request'), postCreateFundRequest);
router.get('/requests', requirePermission('breakfast.money.view'), getFundRequestsController);
router.get('/requests/active', requirePermission('breakfast.money.view'), getActiveFundRequestController);
router.put('/requests/:id/approve', requirePermission('finance.breakfast_fund.request.approve'), postApproveFundRequest);
router.put('/requests/:id/reject', requirePermission('finance.breakfast_fund.request.reject'), postRejectFundRequest);
router.put('/requests/:id/provide', requirePermission('finance.breakfast_fund.provide'), postProvideFundMoney);
router.put('/requests/:id/verify', requirePermission('breakfast.money.receipt.verify'), postVerifyFundReceipt);

// Direct ledger transactions
router.post('/receive', requirePermission('breakfast.money.receive'), postReceiveMoney);
router.post('/expense', requirePermission('breakfast.money.expense.create'), postRecordExpense);
router.get('/transactions', requirePermission('breakfast.money.view'), getTransactions);
router.get('/statement/daily', requirePermission('breakfast.money.report'), getDailyStatement);
router.get('/statement/monthly', requirePermission('breakfast.money.report'), getMonthlyStatement);

module.exports = router;
