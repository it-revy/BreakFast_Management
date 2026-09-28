const {
  getMoneyBalanceMetrics,
  recordMoneyReceived,
  recordExpense,
  getDailyMoneyStatement,
  getMonthlyMoneyStatement,
  createFundRequest,
  getFundRequests,
  getActiveFundRequest,
  approveFundRequest,
  rejectFundRequest,
  provideFundMoney,
  verifyFundReceipt
} = require('../services/breakfastMoneyService');
const BreakfastMoneyTransaction = require('../models/BreakfastMoneyTransaction');
const { logAudit } = require('../middleware/auditLogger');
const { getKolkataDateString } = require('../utils/dateUtils');

// Get current money balance summary
const getMoneyBalance = async (req, res) => {
  try {
    const metrics = await getMoneyBalanceMetrics();
    const activeRequest = await getActiveFundRequest();
    res.json({
      success: true,
      metrics,
      activeRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch money balance', error: error.message });
  }
};

// Create a Fund Request (Breakfast Admin)
const postCreateFundRequest = async (req, res) => {
  try {
    const { requestedAmount, reason } = req.body;

    try {
      const fundRequest = await createFundRequest({
        requestedAmount,
        reason,
        requestedBy: req.user.name
      });

      await logAudit(
        req,
        'BREAKFAST_MONEY_REQUEST_CREATED',
        {
          requestId: fundRequest.requestId,
          requestedAmount: fundRequest.requestedAmount,
          currentBalance: fundRequest.currentBalance,
          fundLimit: fundRequest.fundLimit,
          details: `Requested ₹${fundRequest.requestedAmount} fund replenishment (${reason || 'No reason'})`
        },
        null,
        fundRequest.toJSON()
      );

      res.status(201).json({
        success: true,
        message: `Fund request ${fundRequest.requestId} for ₹${fundRequest.requestedAmount} submitted successfully`,
        fundRequest
      });
    } catch (err) {
      if (err.exceedsLimit) {
        return res.status(400).json({
          success: false,
          exceedsLimit: true,
          message: err.message,
          fundLimit: err.fundLimit,
          currentBalance: err.currentBalance,
          requestedAmount: err.requestedAmount
        });
      }
      if (err.existingRequest) {
        return res.status(400).json({
          success: false,
          existingRequest: true,
          message: err.message,
          activeRequest: err.existingRequest
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create fund request' });
  }
};

// Get List of Fund Requests
const getFundRequestsController = async (req, res) => {
  try {
    const { status, search } = req.query;
    const requests = await getFundRequests({ status, search });
    const metrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      metrics,
      requests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch fund requests', error: error.message });
  }
};

// Get Active Pending Fund Request
const getActiveFundRequestController = async (req, res) => {
  try {
    const activeRequest = await getActiveFundRequest();
    res.json({
      success: true,
      activeRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active fund request', error: error.message });
  }
};

// Finance Manager Approve Fund Request
const postApproveFundRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedAmount } = req.body;

    const fundRequest = await approveFundRequest({
      requestId: id,
      approvedAmount,
      approvedBy: req.user.name
    });

    await logAudit(
      req,
      'BREAKFAST_MONEY_REQUEST_APPROVED',
      {
        requestId: fundRequest.requestId,
        approvedAmount: fundRequest.approvedAmount,
        approvedBy: req.user.name,
        details: `Approved fund request ${fundRequest.requestId} for ₹${fundRequest.approvedAmount}`
      },
      null,
      fundRequest.toJSON()
    );

    res.json({
      success: true,
      message: `Fund request ${fundRequest.requestId} approved for ₹${fundRequest.approvedAmount}. Note: Balance will be updated when Breakfast Admin confirms receipt.`,
      fundRequest
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to approve fund request' });
  }
};

// Finance Manager Reject Fund Request
const postRejectFundRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const fundRequest = await rejectFundRequest({
      requestId: id,
      rejectionReason,
      rejectedBy: req.user.name
    });

    await logAudit(
      req,
      'BREAKFAST_MONEY_REQUEST_REJECTED',
      {
        requestId: fundRequest.requestId,
        rejectionReason,
        rejectedBy: req.user.name,
        details: `Rejected fund request ${fundRequest.requestId}: ${rejectionReason}`
      },
      null,
      fundRequest.toJSON()
    );

    res.json({
      success: true,
      message: `Fund request ${fundRequest.requestId} rejected`,
      fundRequest
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to reject fund request' });
  }
};

// Finance Manager Record Provided Money
const postProvideFundMoney = async (req, res) => {
  try {
    const { id } = req.params;
    const { providedAmount, providedDate, providedTime, reference, note } = req.body;

    const fundRequest = await provideFundMoney({
      requestId: id,
      providedAmount,
      providedDate,
      providedTime,
      reference,
      note,
      providedBy: req.user.name
    });

    await logAudit(
      req,
      'BREAKFAST_MONEY_PROVIDED',
      {
        requestId: fundRequest.requestId,
        providedAmount: fundRequest.providedAmount,
        reference: fundRequest.reference,
        providedBy: req.user.name,
        details: `Recorded provision of ₹${fundRequest.providedAmount} for request ${fundRequest.requestId}`
      },
      null,
      fundRequest.toJSON()
    );

    res.json({
      success: true,
      message: `Money provision of ₹${fundRequest.providedAmount} recorded. Pending Breakfast Admin verification receipt.`,
      fundRequest
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to record provided money' });
  }
};

// Breakfast Admin Verify Receipt
const postVerifyFundReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedAmount, differenceNote } = req.body;

    const { request, transaction, newBalance } = await verifyFundReceipt({
      requestId: id,
      verifiedAmount,
      differenceNote,
      verifiedBy: req.user.name
    });

    await logAudit(
      req,
      'BREAKFAST_MONEY_RECEIPT_VERIFIED',
      {
        requestId: request.requestId,
        verifiedAmount: request.verifiedAmount,
        newBalance,
        verifiedBy: req.user.name,
        details: `Verified receipt of ₹${request.verifiedAmount} for ${request.requestId}. Available balance updated to ₹${newBalance}`
      },
      null,
      request.toJSON()
    );

    res.json({
      success: true,
      message: `Receipt of ₹${request.verifiedAmount} verified successfully. New Available Balance: ₹${newBalance}`,
      fundRequest: request,
      transaction,
      newBalance
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to verify receipt' });
  }
};

// Record Money Received directly from Finance (Legacy / Direct)
const postReceiveMoney = async (req, res) => {
  try {
    const { transactionDate, transactionTime, amount, source, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    const { transaction, newBalance } = await recordMoneyReceived({
      transactionDate,
      transactionTime,
      amount,
      source: source || 'Finance Team',
      note,
      createdBy: req.user.name
    });

    await logAudit(
      req,
      'BREAKFAST_MONEY_RECEIVED',
      {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        source: transaction.source,
        newBalance,
        details: `Received ₹${transaction.amount} from ${transaction.source}`
      },
      null,
      transaction.toJSON()
    );

    res.status(201).json({
      success: true,
      message: `Successfully recorded ₹${transaction.amount} received from ${transaction.source}`,
      transaction,
      newBalance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record money received' });
  }
};

// Record Manual Breakfast Expense
const postRecordExpense = async (req, res) => {
  try {
    const { transactionDate, transactionTime, amount, source, expenseCategory, expensePurpose, description, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive expense amount is required' });
    }

    try {
      const { transaction, newBalance } = await recordExpense({
        transactionDate,
        transactionTime,
        amount,
        source: source || 'Manual Expense',
        referenceType: 'MANUAL_EXPENSE',
        expenseCategory: expenseCategory || 'OTHER_BREAKFAST_EXPENSE',
        expensePurpose: expensePurpose || 'EMPLOYEE',
        description,
        note,
        createdBy: req.user.name
      });

      await logAudit(
        req,
        'BREAKFAST_EXPENSE_CREATED',
        {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          newBalance,
          details: `Recorded manual expense of ₹${transaction.amount} (${description || 'No description'})`
        },
        null,
        transaction.toJSON()
      );

      res.status(201).json({
        success: true,
        message: `Successfully recorded expense of ₹${transaction.amount}`,
        transaction,
        newBalance
      });
    } catch (err) {
      if (err.isInsufficient) {
        return res.status(400).json({
          success: false,
          isInsufficient: true,
          message: err.message,
          available: err.currentBalance,
          required: err.required,
          shortfall: err.shortfall
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record expense' });
  }
};

// Get List of Financial Transactions
const getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, search } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.transactionDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.transactionDate = { $gte: startDate };
    } else if (endDate) {
      query.transactionDate = { $lte: endDate };
    }

    if (type && type !== 'ALL') {
      query.type = type;
    }

    let txns = await BreakfastMoneyTransaction.find(query).sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      txns = txns.filter(t =>
        t.transactionId.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.source.toLowerCase().includes(s) ||
        (t.createdBy && t.createdBy.toLowerCase().includes(s))
      );
    }

    const metrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      metrics,
      transactions: txns
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transaction history', error: error.message });
  }
};

// Get Daily Money Statement
const getDailyStatement = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getKolkataDateString();

    const statement = await getDailyMoneyStatement(targetDate);
    res.json({
      success: true,
      statement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch daily money statement', error: error.message });
  }
};

// Get Monthly Money Statement
const getMonthlyStatement = async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || getKolkataDateString().substring(0, 7);

    const statement = await getMonthlyMoneyStatement(targetMonth);
    res.json({
      success: true,
      statement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch monthly money statement', error: error.message });
  }
};

module.exports = {
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
};
