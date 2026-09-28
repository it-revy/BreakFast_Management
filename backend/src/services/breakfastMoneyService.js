const BreakfastMoneyTransaction = require('../models/BreakfastMoneyTransaction');
const BreakfastFundRequest = require('../models/BreakfastFundRequest');
const BreakfastSetting = require('../models/BreakfastSetting');
const { getKolkataDateString } = require('../utils/dateUtils');

/**
 * Get configured Breakfast Fund Limit (default: ₹2,500).
 */
const getFundLimit = async () => {
  const setting = await BreakfastSetting.findOne();
  return setting && setting.breakfastFundLimit ? setting.breakfastFundLimit : 2500;
};

/**
 * Get authoritative money balance metrics.
 */
const getMoneyBalanceMetrics = async () => {
  const fundLimit = await getFundLimit();

  const latestTxn = await BreakfastMoneyTransaction.findOne().sort({ createdAt: -1, _id: -1 });
  const currentBalance = latestTxn ? latestTxn.balanceAfterTransaction : 0;

  const aggregated = await BreakfastMoneyTransaction.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let totalReceived = 0;
  let totalSpent = 0;
  let totalAdjustments = 0;
  let totalReversals = 0;

  aggregated.forEach(group => {
    if (group._id === 'MONEY_RECEIVED') {
      totalReceived = group.total;
    } else if (group._id === 'BREAKFAST_EXPENSE') {
      totalSpent = group.total;
    } else if (group._id === 'ADJUSTMENT') {
      totalAdjustments = group.total;
    } else if (group._id === 'REVERSAL') {
      totalReversals = group.total;
    }
  });

  const recommendedRequest = Math.max(0, fundLimit - currentBalance);
  const lowBalanceWarning = currentBalance < 100;

  return {
    fundLimit,
    currentBalance,
    totalReceived,
    totalSpent,
    totalAdjustments,
    totalReversals,
    recommendedRequest,
    lowBalanceWarning
  };
};

/**
 * Record Money Received from Finance.
 */
const recordMoneyReceived = async ({
  transactionDate,
  transactionTime,
  amount,
  source = 'Finance Team',
  referenceType = 'MONEY_RECEIVED',
  referenceId = null,
  note = '',
  createdBy
}) => {
  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const dateStr = transactionDate || getKolkataDateString();
  const timeStr = transactionTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const metrics = await getMoneyBalanceMetrics();
  const newBalance = metrics.currentBalance + parsedAmount;

  const transactionId = `TXN-RECV-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

  const transaction = new BreakfastMoneyTransaction({
    transactionId,
    transactionDate: dateStr,
    transactionTime: timeStr,
    type: 'MONEY_RECEIVED',
    amount: parsedAmount,
    balanceAfterTransaction: newBalance,
    source,
    referenceType,
    referenceId: referenceId || transactionId,
    expenseCategory: 'MONEY_RECEIVED',
    description: `Received ₹${parsedAmount} from ${source}`,
    note,
    createdBy
  });

  await transaction.save();
  return { transaction, newBalance };
};

/**
 * Record Breakfast Expense (Checks available balance to prevent negative balance).
 */
const recordExpense = async ({
  transactionDate,
  transactionTime,
  amount,
  source = 'Breakfast Operations',
  referenceType = 'MANUAL_EXPENSE',
  referenceId = null,
  expenseCategory = 'OTHER_BREAKFAST_EXPENSE',
  expensePurpose = 'EMPLOYEE',
  description = '',
  note = '',
  createdBy,
  allowNegative = false
}) => {
  const parsedAmount = Number(amount);
  if (parsedAmount <= 0) {
    throw new Error('Expense amount must be a positive number');
  }

  const metrics = await getMoneyBalanceMetrics();
  if (!allowNegative && metrics.currentBalance < parsedAmount) {
    const shortfall = parsedAmount - metrics.currentBalance;
    const err = new Error(`Insufficient breakfast fund balance. Available: ₹${metrics.currentBalance}, Required: ₹${parsedAmount}, Shortfall: ₹${shortfall}`);
    err.isInsufficient = true;
    err.currentBalance = metrics.currentBalance;
    err.required = parsedAmount;
    err.shortfall = shortfall;
    throw err;
  }

  const dateStr = transactionDate || getKolkataDateString();
  const timeStr = transactionTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newBalance = metrics.currentBalance - parsedAmount;
  const transactionId = `TXN-EXP-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

  const transaction = new BreakfastMoneyTransaction({
    transactionId,
    transactionDate: dateStr,
    transactionTime: timeStr,
    type: 'BREAKFAST_EXPENSE',
    amount: parsedAmount,
    balanceAfterTransaction: newBalance,
    source,
    referenceType,
    referenceId: referenceId || transactionId,
    expenseCategory,
    expensePurpose,
    description: description || `Breakfast Expense of ₹${parsedAmount}`,
    note,
    createdBy
  });

  await transaction.save();
  return { transaction, newBalance };
};

/**
 * Process Daily Entry Expense.
 */
const processDailyEntryExpense = async ({
  businessDate,
  newTotalCost,
  createdBy
}) => {
  const targetCost = Number(newTotalCost) || 0;

  const existingTxns = await BreakfastMoneyTransaction.find({
    referenceType: 'DAILY_ENTRY',
    referenceId: businessDate
  });

  let existingTotal = 0;
  existingTxns.forEach(t => {
    if (t.type === 'BREAKFAST_EXPENSE') {
      existingTotal += t.amount;
    } else if (t.type === 'ADJUSTMENT') {
      existingTotal -= t.amount;
    }
  });

  const diff = targetCost - existingTotal;
  if (diff === 0) {
    const metrics = await getMoneyBalanceMetrics();
    return { adjusted: false, currentBalance: metrics.currentBalance };
  }

  if (diff > 0) {
    return await recordExpense({
      transactionDate: businessDate,
      transactionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: diff,
      source: 'Daily Entry',
      referenceType: 'DAILY_ENTRY',
      referenceId: businessDate,
      expenseCategory: 'DAILY_BREAKFAST',
      expensePurpose: 'EMPLOYEE',
      description: existingTotal > 0 ? `Adjustment increase for Daily Entry on ${businessDate}` : `Daily Entry expense for ${businessDate}`,
      createdBy
    });
  } else {
    const refundAmount = Math.abs(diff);
    const metrics = await getMoneyBalanceMetrics();
    const newBalance = metrics.currentBalance + refundAmount;

    const transactionId = `TXN-ADJ-${businessDate.replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

    const transaction = new BreakfastMoneyTransaction({
      transactionId,
      transactionDate: businessDate,
      transactionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'ADJUSTMENT',
      amount: refundAmount,
      balanceAfterTransaction: newBalance,
      source: 'Daily Entry Adjustment',
      referenceType: 'DAILY_ENTRY',
      referenceId: businessDate,
      expenseCategory: 'ADJUSTMENT',
      description: `Adjustment refund for Daily Entry on ${businessDate} (reduced by ₹${refundAmount})`,
      createdBy
    });

    await transaction.save();
    return { transaction, newBalance };
  }
};

/**
 * Process Additional Order Expense.
 */
const processAdditionalOrderExpense = async ({
  orderId,
  businessDate,
  orderTitle,
  totalCost,
  createdBy
}) => {
  const cost = Number(totalCost) || 0;
  if (cost <= 0) return null;

  return await recordExpense({
    transactionDate: businessDate,
    transactionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    amount: cost,
    source: 'Additional Order',
    referenceType: 'ADDITIONAL_ORDER',
    referenceId: orderId,
    expenseCategory: 'ADDITIONAL_ORDER',
    expensePurpose: 'EMPLOYEE',
    description: `Expense for Additional Order (${orderTitle || orderId})`,
    createdBy
  });
};

/**
 * Process financial adjustment when an Additional Order is updated.
 */
const processAdditionalOrderUpdate = async ({
  orderId,
  businessDate,
  orderTitle,
  newTotalCost,
  createdBy
}) => {
  const targetCost = Number(newTotalCost) || 0;

  const existingTxns = await BreakfastMoneyTransaction.find({
    referenceType: 'ADDITIONAL_ORDER',
    referenceId: orderId
  });

  let existingTotal = 0;
  existingTxns.forEach(t => {
    if (t.type === 'BREAKFAST_EXPENSE') {
      existingTotal += t.amount;
    } else if (t.type === 'ADJUSTMENT') {
      existingTotal -= t.amount;
    }
  });

  const diff = targetCost - existingTotal;
  if (diff === 0) {
    const metrics = await getMoneyBalanceMetrics();
    return { adjusted: false, currentBalance: metrics.currentBalance, financialImpact: 0 };
  }

  if (diff > 0) {
    const result = await recordExpense({
      transactionDate: businessDate,
      transactionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: diff,
      source: 'Additional Order Update',
      referenceType: 'ADDITIONAL_ORDER',
      referenceId: orderId,
      expenseCategory: 'ADDITIONAL_ORDER',
      expensePurpose: 'EMPLOYEE',
      description: existingTotal > 0
        ? `Adjustment increase for Additional Order (${orderTitle || orderId}) from ₹${existingTotal} to ₹${targetCost} (+₹${diff})`
        : `Expense for Additional Order (${orderTitle || orderId})`,
      createdBy
    });
    return { ...result, adjusted: true, financialImpact: diff };
  } else {
    const refundAmount = Math.abs(diff);
    const metrics = await getMoneyBalanceMetrics();
    const newBalance = metrics.currentBalance + refundAmount;

    const transactionId = `TXN-ADJ-${orderId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const transaction = new BreakfastMoneyTransaction({
      transactionId,
      transactionDate: businessDate,
      transactionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'ADJUSTMENT',
      amount: refundAmount,
      balanceAfterTransaction: newBalance,
      source: 'Additional Order Adjustment',
      referenceType: 'ADDITIONAL_ORDER',
      referenceId: orderId,
      expenseCategory: 'ADJUSTMENT',
      description: `Adjustment refund for Additional Order (${orderTitle || orderId}) from ₹${existingTotal} to ₹${targetCost} (-₹${refundAmount})`,
      createdBy
    });

    await transaction.save();
    return { transaction, newBalance, adjusted: true, financialImpact: -refundAmount };
  }
};

/**
 * Reverse expense when an Additional Order is deleted.
 */
const reverseAdditionalOrderExpense = async ({
  orderId,
  businessDate,
  orderTitle,
  createdBy
}) => {
  const existingTxns = await BreakfastMoneyTransaction.find({
    referenceType: 'ADDITIONAL_ORDER',
    referenceId: orderId
  });

  let totalSpent = 0;
  existingTxns.forEach(t => {
    if (t.type === 'BREAKFAST_EXPENSE') {
      totalSpent += t.amount;
    } else if (t.type === 'ADJUSTMENT') {
      totalSpent -= t.amount;
    }
  });

  if (totalSpent <= 0) return null;

  const metrics = await getMoneyBalanceMetrics();
  const newBalance = metrics.currentBalance + totalSpent;
  const dateStr = getKolkataDateString();

  const transactionId = `TXN-REV-${orderId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

  const transaction = new BreakfastMoneyTransaction({
    transactionId,
    transactionDate: dateStr,
    transactionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'REVERSAL',
    amount: totalSpent,
    balanceAfterTransaction: newBalance,
    source: 'Order Deletion Reversal',
    referenceType: 'ADDITIONAL_ORDER',
    referenceId: orderId,
    expenseCategory: 'REVERSAL',
    description: `Reversal refund for deleted Additional Order (${orderTitle || orderId})`,
    createdBy
  });

  await transaction.save();
  return { transaction, newBalance };
};

/**
 * Create a new Breakfast Fund Request (Breakfast Admin).
 */
const createFundRequest = async ({ requestedAmount, reason, requestedBy }) => {
  const amount = Number(requestedAmount);
  if (!amount || amount <= 0) {
    throw new Error('Requested amount must be a positive number');
  }

  const metrics = await getMoneyBalanceMetrics();
  const fundLimit = metrics.fundLimit;

  // Rule 1: Check active pending request
  const pendingStatuses = ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'MONEY_PROVIDED', 'RECEIPT_PENDING'];
  const existingRequest = await BreakfastFundRequest.findOne({ status: { $in: pendingStatuses } });
  if (existingRequest) {
    const err = new Error(`A fund request (${existingRequest.requestId}) is already in progress with status '${existingRequest.status}'.`);
    err.existingRequest = existingRequest;
    throw err;
  }

  // Rule 2: Check currentBalance + requestedAmount > fundLimit
  if (metrics.currentBalance + amount > fundLimit) {
    const maxAllowed = Math.max(0, fundLimit - metrics.currentBalance);
    const err = new Error(`Requested amount of ₹${amount.toLocaleString('en-IN')} would cause current balance (₹${metrics.currentBalance.toLocaleString('en-IN')}) to exceed the Maximum Current Balance of ₹${fundLimit.toLocaleString('en-IN')}. Maximum request allowed: ₹${maxAllowed.toLocaleString('en-IN')}.`);
    err.exceedsLimit = true;
    err.fundLimit = fundLimit;
    err.currentBalance = metrics.currentBalance;
    err.requestedAmount = amount;
    throw err;
  }

  const count = await BreakfastFundRequest.countDocuments();
  const requestId = `BF-REQ-${String(count + 1).padStart(5, '0')}`;
  const dateStr = getKolkataDateString();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const fundRequest = new BreakfastFundRequest({
    requestId,
    requestedBy,
    requestDate: dateStr,
    requestTime: timeStr,
    currentBalance: metrics.currentBalance,
    fundLimit,
    requestedAmount: amount,
    expectedBalance: metrics.currentBalance + amount,
    reason: reason || 'Operating cash fund replenishment',
    status: 'PENDING_APPROVAL'
  });

  await fundRequest.save();
  return fundRequest;
};

/**
 * Get Fund Requests list.
 */
const getFundRequests = async ({ status, search } = {}) => {
  let query = {};
  if (status && status !== 'ALL') {
    query.status = status;
  }

  let requests = await BreakfastFundRequest.find(query).sort({ createdAt: -1 });

  if (search) {
    const s = search.toLowerCase();
    requests = requests.filter(r =>
      r.requestId.toLowerCase().includes(s) ||
      r.requestedBy.toLowerCase().includes(s) ||
      (r.reason && r.reason.toLowerCase().includes(s))
    );
  }

  return requests;
};

/**
 * Get active fund request if any.
 */
const getActiveFundRequest = async () => {
  const pendingStatuses = ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'MONEY_PROVIDED', 'RECEIPT_PENDING'];
  return await BreakfastFundRequest.findOne({ status: { $in: pendingStatuses } }).sort({ createdAt: -1 });
};

/**
 * Approve Fund Request (Finance Manager).
 * IMPORTANT: Approval does NOT increase available balance!
 */
const approveFundRequest = async ({ requestId, approvedAmount, approvedBy }) => {
  const req = await BreakfastFundRequest.findOne({ requestId });
  if (!req) throw new Error('Fund request not found');

  if (req.status !== 'PENDING_APPROVAL' && req.status !== 'SUBMITTED') {
    throw new Error(`Cannot approve request in '${req.status}' status`);
  }

  const amount = Number(approvedAmount) || req.requestedAmount;
  req.status = 'APPROVED';
  req.approvedAmount = amount;
  req.approvedBy = approvedBy;
  req.approvedAt = new Date();

  await req.save();
  return req;
};

/**
 * Reject Fund Request (Finance Manager). Requires reason.
 */
const rejectFundRequest = async ({ requestId, rejectionReason, rejectedBy }) => {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error('Rejection reason is required');
  }

  const req = await BreakfastFundRequest.findOne({ requestId });
  if (!req) throw new Error('Fund request not found');

  req.status = 'REJECTED';
  req.rejectionReason = rejectionReason;

  await req.save();
  return req;
};

/**
 * Finance Manager records Money Provided.
 * IMPORTANT: Money remains unverified/unavailable to Breakfast Admin until receipt confirmation!
 */
const provideFundMoney = async ({
  requestId,
  providedAmount,
  providedDate,
  providedTime,
  reference,
  note,
  providedBy
}) => {
  const req = await BreakfastFundRequest.findOne({ requestId });
  if (!req) throw new Error('Fund request not found');

  if (req.status !== 'APPROVED' && req.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot provide money for request in '${req.status}' status`);
  }

  const amount = Number(providedAmount) || req.approvedAmount || req.requestedAmount;
  if (!amount || amount <= 0) throw new Error('Valid provided amount is required');

  req.status = 'RECEIPT_PENDING';
  req.providedAmount = amount;
  req.providedDate = providedDate || getKolkataDateString();
  req.providedTime = providedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  req.reference = reference || `TRANSFER-${Date.now().toString().slice(-6)}`;
  req.providedNote = note || '';
  req.providedBy = providedBy;
  req.providedAt = new Date();

  await req.save();
  return req;
};

/**
 * Breakfast Admin verifies receipt of provided money.
 * ONLY after receipt confirmation, MONEY_RECEIVED transaction is recorded in ledger!
 */
const verifyFundReceipt = async ({ requestId, verifiedAmount, differenceNote, verifiedBy }) => {
  const req = await BreakfastFundRequest.findOne({ requestId });
  if (!req) throw new Error('Fund request not found');

  if (req.status !== 'RECEIPT_PENDING' && req.status !== 'MONEY_PROVIDED') {
    throw new Error(`Cannot verify receipt for request in '${req.status}' status`);
  }

  const expectedAmount = req.providedAmount || req.approvedAmount || req.requestedAmount;
  const actualAmount = Number(verifiedAmount);

  if (!actualAmount || actualAmount <= 0) {
    throw new Error('Valid verified amount is required');
  }

  if (actualAmount !== expectedAmount) {
    req.differenceReported = {
      reported: true,
      expectedAmount,
      receivedAmount: actualAmount,
      differenceAmount: Math.abs(expectedAmount - actualAmount),
      note: differenceNote || 'Discrepancy reported during receipt verification'
    };
  }

  // Record ledger transaction MONEY_RECEIVED
  const { transaction, newBalance } = await recordMoneyReceived({
    transactionDate: req.providedDate || getKolkataDateString(),
    transactionTime: req.providedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    amount: actualAmount,
    source: `Finance (${req.providedBy || 'Finance Team'})`,
    referenceType: 'BREAKFAST_FUND_REQUEST',
    referenceId: req.requestId,
    note: req.providedNote || `Fund request ${req.requestId} verified receipt`,
    createdBy: verifiedBy
  });

  req.status = 'RECEIVED_VERIFIED';
  req.verifiedAmount = actualAmount;
  req.verifiedBy = verifiedBy;
  req.verifiedAt = new Date();

  await req.save();

  return { request: req, transaction, newBalance };
};

/**
 * Get Daily Money Statement for a given date.
 */
const getDailyMoneyStatement = async (dateStr) => {
  const targetDate = dateStr || getKolkataDateString();
  const txns = await BreakfastMoneyTransaction.find({ transactionDate: targetDate }).sort({ createdAt: 1 });

  let moneyReceived = 0;
  let dailyBreakfastExpense = 0;
  let additionalOrderExpense = 0;
  let otherExpense = 0;
  let adjustments = 0;
  let reversals = 0;

  txns.forEach(t => {
    if (t.type === 'MONEY_RECEIVED') {
      moneyReceived += t.amount;
    } else if (t.type === 'BREAKFAST_EXPENSE') {
      if (t.referenceType === 'DAILY_ENTRY') dailyBreakfastExpense += t.amount;
      else if (t.referenceType === 'ADDITIONAL_ORDER') additionalOrderExpense += t.amount;
      else otherExpense += t.amount;
    } else if (t.type === 'ADJUSTMENT') {
      adjustments += t.amount;
    } else if (t.type === 'REVERSAL') {
      reversals += t.amount;
    }
  });

  const dayEndTxn = await BreakfastMoneyTransaction.findOne({ transactionDate: { $lte: targetDate } }).sort({ createdAt: -1, _id: -1 });

  return {
    date: targetDate,
    moneyReceived,
    dailyBreakfastExpense,
    additionalOrderExpense,
    otherExpense,
    adjustments,
    reversals,
    totalExpenses: dailyBreakfastExpense + additionalOrderExpense + otherExpense,
    closingBalance: dayEndTxn ? dayEndTxn.balanceAfterTransaction : 0,
    transactions: txns
  };
};

/**
 * Get Monthly Money Statement.
 */
const getMonthlyMoneyStatement = async (monthStr) => {
  const currentMonth = monthStr || getKolkataDateString().substring(0, 7);
  const startDate = `${currentMonth}-01`;
  const endDate = `${currentMonth}-31`;

  const priorTxn = await BreakfastMoneyTransaction.findOne({ transactionDate: { $lt: startDate } }).sort({ createdAt: -1, _id: -1 });
  const openingBalance = priorTxn ? priorTxn.balanceAfterTransaction : 0;

  const monthlyTxns = await BreakfastMoneyTransaction.find({
    transactionDate: { $gte: startDate, $lte: endDate }
  }).sort({ createdAt: 1 });

  let totalReceived = 0;
  let dailyBreakfastExpenses = 0;
  let additionalOrderExpenses = 0;
  let otherExpenses = 0;
  let adjustments = 0;
  let reversals = 0;

  monthlyTxns.forEach(t => {
    if (t.type === 'MONEY_RECEIVED') {
      totalReceived += t.amount;
    } else if (t.type === 'BREAKFAST_EXPENSE') {
      if (t.referenceType === 'DAILY_ENTRY') dailyBreakfastExpenses += t.amount;
      else if (t.referenceType === 'ADDITIONAL_ORDER') additionalOrderExpenses += t.amount;
      else otherExpenses += t.amount;
    } else if (t.type === 'ADJUSTMENT') {
      adjustments += t.amount;
    } else if (t.type === 'REVERSAL') {
      reversals += t.amount;
    }
  });

  const monthEndTxn = await BreakfastMoneyTransaction.findOne({ transactionDate: { $lte: endDate } }).sort({ createdAt: -1, _id: -1 });
  const closingBalance = monthEndTxn ? monthEndTxn.balanceAfterTransaction : openingBalance;

  return {
    month: currentMonth,
    openingBalance,
    totalReceived,
    dailyBreakfastExpenses,
    additionalOrderExpenses,
    otherExpenses,
    totalExpenses: dailyBreakfastExpenses + additionalOrderExpenses + otherExpenses,
    adjustments,
    reversals,
    closingBalance,
    transactionCount: monthlyTxns.length
  };
};

module.exports = {
  getFundLimit,
  getMoneyBalanceMetrics,
  recordMoneyReceived,
  recordExpense,
  processDailyEntryExpense,
  processAdditionalOrderExpense,
  processAdditionalOrderUpdate,
  reverseAdditionalOrderExpense,
  createFundRequest,
  getFundRequests,
  getActiveFundRequest,
  approveFundRequest,
  rejectFundRequest,
  provideFundMoney,
  verifyFundReceipt,
  getDailyMoneyStatement,
  getMonthlyMoneyStatement
};
