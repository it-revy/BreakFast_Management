const Employee = require('../models/Employee');
const BreakfastRecord = require('../models/BreakfastRecord');
const BreakfastNonParticipationPeriod = require('../models/BreakfastNonParticipationPeriod');

/**
 * Calculates applicable employees for Daily Entry.
 * Rule: Excludes PERMANENT_NOT_TAKING and Leave/Non-participation period employees.
 */
const getDailyBreakfastEmployees = async (businessDate) => {
  const allActive = await Employee.find({
    status: { $in: ['active', 'ACTIVE'] },
    isHardDeleted: false
  }).sort({ employeeId: 1 });
  
  // Find leave/non-participation periods active on businessDate
  const activeLeaves = await BreakfastNonParticipationPeriod.find({
    fromDate: { $lte: businessDate },
    toDate: { $gte: businessDate }
  });
  const leaveEmpIds = new Set(activeLeaves.map(l => l.employeeId.toUpperCase()));

  const permExcluded = [];
  const leaveExcluded = [];
  const applicable = [];

  for (const emp of allActive) {
    const empIdUpper = emp.employeeId.toUpperCase();

    if (emp.breakfastParticipationType === 'PERMANENT_NOT_TAKING') {
      permExcluded.push(emp);
    } else if (leaveEmpIds.has(empIdUpper)) {
      leaveExcluded.push(emp);
    } else {
      applicable.push(emp);
    }
  }

  // Fetch daily records for responses
  const dailyRecords = await BreakfastRecord.find({ businessDate });
  const recordMap = new Map(dailyRecords.map(r => [r.employeeId.toUpperCase(), r]));

  let takingCount = 0;
  let notTakingCount = 0;
  let noResponseCount = 0;

  const employeeStatuses = applicable.map(emp => {
    const record = recordMap.get(emp.employeeId.toUpperCase());
    let response = 'NO_RESPONSE';
    let actualStatus = 'NO_RESPONSE';
    let actualStatusSource = record ? (record.actualStatusSource || 'EMPLOYEE_RESPONSE') : 'EMPLOYEE_RESPONSE';
    let reasonCode = record ? record.reasonCode : null;
    let reasonText = record ? record.reasonText : null;

    if (record) {
      if (record.response === 'YES' || record.response === 'TAKING' || record.employeeResponse === 'TAKING') {
        response = 'TAKING';
        actualStatus = record.actualStatus || 'TAKEN';
        takingCount++;
      } else if (record.response === 'NO' || record.response === 'NOT_TAKING' || record.employeeResponse === 'NOT_TAKING') {
        response = 'NOT_TAKING';
        actualStatus = record.actualStatus || 'NOT_TAKEN';
        notTakingCount++;
      } else {
        response = 'NO_RESPONSE';
        actualStatus = record.actualStatus || 'NO_RESPONSE';
        noResponseCount++;
      }
    } else {
      response = 'NO_RESPONSE';
      actualStatus = 'NO_RESPONSE';
      noResponseCount++;
    }

    return {
      employeeId: emp.employeeId,
      employeeName: emp.name,
      department: emp.department,
      designation: emp.designation,
      response,
      actualStatus,
      actualStatusSource,
      reasonCode,
      reasonText
    };
  });

  return {
    applicableEmployees: employeeStatuses,
    permExcludedEmployees: permExcluded.map(e => ({ employeeId: e.employeeId, name: e.name, department: e.department })),
    leaveExcludedEmployees: leaveExcluded.map(e => ({ employeeId: e.employeeId, name: e.name, department: e.department })),
    summary: {
      totalActive: allActive.length,
      permanentNotTaking: permExcluded.length,
      onLeave: leaveExcluded.length,
      applicableCount: applicable.length,
      takingCount,
      notTakingCount,
      noResponseCount
    }
  };
};

/**
 * Calculates applicable employees for Additional BF Orders.
 * Rule: INCLUDES PERMANENT_NOT_TAKING employees, EXCLUDES Leave/Non-participation period employees.
 */
const getAdditionalBreakfastEmployees = async (businessDate) => {
  const allActive = await Employee.find({
    status: { $in: ['active', 'ACTIVE'] },
    isHardDeleted: false
  }).sort({ employeeId: 1 });

  const activeLeaves = await BreakfastNonParticipationPeriod.find({
    fromDate: { $lte: businessDate },
    toDate: { $gte: businessDate }
  });
  const leaveEmpIds = new Set(activeLeaves.map(l => l.employeeId.toUpperCase()));

  const applicable = [];
  const leaveExcluded = [];

  for (const emp of allActive) {
    const empIdUpper = emp.employeeId.toUpperCase();
    if (leaveEmpIds.has(empIdUpper)) {
      leaveExcluded.push(emp);
    } else {
      applicable.push(emp);
    }
  }

  return {
    applicableEmployees: applicable.map(e => ({ employeeId: e.employeeId, employeeName: e.name, name: e.name, department: e.department })),
    leaveExcludedEmployees: leaveExcluded.map(e => ({ employeeId: e.employeeId, employeeName: e.name, name: e.name, department: e.department })),
    applicableCount: applicable.length
  };
};

module.exports = {
  getDailyBreakfastEmployees,
  getAdditionalBreakfastEmployees
};
