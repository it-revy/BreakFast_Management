const PublicHoliday = require('../models/PublicHoliday');
const BreakfastNonParticipationPeriod = require('../models/BreakfastNonParticipationPeriod');
const Employee = require('../models/Employee');

/**
 * Centralized Calendar & Business Date Service
 * Ensures ONE authoritative service for determining business day status across
 * Dashboard, Reports, Daily Entry, and Today's Breakfast.
 */

// 1. Get base business day status for any YYYY-MM-DD date
const getBusinessDayStatus = async (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));

  const dayOfWeekIndex = dateObj.getUTCDay(); // 0 = Sunday
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[dayOfWeekIndex];

  const isSunday = dayOfWeekIndex === 0;

  const holidayDoc = await PublicHoliday.findOne({ date: dateStr, status: 'active' });
  const isPublicHoliday = !!holidayDoc;
  const publicHolidayName = holidayDoc ? holidayDoc.name : null;

  const isWorkingDay = !isSunday && !isPublicHoliday;

  return {
    date: dateStr,
    dayOfWeek,
    isSunday,
    isPublicHoliday,
    publicHolidayName,
    isWorkingDay
  };
};

// 2. Get month-wide working days calendar summary (excluding Sundays and Public Holidays without double-counting)
const getMonthCalendarSummary = async (yearMonthStr) => {
  const [year, month] = yearMonthStr.split('-').map(Number);
  const totalCalendarDays = new Date(year, month, 0).getDate();

  const startDateStr = `${yearMonthStr}-01`;
  const endDateStr = `${yearMonthStr}-${String(totalCalendarDays).padStart(2, '0')}`;

  const activeHolidays = await PublicHoliday.find({
    date: { $gte: startDateStr, $lte: endDateStr },
    status: 'active'
  });

  const holidayMap = new Map();
  activeHolidays.forEach(h => holidayMap.set(h.date, h.name));

  let sundaysCount = 0;
  let publicHolidaysCount = 0; // Non-Sunday public holidays
  const workingDates = [];
  const nonWorkingDates = [];

  for (let day = 1; day <= totalCalendarDays; day++) {
    const dStr = `${yearMonthStr}-${String(day).padStart(2, '0')}`;
    const dObj = new Date(Date.UTC(year, month - 1, day));
    const isSun = dObj.getUTCDay() === 0;
    const isHoliday = holidayMap.has(dStr);

    if (isSun) {
      sundaysCount++;
      nonWorkingDates.push({ date: dStr, reason: 'Sunday' });
    } else if (isHoliday) {
      publicHolidaysCount++;
      nonWorkingDates.push({ date: dStr, reason: `Public Holiday: ${holidayMap.get(dStr)}` });
    } else {
      workingDates.push(dStr);
    }
  }

  const workingDaysCount = totalCalendarDays - (sundaysCount + publicHolidaysCount);

  return {
    yearMonth: yearMonthStr,
    totalCalendarDays,
    sundaysCount,
    publicHolidaysCount,
    workingDaysCount,
    workingDates,
    nonWorkingDates
  };
};

// 3. Get employee-specific business day status for a specific date
const getEmployeeBusinessDayStatus = async (employeeId, dateStr) => {
  const baseStatus = await getBusinessDayStatus(dateStr);

  const employee = await Employee.findOne({ employeeId, isHardDeleted: false });
  if (!employee) {
    return { ...baseStatus, isEmployeeLeave: false, isPermanentNotTaking: false, isApplicableForBreakfast: false };
  }

  const isPermanentNotTaking = employee.breakfastParticipationType === 'PERMANENT_NOT_TAKING';

  const leavePeriod = await BreakfastNonParticipationPeriod.findOne({
    employeeId,
    fromDate: { $lte: dateStr },
    toDate: { $gte: dateStr }
  });

  const isEmployeeLeave = !!leavePeriod;
  const isApplicableForBreakfast = baseStatus.isWorkingDay && !isEmployeeLeave && !isPermanentNotTaking;

  return {
    ...baseStatus,
    isEmployeeLeave,
    leaveReason: leavePeriod ? leavePeriod.reasonText : null,
    isPermanentNotTaking,
    isApplicableForBreakfast
  };
};

module.exports = {
  getBusinessDayStatus,
  getMonthCalendarSummary,
  getEmployeeBusinessDayStatus
};
