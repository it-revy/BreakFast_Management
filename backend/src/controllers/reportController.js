const Employee = require('../models/Employee');
const BreakfastRecord = require('../models/BreakfastRecord');
const BreakfastDailyEntry = require('../models/BreakfastDailyEntry');
const BreakfastAdditionalOrder = require('../models/BreakfastAdditionalOrder');
const BreakfastMoneyTransaction = require('../models/BreakfastMoneyTransaction');
const BreakfastNonParticipationPeriod = require('../models/BreakfastNonParticipationPeriod');
const { getKolkataDateString } = require('../utils/dateUtils');
const { getMonthCalendarSummary } = require('../services/calendarService');
const { generateReportExcelWorkbook } = require('../services/reportExcelService');

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Get distinct available years across financial ledger, orders, and daily entries
 */
const getAvailableYears = async (req, res) => {
  try {
    const currentKolkataDate = getKolkataDateString();
    const currentYear = currentKolkataDate.substring(0, 4);

    const txnDates = await BreakfastMoneyTransaction.distinct('transactionDate');
    const dailyDates = await BreakfastDailyEntry.distinct('businessDate');
    const additionalDates = await BreakfastAdditionalOrder.distinct('businessDate');
    const recordDates = await BreakfastRecord.distinct('businessDate');

    const yearSet = new Set();
    yearSet.add(currentYear);

    [...txnDates, ...dailyDates, ...additionalDates, ...recordDates].forEach(d => {
      if (d && typeof d === 'string' && d.length >= 4) {
        const y = d.substring(0, 4);
        if (/^\d{4}$/.test(y)) {
          yearSet.add(y);
        }
      }
    });

    const years = Array.from(yearSet).sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      years,
      defaultYear: currentYear
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch available years', error: error.message });
  }
};

/**
 * Helper to build the combined report data (Monthly Summary, Employee Report, Order Summary, Transactions)
 */
const buildReportData = async ({ year, month, department }) => {
  const currentKolkataDate = getKolkataDateString();
  const currentYear = currentKolkataDate.substring(0, 4);
  const currentMonthStr = currentKolkataDate.substring(0, 7); // e.g. "2026-09"

  const selectedYear = year || currentYear;
  const selectedMonth = month || currentMonthStr;
  const selectedDepartment = department || 'ALL';

  // 1. Determine Month Range for Monthly Financial Summary
  let monthsToProcess = [];

  if (selectedYear === 'all') {
    // Get all available years
    const txnDates = await BreakfastMoneyTransaction.distinct('transactionDate');
    const dailyDates = await BreakfastDailyEntry.distinct('businessDate');
    const additionalDates = await BreakfastAdditionalOrder.distinct('businessDate');
    const allDates = [...txnDates, ...dailyDates, ...additionalDates];

    let minYear = parseInt(currentYear, 10);
    allDates.forEach(d => {
      if (d && d.length >= 4) {
        const y = parseInt(d.substring(0, 4), 10);
        if (!isNaN(y) && y < minYear) minYear = y;
      }
    });

    const maxYear = parseInt(currentYear, 10);

    for (let y = minYear; y <= maxYear; y++) {
      const lastMonth = y === maxYear ? parseInt(currentKolkataDate.substring(5, 7), 10) : 12;
      for (let m = 1; m <= lastMonth; m++) {
        const mStr = String(m).padStart(2, '0');
        monthsToProcess.push({
          year: String(y),
          month: mStr,
          yearMonth: `${y}-${mStr}`,
          monthName: `${y} ${MONTH_NAMES[m - 1].substring(0, 3)}`
        });
      }
    }
  } else {
    // Specific Year selected (e.g. 2026)
    const targetY = parseInt(selectedYear, 10);
    const isCurrentYear = selectedYear === currentYear;
    const maxM = isCurrentYear ? parseInt(currentKolkataDate.substring(5, 7), 10) : 12;

    for (let m = 1; m <= maxM; m++) {
      const mStr = String(m).padStart(2, '0');
      monthsToProcess.push({
        year: selectedYear,
        month: mStr,
        yearMonth: `${selectedYear}-${mStr}`,
        monthName: MONTH_NAMES[m - 1]
      });
    }
  }

  // Calculate Monthly Financial Summary from BreakfastMoneyTransaction ledger
  const firstMonthYearMonth = monthsToProcess.length > 0 ? monthsToProcess[0].yearMonth : `${currentYear}-01`;
  const firstMonthStart = `${firstMonthYearMonth}-01`;

  const priorTxn = await BreakfastMoneyTransaction.findOne({
    transactionDate: { $lt: firstMonthStart }
  }).sort({ createdAt: -1, _id: -1 });

  let runningOpeningBalance = priorTxn ? priorTxn.balanceAfterTransaction : 0;

  const monthlySummary = [];

  for (const mObj of monthsToProcess) {
    const startDate = `${mObj.yearMonth}-01`;
    const endDate = `${mObj.yearMonth}-31`;

    const monthlyTxns = await BreakfastMoneyTransaction.find({
      transactionDate: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1, _id: 1 });

    let moneyReceived = 0;
    let expenses = 0;
    let adjustments = 0;
    let reversals = 0;

    monthlyTxns.forEach(t => {
      if (t.type === 'MONEY_RECEIVED') {
        moneyReceived += t.amount;
      } else if (t.type === 'BREAKFAST_EXPENSE') {
        expenses += t.amount;
      } else if (t.type === 'ADJUSTMENT') {
        adjustments += t.amount;
      } else if (t.type === 'REVERSAL') {
        reversals += t.amount;
      }
    });

    const totalSpent = expenses - (adjustments + reversals);

    const monthEndTxn = await BreakfastMoneyTransaction.findOne({
      transactionDate: { $lte: endDate }
    }).sort({ createdAt: -1, _id: -1 });

    const closingBalance = monthEndTxn ? monthEndTxn.balanceAfterTransaction : (runningOpeningBalance + moneyReceived - totalSpent);

    monthlySummary.push({
      year: mObj.year,
      month: mObj.month,
      yearMonth: mObj.yearMonth,
      monthName: mObj.monthName,
      openingBalance: runningOpeningBalance,
      moneyReceived,
      totalSpent,
      closingBalance
    });

    runningOpeningBalance = closingBalance;
  }

  // Yearly Summary Totals
  const totalMoneyReceived = monthlySummary.reduce((sum, r) => sum + r.moneyReceived, 0);
  const totalSpentAll = monthlySummary.reduce((sum, r) => sum + r.totalSpent, 0);
  const finalClosingBalance = monthlySummary.length > 0 ? monthlySummary[monthlySummary.length - 1].closingBalance : runningOpeningBalance;

  const yearlyTotal = {
    totalMoneyReceived,
    totalSpent: totalSpentAll,
    closingBalance: finalClosingBalance
  };

  // 2. Employee Monthly Report Calculation
  let empQuery = { isHardDeleted: false };
  if (selectedDepartment && selectedDepartment !== 'ALL') {
    empQuery.department = selectedDepartment;
  }
  const employees = await Employee.find(empQuery).sort({ employeeId: 1 });

  // Determine list of months to process working days and attendance for
  let empTargetMonths = [];
  if (selectedMonth && selectedMonth !== 'ALL') {
    empTargetMonths = [selectedMonth];
  } else {
    empTargetMonths = monthsToProcess.map(m => m.yearMonth);
  }

  // Pre-calculate month calendar summaries for target months
  const monthSummariesMap = new Map();
  for (const ym of empTargetMonths) {
    const summary = await getMonthCalendarSummary(ym);
    monthSummariesMap.set(ym, summary);
  }

  const allLeavePeriods = await BreakfastNonParticipationPeriod.find({});

  let recordDateQuery = {};
  if (selectedMonth && selectedMonth !== 'ALL') {
    recordDateQuery.businessDate = new RegExp(`^${selectedMonth}`);
  } else if (selectedYear !== 'all') {
    recordDateQuery.businessDate = new RegExp(`^${selectedYear}`);
  }

  const monthRecords = await BreakfastRecord.find(recordDateQuery);

  const employeeRecordsMap = new Map();
  monthRecords.forEach(rec => {
    if (!employeeRecordsMap.has(rec.employeeId)) {
      employeeRecordsMap.set(rec.employeeId, []);
    }
    employeeRecordsMap.get(rec.employeeId).push(rec);
  });

  const employeeReport = employees.map(emp => {
    const isPerm = emp.breakfastParticipationType === 'PERMANENT_NOT_TAKING';
    const records = employeeRecordsMap.get(emp.employeeId) || [];
    const empLeaves = allLeavePeriods.filter(l => l.employeeId.toUpperCase() === emp.employeeId.toUpperCase());

    // Calculate total applicable working days for this employee in the period
    let empTotalWorkingDays = 0;
    monthSummariesMap.forEach(mSummary => {
      mSummary.workingDates.forEach(dateStr => {
        const isOnLeave = empLeaves.some(l => l.fromDate <= dateStr && l.toDate >= dateStr);
        if (!isOnLeave) {
          empTotalWorkingDays++;
        }
      });
    });

    let takenCount = 0;
    let notTakenCount = 0;
    const reasonBreakdown = {};

    records.forEach(r => {
      if (r.response === 'YES' || r.employeeResponse === 'TAKING') {
        takenCount++;
      } else if (r.response === 'NO' || r.employeeResponse === 'NOT_TAKING') {
        notTakenCount++;
        const reasonKey = r.reasonText || r.reasonCode || 'Other';
        reasonBreakdown[reasonKey] = (reasonBreakdown[reasonKey] || 0) + 1;
      }
    });

    const noResponseCount = isPerm ? 0 : Math.max(0, empTotalWorkingDays - (takenCount + notTakenCount));

    return {
      employeeId: emp.employeeId,
      username: emp.username,
      name: emp.name,
      department: emp.department,
      designation: emp.designation,
      participationType: emp.breakfastParticipationType,
      isPermanentNotTaking: isPerm,
      totalDays: empTotalWorkingDays,
      takenCount: isPerm ? 0 : takenCount,
      notTakenCount: isPerm ? 0 : notTakenCount,
      noResponseCount,
      reasonBreakdown: isPerm ? { 'Permanent Non-Participant': empTotalWorkingDays } : reasonBreakdown
    };
  });

  // 3. Order Summary Sheet Calculation
  let orderDateQuery = {};
  if (selectedMonth && selectedMonth !== 'ALL') {
    orderDateQuery.businessDate = new RegExp(`^${selectedMonth}`);
  } else if (selectedYear !== 'all') {
    orderDateQuery.businessDate = new RegExp(`^${selectedYear}`);
  }

  const dailyEntries = await BreakfastDailyEntry.find(orderDateQuery).sort({ businessDate: -1 });
  const additionalOrders = await BreakfastAdditionalOrder.find(orderDateQuery).sort({ businessDate: -1, createdAt: -1 });

  const formatItemsList = (items) => {
    if (!items || !items.length) return '';
    return items.map(i => `${i.name} (${i.quantity} x ₹${i.unitPrice} = ₹${i.total})`).join(', ');
  };

  const orderSummary = [];

  dailyEntries.forEach(de => {
    orderSummary.push({
      orderId: `DAILY-${de.businessDate}`,
      businessDate: de.businessDate,
      orderType: 'DAILY BREAKFAST',
      orderTitle: 'Daily Breakfast Entry',
      orderTime: '10:00 AM',
      applicableCount: (de.summary && de.summary.applicableCount) || 0,
      breakfastItems: formatItemsList(de.breakfastItems),
      commonItems: formatItemsList(de.commonItems),
      totalCost: de.totalCost || 0,
      createdBy: de.createdBy || 'System',
      createdAt: de.createdAt
    });
  });

  additionalOrders.forEach(ao => {
    orderSummary.push({
      orderId: ao.orderId,
      businessDate: ao.businessDate,
      orderType: 'ADDITIONAL ORDER',
      orderTitle: ao.orderTitle || 'Additional Order',
      orderTime: ao.orderTime || '',
      applicableCount: ao.applicableEmployeeCount || 0,
      breakfastItems: formatItemsList(ao.breakfastItems),
      commonItems: formatItemsList(ao.commonItems),
      totalCost: ao.totalCost || 0,
      createdBy: ao.createdBy || 'System',
      createdAt: ao.createdAt
    });
  });

  orderSummary.sort((a, b) => b.businessDate.localeCompare(a.businessDate));

  // 4. Money Transactions Calculation
  let txnDateQuery = {};
  if (selectedMonth && selectedMonth !== 'ALL') {
    txnDateQuery.transactionDate = new RegExp(`^${selectedMonth}`);
  } else if (selectedYear !== 'all') {
    txnDateQuery.transactionDate = new RegExp(`^${selectedYear}`);
  }

  const moneyTransactions = await BreakfastMoneyTransaction.find(txnDateQuery).sort({ transactionDate: 1, createdAt: 1 });

  return {
    selectedYear,
    selectedMonth,
    selectedDepartment,
    monthlySummary,
    yearlyTotal,
    employeeReport,
    orderSummary,
    moneyTransactions
  };
};

/**
 * GET /api/reports/monthly - Main Monthly & Money Report JSON payload
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month, department } = req.query;
    const reportData = await buildReportData({ year, month, department });

    res.json({
      success: true,
      ...reportData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate monthly report', error: error.message });
  }
};

/**
 * GET /api/reports/export-excel - Stream formatted Excel file
 */
const exportMonthlyReportExcel = async (req, res) => {
  try {
    const { year, month, department } = req.query;
    const reportData = await buildReportData({ year, month, department });

    const workbook = await generateReportExcelWorkbook(reportData);

    const yearLabel = reportData.selectedYear === 'all' ? 'All_Years' : reportData.selectedYear;
    const filename = `Breakfast_Money_Report_${yearLabel}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export Excel report', error: error.message });
  }
};

/**
 * CEO Executive Analytics View
 */
const getCeoReport = async (req, res) => {
  try {
    const todayStr = getKolkataDateString();
    const currentMonth = todayStr.substring(0, 7);

    const activeEmployees = await Employee.find({ status: 'active', isHardDeleted: false });
    const totalEmployees = activeEmployees.length;
    const normalCount = activeEmployees.filter(e => e.breakfastParticipationType === 'NORMAL').length;
    const permNotTakingCount = activeEmployees.filter(e => e.breakfastParticipationType === 'PERMANENT_NOT_TAKING').length;

    const todayRecords = await BreakfastRecord.find({ businessDate: todayStr });
    const todayYes = todayRecords.filter(r => r.response === 'YES' || r.employeeResponse === 'TAKING').length;
    const todayNo = todayRecords.filter(r => r.response === 'NO' || r.employeeResponse === 'NOT_TAKING').length;
    const todayResponded = new Set(todayRecords.map(r => r.employeeId));
    const todayPending = normalCount - todayResponded.size;

    const monthRegex = new RegExp(`^${currentMonth}`);
    const monthRecords = await BreakfastRecord.find({ businessDate: monthRegex });

    const dailyEntries = await BreakfastDailyEntry.find({ businessDate: monthRegex });
    const additionalOrders = await BreakfastAdditionalOrder.find({ businessDate: monthRegex });

    const todayEntry = dailyEntries.find(e => e.businessDate === todayStr);
    const todayAdditional = additionalOrders.filter(o => o.businessDate === todayStr);
    const todayCost = (todayEntry ? todayEntry.totalCost : 0) + todayAdditional.reduce((s, o) => s + o.totalCost, 0);

    const totalMonthlyCost = dailyEntries.reduce((s, e) => s + e.totalCost, 0) + additionalOrders.reduce((s, o) => s + o.totalCost, 0);

    const dailyTrendMap = new Map();
    const reasonDistribution = {};

    monthRecords.forEach(r => {
      if (!dailyTrendMap.has(r.businessDate)) {
        dailyTrendMap.set(r.businessDate, { date: r.businessDate, yes: 0, no: 0 });
      }
      const dayData = dailyTrendMap.get(r.businessDate);
      if (r.response === 'YES' || r.employeeResponse === 'TAKING') {
        dayData.yes++;
      } else {
        dayData.no++;
        const reason = r.reasonText || r.reasonCode || 'Other';
        reasonDistribution[reason] = (reasonDistribution[reason] || 0) + 1;
      }
    });

    const dailyTrend = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      currentMonth,
      executiveSummary: {
        totalEmployees,
        normalCount,
        permNotTakingCount,
        todayYes,
        todayNo,
        todayPending,
        todayCost,
        totalMonthlyCost,
        overallParticipationRate: normalCount > 0 ? Math.round((todayYes / normalCount) * 100) : 0
      },
      dailyTrend,
      reasonDistribution
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate CEO report', error: error.message });
  }
};

module.exports = {
  getAvailableYears,
  getMonthlyReport,
  exportMonthlyReportExcel,
  getCeoReport
};
