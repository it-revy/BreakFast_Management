const BreakfastRecord = require('../models/BreakfastRecord');
const BreakfastSetting = require('../models/BreakfastSetting');
const BreakfastReason = require('../models/BreakfastReason');
const BreakfastNonParticipationPeriod = require('../models/BreakfastNonParticipationPeriod');
const PublicHoliday = require('../models/PublicHoliday');
const Employee = require('../models/Employee');
const {
  getKolkataDateString,
  getFormattedDateAndDay,
  isAfterCutoff,
  getNextDayDate
} = require('../utils/dateUtils');
const { logAudit } = require('../middleware/auditLogger');

// Get current status for logged in employee for today's Kolkata business date
const getTodayStatus = async (req, res) => {
  try {
    const todayDateObj = new Date();
    const todayInfo = getFormattedDateAndDay(todayDateObj);

    const settings = (await BreakfastSetting.findOne()) || { cutoffTime: '12:00', timezone: 'Asia/Kolkata' };
    const isCutoffPassed = isAfterCutoff(settings.cutoffTime);

    // Calculate active business date (if past 12 PM, active business date is Next Day)
    const nextDayObj = getNextDayDate(todayDateObj);
    const nextDayInfo = getFormattedDateAndDay(nextDayObj);

    const activeBusinessDateStr = isCutoffPassed ? nextDayInfo.dateStr : todayInfo.dateStr;
    const activeFormattedDisplay = isCutoffPassed ? nextDayInfo.displayString : todayInfo.displayString;

    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const isPublicHoliday = await PublicHoliday.findOne({ date: activeBusinessDateStr, status: 'active' });

    const todayRecord = await BreakfastRecord.findOne({
      employeeId: employee.employeeId,
      businessDate: activeBusinessDateStr
    });

    const reasons = await BreakfastReason.find({ isActive: true }).sort({ displayOrder: 1 });

    res.json({
      success: true,
      businessDate: activeBusinessDateStr,
      todayFormattedDisplay: todayInfo.displayString,
      activeFormattedDisplay,
      isCutoffPassed,
      cutoffTime: settings.cutoffTime,
      employeeId: employee.employeeId,
      name: employee.name,
      participationType: employee.breakfastParticipationType,
      isPublicHoliday: !!isPublicHoliday,
      holidayName: isPublicHoliday ? isPublicHoliday.name : null,
      todayRecord,
      reasons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch today status', error: error.message });
  }
};

// Submit or update daily response
const submitDailyBreakfast = async (req, res) => {
  try {
    const { response, reasonCode, reasonText } = req.body;
    const employeeId = req.user.employeeId;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    if (employee.breakfastParticipationType === 'PERMANENT_NOT_TAKING') {
      return res.status(400).json({
        success: false,
        message: 'Your account is set to PERMANENT_NOT_TAKING. You do not submit daily responses unless changed to NORMAL by Admin.'
      });
    }

    const todayDateObj = new Date();
    const todayInfo = getFormattedDateAndDay(todayDateObj);
    const settings = (await BreakfastSetting.findOne()) || { cutoffTime: '12:00' };
    const cutoffPassed = isAfterCutoff(settings.cutoffTime);

    // If cutoff passed, response applies to Next Business Date
    const targetDateObj = cutoffPassed ? getNextDayDate(todayDateObj) : todayDateObj;
    const targetInfo = getFormattedDateAndDay(targetDateObj);
    const targetDateStr = targetInfo.dateStr;

    if (!response || !['YES', 'NO', 'TAKING', 'NOT_TAKING'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Response must be YES or NO' });
    }

    const normalizedResponse = (response === 'YES' || response === 'TAKING') ? 'YES' : 'NO';
    const employeeResponse = normalizedResponse === 'YES' ? 'TAKING' : 'NOT_TAKING';

    let finalReasonCode = null;
    let finalReasonText = null;

    if (normalizedResponse === 'NO') {
      if (!reasonCode) {
        return res.status(400).json({ success: false, message: 'Please select a reason for not taking breakfast' });
      }

      finalReasonCode = reasonCode;

      if (reasonCode === 'OTHER') {
        if (!reasonText || reasonText.trim().length === 0) {
          return res.status(400).json({ success: false, message: 'Reason text is mandatory when "Other" is selected' });
        }
        finalReasonText = reasonText.trim();
      } else {
        const foundReason = await BreakfastReason.findOne({ code: reasonCode });
        finalReasonText = foundReason ? foundReason.label : reasonCode;
      }
    }

    let existingRecord = await BreakfastRecord.findOne({ employeeId, businessDate: targetDateStr });

    let actionName = 'BREAKFAST_RESPONSE_SUBMITTED';
    let beforeState = null;

    if (existingRecord) {
      actionName = 'BREAKFAST_RESPONSE_UPDATED';
      beforeState = existingRecord.toJSON();

      existingRecord.history.push({
        response: existingRecord.response,
        actualStatus: existingRecord.actualStatus,
        reasonCode: existingRecord.reasonCode,
        reasonText: existingRecord.reasonText,
        updatedAt: new Date(),
        updatedBy: employee.name
      });

      existingRecord.response = normalizedResponse;
      existingRecord.employeeResponse = employeeResponse;
      existingRecord.reasonCode = finalReasonCode;
      existingRecord.reasonText = finalReasonText;
      await existingRecord.save();
    } else {
      const recordId = `BRK-${targetDateStr.replace(/-/g, '')}-${employeeId}`;
      existingRecord = new BreakfastRecord({
        recordId,
        employeeId,
        businessDate: targetDateStr,
        response: normalizedResponse,
        employeeResponse,
        actualStatus: null,
        reasonCode: finalReasonCode,
        reasonText: finalReasonText,
        source: 'EMPLOYEE',
        submittedAt: new Date()
      });
      await existingRecord.save();
    }

    const afterState = existingRecord.toJSON();

    await logAudit(
      req,
      actionName,
      { recordId: existingRecord.recordId, targetEmployeeId: employeeId, targetEmployeeName: employee.name, details: `Response for ${targetInfo.displayString}: ${normalizedResponse}` },
      beforeState,
      afterState
    );

    res.json({
      success: true,
      message: `Breakfast response for ${targetInfo.displayString} saved successfully`,
      record: existingRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit response', error: error.message });
  }
};

// Multi-Day Absence Non-Participation Entry (From Date to To Date)
const submitMultiDayAbsence = async (req, res) => {
  try {
    const { fromDate, toDate, reasonCode, reasonText } = req.body;
    const employeeId = req.user.employeeId;

    if (!fromDate || !toDate || !reasonCode) {
      return res.status(400).json({ success: false, message: 'From Date, To Date, and Reason are required' });
    }

    if (fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'From Date must be before or equal to To Date' });
    }

    if (reasonCode === 'OTHER' && (!reasonText || !reasonText.trim())) {
      return res.status(400).json({ success: false, message: 'Mandatory reason text required when Other is selected' });
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    let finalReasonText = reasonText ? reasonText.trim() : reasonCode;
    if (reasonCode !== 'OTHER') {
      const r = await BreakfastReason.findOne({ code: reasonCode });
      if (r) finalReasonText = r.label;
    }

    const periodId = `PER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const period = new BreakfastNonParticipationPeriod({
      periodId,
      employeeId,
      fromDate,
      toDate,
      reasonCode,
      reasonText: finalReasonText,
      source: 'EMPLOYEE'
    });
    await period.save();

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const updatedDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().substring(0, 10);
      updatedDates.push(dateStr);

      const recordId = `BRK-${dateStr.replace(/-/g, '')}-${employeeId}`;

      await BreakfastRecord.findOneAndUpdate(
        { employeeId, businessDate: dateStr },
        {
          recordId,
          employeeId,
          businessDate: dateStr,
          response: 'NO',
          employeeResponse: 'NOT_TAKING',
          reasonCode,
          reasonText: finalReasonText,
          source: 'EMPLOYEE',
          submittedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    await logAudit(
      req,
      'MULTI_DAY_ABSENCE_SUBMITTED',
      { details: `Submitted multi-day absence for ${employee.name} (${fromDate} to ${toDate})` },
      null,
      { period, updatedDates }
    );

    res.json({
      success: true,
      message: `Multi-day non-breakfast period recorded from ${fromDate} to ${toDate}`,
      period,
      datesCount: updatedDates.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit multi-day absence', error: error.message });
  }
};

// Admin Mark / Override Actual Consumption Status (TAKEN / NOT_TAKEN / NO_RESPONSE)
const updateActualStatus = async (req, res) => {
  try {
    const { employeeId, businessDate, actualStatus } = req.body;

    if (!employeeId || !businessDate || !['TAKEN', 'NOT_TAKEN', 'NO_RESPONSE'].includes(actualStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, businessDate, and actualStatus (TAKEN/NOT_TAKEN/NO_RESPONSE) are required'
      });
    }

    const employee = await Employee.findOne({ employeeId: employeeId.trim().toUpperCase() });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let record = await BreakfastRecord.findOne({ employeeId: employee.employeeId, businessDate });
    const beforeState = record ? record.toJSON() : null;
    const previousActualStatus = record ? (record.actualStatus || 'NO_RESPONSE') : 'NO_RESPONSE';

    if (!record) {
      const recordId = `BRK-${businessDate.replace(/-/g, '')}-${employee.employeeId}`;
      record = new BreakfastRecord({
        recordId,
        employeeId: employee.employeeId,
        businessDate,
        response: 'NO',
        employeeResponse: 'NO_RESPONSE', // Preserves NO_RESPONSE as Employee Request
        actualStatus,
        actualStatusSource: 'ADMIN_OVERRIDE',
        source: 'ADMIN'
      });
    } else {
      record.history.push({
        response: record.response,
        actualStatus: record.actualStatus,
        actualStatusSource: record.actualStatusSource,
        reasonCode: record.reasonCode,
        reasonText: record.reasonText,
        updatedAt: new Date(),
        updatedBy: req.user.name
      });
      record.actualStatus = actualStatus;
      record.actualStatusSource = 'ADMIN_OVERRIDE';
    }

    await record.save();

    // Also update BreakfastDailyEntry snapshot if entry exists for businessDate
    const dailyEntry = await BreakfastDailyEntry.findOne({ businessDate });
    if (dailyEntry && dailyEntry.employeeSnapshot) {
      const item = dailyEntry.employeeSnapshot.find(
        e => e.employeeId.toUpperCase() === employee.employeeId.toUpperCase()
      );
      if (item) {
        item.actualStatus = actualStatus;
        item.actualStatusSource = 'ADMIN_OVERRIDE';
        await dailyEntry.save();
      }
    }

    const roleUsed = req.headers['x-role-used'] || (req.user.roles && req.user.roles[0]) || 'BREAKFAST_ADMIN';

    await logAudit(
      req,
      'ACTUAL_STATUS_OVERRIDDEN',
      {
        targetEmployeeId: employee.employeeId,
        targetEmployeeName: employee.name,
        performedBy: req.user.name,
        roleUsed,
        previousActualStatus,
        newActualStatus: actualStatus,
        timestamp: new Date().toISOString(),
        details: `Breakfast Admin (${req.user.name}) overridden actual status for ${employee.name} (${employee.employeeId}) on ${businessDate} from ${previousActualStatus} to ${actualStatus}`
      },
      beforeState,
      record.toJSON()
    );

    res.json({
      success: true,
      message: `Actual consumption status for ${employee.name} updated to ${actualStatus} (ADMIN_OVERRIDE)`,
      record
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update actual status', error: error.message });
  }
};

// Get personal submission history
const getOwnHistory = async (req, res) => {
  try {
    const records = await BreakfastRecord.find({ employeeId: req.user.employeeId })
      .sort({ businessDate: -1 })
      .limit(60);

    const periods = await BreakfastNonParticipationPeriod.find({ employeeId: req.user.employeeId })
      .sort({ fromDate: -1 });

    res.json({
      success: true,
      records,
      periods
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history', error: error.message });
  }
};

// Admin Operational Dashboard Summary
const getAdminSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDateStr = date || getKolkataDateString();

    const isPublicHoliday = await PublicHoliday.findOne({ date: targetDateStr, status: 'active' });

    const activeEmployees = await Employee.find({ status: 'active', isHardDeleted: false });
    const totalActive = activeEmployees.length;

    const normalEmployees = activeEmployees.filter(e => e.breakfastParticipationType === 'NORMAL');
    const permanentNotTakingEmployees = activeEmployees.filter(e => e.breakfastParticipationType === 'PERMANENT_NOT_TAKING');

    const todayRecords = await BreakfastRecord.find({ businessDate: targetDateStr });

    const confirmedYesCount = todayRecords.filter(r => r.response === 'YES' || r.employeeResponse === 'TAKING').length;
    const confirmedNoCount = todayRecords.filter(r => r.response === 'NO' || r.employeeResponse === 'NOT_TAKING').length;

    const actuallyTakenCount = todayRecords.filter(r => r.actualStatus === 'TAKEN').length;
    const actuallyNotTakenCount = todayRecords.filter(r => r.actualStatus === 'NOT_TAKEN').length;

    const respondedEmpIds = new Set(todayRecords.map(r => r.employeeId));
    const pendingCount = normalEmployees.filter(e => !respondedEmpIds.has(e.employeeId)).length;

    const settings = (await BreakfastSetting.findOne()) || { cutoffTime: '12:00' };

    res.json({
      success: true,
      businessDate: targetDateStr,
      isPublicHoliday: !!isPublicHoliday,
      holidayName: isPublicHoliday ? isPublicHoliday.name : null,
      cutoffTime: settings.cutoffTime,
      isCutoffPassed: isAfterCutoff(settings.cutoffTime),
      metrics: {
        totalActive,
        normalEmployeesCount: normalEmployees.length,
        permanentNotTakingCount: permanentNotTakingEmployees.length,
        takingBreakfastCount: confirmedYesCount,
        notTakingBreakfastCount: confirmedNoCount,
        pendingCount,
        expectedBreakfastCount: isPublicHoliday ? 0 : confirmedYesCount,
        actuallyTakenCount,
        actuallyNotTakenCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch summary', error: error.message });
  }
};

// Get Admin Detailed Daily Records List
const getAdminDailyRecords = async (req, res) => {
  try {
    const { date, department, search } = req.query;
    const targetDateStr = date || getKolkataDateString();

    const { getBusinessDayStatus } = require('../services/calendarService');
    const dayStatus = await getBusinessDayStatus(targetDateStr);

    let empQuery = { status: 'active', isHardDeleted: false };
    if (department && department !== 'ALL') empQuery.department = department;

    let employees = await Employee.find(empQuery);

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        (e.username && e.username.toLowerCase().includes(s)) ||
        e.name.toLowerCase().includes(s) ||
        e.employeeId.toLowerCase().includes(s) ||
        e.department.toLowerCase().includes(s)
      );
    }

    const records = await BreakfastRecord.find({ businessDate: targetDateStr });
    const recordMap = new Map();
    records.forEach(r => recordMap.set(r.employeeId.toUpperCase(), r));

    const allList = employees.map(emp => {
      const rec = recordMap.get(emp.employeeId.toUpperCase());
      const isPerm = emp.breakfastParticipationType === 'PERMANENT_NOT_TAKING';

      let empResponse = 'NO_RESPONSE';
      let actStatus = 'NO_RESPONSE';
      let actSource = rec ? (rec.actualStatusSource || 'EMPLOYEE_RESPONSE') : 'EMPLOYEE_RESPONSE';

      if (isPerm) {
        empResponse = 'NOT_TAKING';
        actStatus = 'NOT_TAKEN';
      } else if (rec) {
        if (rec.response === 'YES' || rec.response === 'TAKING' || rec.employeeResponse === 'TAKING') {
          empResponse = 'TAKING';
          actStatus = rec.actualStatus || 'TAKEN';
        } else if (rec.response === 'NO' || rec.response === 'NOT_TAKING' || rec.employeeResponse === 'NOT_TAKING') {
          empResponse = 'NOT_TAKING';
          actStatus = rec.actualStatus || 'NOT_TAKEN';
        } else {
          empResponse = 'NO_RESPONSE';
          actStatus = rec.actualStatus || 'NO_RESPONSE';
        }
      }

      return {
        employeeId: emp.employeeId,
        username: emp.username,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        participationType: emp.breakfastParticipationType,
        employeeResponse: empResponse,
        actualStatus: actStatus,
        actualStatusSource: actSource,
        reasonCode: rec ? rec.reasonCode : (isPerm ? 'PERMANENT_NOT_TAKING' : null),
        reasonText: rec ? rec.reasonText : (isPerm ? 'Permanent Non-Participant' : null),
        source: rec ? rec.source : 'EMPLOYEE'
      };
    });

    res.json({
      success: true,
      businessDate: targetDateStr,
      dayStatus,
      allList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch daily records', error: error.message });
  }
};

const BreakfastDailyEntry = require('../models/BreakfastDailyEntry');
const BreakfastAdditionalOrder = require('../models/BreakfastAdditionalOrder');
const { getDailyBreakfastEmployees, getAdditionalBreakfastEmployees } = require('../services/breakfastService');
const {
  processDailyEntryExpense,
  processAdditionalOrderExpense,
  processAdditionalOrderUpdate,
  reverseAdditionalOrderExpense,
  getMoneyBalanceMetrics
} = require('../services/breakfastMoneyService');

// Daily Entry: GET details, applicable employees, existing record & money fund status
const getDailyEntry = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getKolkataDateString();

    const empData = await getDailyBreakfastEmployees(targetDate);
    const existingEntry = await BreakfastDailyEntry.findOne({ businessDate: targetDate });
    const fundMetrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      businessDate: targetDate,
      existingEntry: existingEntry || null,
      applicableEmployees: empData.applicableEmployees,
      permExcludedEmployees: empData.permExcludedEmployees,
      leaveExcludedEmployees: empData.leaveExcludedEmployees,
      summary: empData.summary,
      fundMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch daily entry data', error: error.message });
  }
};

// Daily Entry: Save or Update primary daily breakfast entry
const saveDailyEntry = async (req, res) => {
  try {
    const { businessDate, breakfastItems = [], commonItems = [] } = req.body;
    if (!businessDate) {
      return res.status(400).json({ success: false, message: 'businessDate is required' });
    }

    const empData = await getDailyBreakfastEmployees(businessDate);
    const takingCount = empData.summary.takingCount;

    // Process optional Breakfast Items (filter out empty names)
    let itemsTotal = 0;
    const processedBreakfastItems = breakfastItems
      .filter(item => item && item.name && item.name.trim().length > 0)
      .map(item => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity !== undefined && item.quantity !== '' ? Number(item.quantity) : takingCount;
        const total = price * qty;
        itemsTotal += total;
        return {
          name: item.name.trim(),
          unitPrice: price,
          quantity: qty,
          total
        };
      });

    // Process optional Common Items (filter out empty names)
    let commonTotal = 0;
    const processedCommonItems = commonItems
      .filter(item => item && item.name && item.name.trim().length > 0)
      .map(item => {
        const price = Number(item.unitPrice) || 0;
        const qty = Number(item.quantity) || 1;
        const total = price * qty;
        commonTotal += total;
        return {
          name: item.name.trim(),
          unitPrice: price,
          quantity: qty,
          total
        };
      });

    // Authoritative backend cost calculation (Breakfast Item Total + Common Item Total)
    const totalCost = itemsTotal + commonTotal;

    // Financial money ledger processing before committing
    try {
      await processDailyEntryExpense({
        businessDate,
        newTotalCost: totalCost,
        createdBy: req.user.name
      });
    } catch (moneyErr) {
      if (moneyErr.isInsufficient) {
        return res.status(400).json({
          success: false,
          isInsufficient: true,
          message: moneyErr.message,
          available: moneyErr.currentBalance,
          required: moneyErr.required,
          shortfall: moneyErr.shortfall
        });
      }
      throw moneyErr;
    }

    let existingEntry = await BreakfastDailyEntry.findOne({ businessDate });
    const action = existingEntry ? 'DAILY_ENTRY_UPDATED' : 'DAILY_ENTRY_CREATED';
    const beforeState = existingEntry ? existingEntry.toJSON() : null;

    if (existingEntry) {
      existingEntry.employeeSnapshot = empData.applicableEmployees;
      existingEntry.summary = empData.summary;
      existingEntry.breakfastItems = processedBreakfastItems;
      existingEntry.commonItems = processedCommonItems;
      existingEntry.totalCost = totalCost;
      existingEntry.updatedBy = req.user.name;
      await existingEntry.save();
    } else {
      existingEntry = new BreakfastDailyEntry({
        businessDate,
        employeeSnapshot: empData.applicableEmployees,
        summary: empData.summary,
        breakfastItems: processedBreakfastItems,
        commonItems: processedCommonItems,
        totalCost,
        createdBy: req.user.name
      });
      await existingEntry.save();
    }

    const roleUsed = req.headers['x-role-used'] || (req.user.roles && req.user.roles[0]) || 'BREAKFAST_ADMIN';

    await logAudit(
      req,
      action,
      {
        businessDate,
        totalCost,
        breakfastItemsCount: processedBreakfastItems.length,
        commonItemsCount: processedCommonItems.length,
        performedBy: req.user.name,
        roleUsed,
        details: `Daily entry for ${businessDate} saved with total cost ₹${totalCost}`
      },
      beforeState,
      existingEntry.toJSON()
    );

    const updatedMetrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      message: `Daily entry for ${businessDate} saved successfully`,
      entry: existingEntry,
      fundMetrics: updatedMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save daily entry', error: error.message });
  }
};

// Additional Orders: GET applicable employees & existing additional orders for date
const getAdditionalOrders = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getKolkataDateString();

    const empData = await getAdditionalBreakfastEmployees(targetDate);
    const orders = await BreakfastAdditionalOrder.find({ businessDate: targetDate }).sort({ createdAt: -1 });
    const fundMetrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      businessDate: targetDate,
      applicableEmployees: empData.applicableEmployees,
      leaveExcludedEmployees: empData.leaveExcludedEmployees,
      applicableCount: empData.applicableCount,
      orders,
      fundMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch additional orders', error: error.message });
  }
};

// Additional Orders: Create new additional order
const saveAdditionalOrder = async (req, res) => {
  try {
    const { businessDate, orderTitle, orderTime, breakfastItems = [], commonItems = [] } = req.body;
    if (!businessDate) {
      return res.status(400).json({ success: false, message: 'businessDate is required' });
    }

    const empData = await getAdditionalBreakfastEmployees(businessDate);
    const applicableCount = empData.applicableCount;

    // Filter non-empty items & compute authoritative totals
    let itemsTotal = 0;
    const processedBreakfastItems = breakfastItems
      .filter(item => item && item.name && item.name.trim().length > 0)
      .map(item => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity !== undefined && item.quantity !== '' ? Number(item.quantity) : applicableCount;
        const total = price * qty;
        itemsTotal += total;
        return {
          name: item.name.trim(),
          unitPrice: price,
          quantity: qty,
          total
        };
      });

    let commonTotal = 0;
    const processedCommonItems = commonItems
      .filter(item => item && item.name && item.name.trim().length > 0)
      .map(item => {
        const price = Number(item.unitPrice) || 0;
        const qty = Number(item.quantity) || 1;
        const total = price * qty;
        commonTotal += total;
        return {
          name: item.name.trim(),
          unitPrice: price,
          quantity: qty,
          total
        };
      });

    const totalCost = itemsTotal + commonTotal;
    const orderId = `ADD-ORD-${businessDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const roleUsed = req.headers['x-role-used'] || (req.user.roles && req.user.roles[0]) || 'BREAKFAST_ADMIN';

    // Process money ledger expense for additional order before saving (checks available balance)
    try {
      await processAdditionalOrderExpense({
        orderId,
        businessDate,
        orderTitle,
        totalCost,
        createdBy: req.user.name
      });
    } catch (moneyErr) {
      if (moneyErr.isInsufficient) {
        return res.status(400).json({
          success: false,
          isInsufficient: true,
          message: moneyErr.message,
          available: moneyErr.currentBalance,
          required: moneyErr.required,
          shortfall: moneyErr.shortfall
        });
      }
      throw moneyErr;
    }

    const order = new BreakfastAdditionalOrder({
      orderId,
      businessDate,
      orderTitle: orderTitle || 'Additional Breakfast / Snack Order',
      orderTime: orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      applicableEmployeeSnapshot: empData.applicableEmployees,
      applicableEmployeeCount: applicableCount,
      breakfastItems: processedBreakfastItems,
      commonItems: processedCommonItems,
      totalCost,
      createdBy: req.user.name
    });

    await order.save();

    await logAudit(
      req,
      'ADDITIONAL_ORDER_CREATED',
      {
        orderId,
        businessDate,
        orderTitle: order.orderTitle,
        totalCost,
        performedBy: req.user.name,
        roleUsed,
        details: `Created additional order (${order.orderTitle}) on ${businessDate}. Total cost: ₹${totalCost}`
      },
      null,
      order.toJSON()
    );

    const updatedMetrics = await getMoneyBalanceMetrics();

    res.status(201).json({
      success: true,
      message: `Additional order saved successfully`,
      order,
      fundMetrics: updatedMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save additional order', error: error.message });
  }
};

// Additional Orders: Update an existing additional order
const updateAdditionalOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderTitle, orderTime, breakfastItems = [], commonItems = [] } = req.body;

    const order = await BreakfastAdditionalOrder.findOne({ orderId: id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Additional order not found' });
    }

    const beforeState = order.toJSON();
    const empData = await getAdditionalBreakfastEmployees(order.businessDate);
    const applicableCount = empData.applicableCount;

    let itemsTotal = 0;
    const processedBreakfastItems = breakfastItems
      .filter(item => item && item.name && item.name.trim().length > 0)
      .map(item => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity !== undefined && item.quantity !== '' ? Number(item.quantity) : applicableCount;
        const total = price * qty;
        itemsTotal += total;
        return {
          name: item.name.trim(),
          unitPrice: price,
          quantity: qty,
          total
        };
      });

    let commonTotal = 0;
    const processedCommonItems = commonItems
      .filter(item => item && item.name && item.name.trim().length > 0)
      .map(item => {
        const price = Number(item.unitPrice) || 0;
        const qty = Number(item.quantity) || 1;
        const total = price * qty;
        commonTotal += total;
        return {
          name: item.name.trim(),
          unitPrice: price,
          quantity: qty,
          total
        };
      });

    const newTotalCost = itemsTotal + commonTotal;
    const previousCost = order.totalCost;
    const roleUsed = req.headers['x-role-used'] || (req.user.roles && req.user.roles[0]) || 'BREAKFAST_ADMIN';

    // Process financial difference adjustment in money ledger
    let moneyResult = null;
    try {
      moneyResult = await processAdditionalOrderUpdate({
        orderId: order.orderId,
        businessDate: order.businessDate,
        orderTitle: orderTitle || order.orderTitle,
        newTotalCost,
        createdBy: req.user.name
      });
    } catch (moneyErr) {
      if (moneyErr.isInsufficient) {
        return res.status(400).json({
          success: false,
          isInsufficient: true,
          message: moneyErr.message,
          available: moneyErr.currentBalance,
          required: moneyErr.required,
          shortfall: moneyErr.shortfall
        });
      }
      throw moneyErr;
    }

    order.orderTitle = orderTitle || order.orderTitle;
    order.orderTime = orderTime || order.orderTime;
    order.breakfastItems = processedBreakfastItems;
    order.commonItems = processedCommonItems;
    order.totalCost = newTotalCost;
    order.updatedBy = req.user.name;

    await order.save();

    await logAudit(
      req,
      'ADDITIONAL_ORDER_UPDATED',
      {
        orderId: order.orderId,
        businessDate: order.businessDate,
        previousCost,
        newTotalCost,
        financialImpact: moneyResult ? moneyResult.financialImpact : 0,
        performedBy: req.user.name,
        roleUsed,
        details: `Updated additional order (${order.orderTitle}) on ${order.businessDate}. Cost changed from ₹${previousCost} to ₹${newTotalCost}`
      },
      beforeState,
      order.toJSON()
    );

    if (moneyResult && moneyResult.adjusted) {
      await logAudit(
        req,
        'ADDITIONAL_ORDER_FINANCIAL_ADJUSTMENT',
        {
          orderId: order.orderId,
          businessDate: order.businessDate,
          previousCost,
          newTotalCost,
          financialImpact: moneyResult.financialImpact,
          performedBy: req.user.name,
          roleUsed,
          details: `Recorded financial adjustment of ₹${moneyResult.financialImpact} for order ${order.orderId}`
        },
        beforeState,
        order.toJSON()
      );
    }

    const updatedMetrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      message: 'Additional order updated successfully',
      order,
      fundMetrics: updatedMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update additional order', error: error.message });
  }
};

// Additional Orders: Delete an additional order with money reversal refund
const deleteAdditionalOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await BreakfastAdditionalOrder.findOne({ orderId: id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Additional order not found' });
    }

    const roleUsed = req.headers['x-role-used'] || (req.user.roles && req.user.roles[0]) || 'BREAKFAST_ADMIN';

    // Reverse financial ledger expense for deleted order
    const reversalResult = await reverseAdditionalOrderExpense({
      orderId: order.orderId,
      businessDate: order.businessDate,
      orderTitle: order.orderTitle,
      createdBy: req.user.name
    });

    await BreakfastAdditionalOrder.deleteOne({ orderId: id });

    await logAudit(
      req,
      'ADDITIONAL_ORDER_DELETED',
      {
        orderId: id,
        businessDate: order.businessDate,
        totalCost: order.totalCost,
        performedBy: req.user.name,
        roleUsed,
        financialReversalAmount: reversalResult ? reversalResult.newBalance : 0,
        details: `Deleted additional order (${order.orderTitle}) on ${order.businessDate}. Reversed ₹${order.totalCost} into ledger.`
      },
      order.toJSON(),
      null
    );

    const updatedMetrics = await getMoneyBalanceMetrics();

    res.json({
      success: true,
      message: 'Additional order deleted successfully and expense reversed in money ledger',
      fundMetrics: updatedMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete additional order', error: error.message });
  }
};

// All Orders: Unified list combining Daily Breakfast Entries + Additional Orders
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      type = 'ALL',
      search,
      createdBy,
      minAmount,
      maxAmount,
      sortBy = 'businessDate',
      sortOrder = 'desc'
    } = req.query;

    let dailyQuery = {};
    let additionalQuery = {};

    if (startDate && endDate) {
      dailyQuery.businessDate = { $gte: startDate, $lte: endDate };
      additionalQuery.businessDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      dailyQuery.businessDate = { $gte: startDate };
      additionalQuery.businessDate = { $gte: startDate };
    } else if (endDate) {
      dailyQuery.businessDate = { $lte: endDate };
      additionalQuery.businessDate = { $lte: endDate };
    }

    let dailyEntries = [];
    if (type === 'ALL' || type === 'DAILY_ENTRY' || type === 'DAILY_BREAKFAST') {
      dailyEntries = await BreakfastDailyEntry.find(dailyQuery).lean();
    }

    let additionalOrders = [];
    if (type === 'ALL' || type === 'ADDITIONAL_ORDER') {
      additionalOrders = await BreakfastAdditionalOrder.find(additionalQuery).lean();
    }

    const mappedDaily = dailyEntries.map(entry => {
      const bItems = entry.breakfastItems || [];
      const cItems = entry.commonItems || [];

      return {
        _id: entry._id,
        orderId: `DE-${entry.businessDate.replace(/-/g, '')}`,
        rawId: entry._id.toString(),
        businessDate: entry.businessDate,
        orderType: 'DAILY_ENTRY',
        orderTypeLabel: 'DAILY BREAKFAST',
        orderTitle: `Daily Breakfast (${entry.businessDate})`,
        orderTime: '12:00',
        applicableEmployeeCount: entry.summary?.applicableCount || (entry.employeeSnapshot ? entry.employeeSnapshot.length : 0),
        takingEmployeeCount: entry.summary?.takingCount || 0,
        notTakingEmployeeCount: entry.summary?.notTakingCount || 0,
        noResponseEmployeeCount: entry.summary?.noResponseCount || 0,
        employeeSnapshot: entry.employeeSnapshot || [],
        breakfastItems: bItems,
        commonItems: cItems,
        totalCost: entry.totalCost || 0,
        createdBy: entry.createdBy || 'Breakfast Admin',
        updatedBy: entry.updatedBy || null,
        createdAt: entry.createdAt || entry.businessDate,
        updatedAt: entry.updatedAt || entry.createdAt,
        status: 'COMPLETED',
        financialReference: {
          referenceType: 'DAILY_ENTRY',
          referenceId: entry.businessDate
        }
      };
    });

    const mappedAdditional = additionalOrders.map(order => {
      const bItems = order.breakfastItems || [];
      const cItems = order.commonItems || [];

      return {
        _id: order._id,
        orderId: order.orderId,
        rawId: order._id.toString(),
        businessDate: order.businessDate,
        orderType: 'ADDITIONAL_ORDER',
        orderTypeLabel: 'ADDITIONAL ORDER',
        orderTitle: order.orderTitle || 'Additional Breakfast Order',
        orderTime: order.orderTime || '15:30',
        applicableEmployeeCount: order.applicableEmployeeCount || (order.applicableEmployeeSnapshot ? order.applicableEmployeeSnapshot.length : 0),
        takingEmployeeCount: order.applicableEmployeeCount || 0,
        employeeSnapshot: order.applicableEmployeeSnapshot || [],
        breakfastItems: bItems,
        commonItems: cItems,
        totalCost: order.totalCost || 0,
        createdBy: order.createdBy || 'Breakfast Admin',
        updatedBy: order.updatedBy || null,
        createdAt: order.createdAt || order.businessDate,
        updatedAt: order.updatedAt || order.createdAt,
        status: 'COMPLETED',
        financialReference: {
          referenceType: 'ADDITIONAL_ORDER',
          referenceId: order.orderId
        }
      };
    });

    let combined = [...mappedDaily, ...mappedAdditional];

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      combined = combined.filter(o =>
        o.orderId.toLowerCase().includes(s) ||
        o.orderTitle.toLowerCase().includes(s) ||
        o.businessDate.toLowerCase().includes(s) ||
        o.createdBy.toLowerCase().includes(s) ||
        o.breakfastItems.some(item => item.name && item.name.toLowerCase().includes(s)) ||
        o.commonItems.some(item => item.name && item.name.toLowerCase().includes(s))
      );
    }

    if (createdBy && createdBy.trim() && createdBy !== 'ALL') {
      const c = createdBy.trim().toLowerCase();
      combined = combined.filter(o => o.createdBy.toLowerCase().includes(c));
    }

    if (minAmount !== undefined && minAmount !== '') {
      const min = Number(minAmount);
      combined = combined.filter(o => o.totalCost >= min);
    }
    if (maxAmount !== undefined && maxAmount !== '') {
      const max = Number(maxAmount);
      combined = combined.filter(o => o.totalCost <= max);
    }

    combined.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'totalCost') {
        comparison = a.totalCost - b.totalCost;
      } else if (sortBy === 'orderId') {
        comparison = a.orderId.localeCompare(b.orderId);
      } else {
        if (a.businessDate === b.businessDate) {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          comparison = a.businessDate.localeCompare(b.businessDate);
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const totalCount = combined.length;
    const totalAmount = combined.reduce((acc, curr) => acc + curr.totalCost, 0);
    const dailyCount = combined.filter(o => o.orderType === 'DAILY_ENTRY').length;
    const additionalCount = combined.filter(o => o.orderType === 'ADDITIONAL_ORDER').length;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = limit === 'ALL' ? totalCount : (parseInt(limit, 10) || 20);
    const totalPages = limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedOrders = combined.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      summary: {
        totalOrders: totalCount,
        totalAmount,
        dailyCount,
        additionalCount
      },
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages
      },
      orders: paginatedOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch all orders', error: error.message });
  }
};

module.exports = {
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
};

