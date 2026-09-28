/**
 * Utility functions for business date, timezone, day-of-week, and 6-day work week calculations in Asia/Kolkata
 */

// Format Date object to YYYY-MM-DD in Asia/Kolkata timezone
function getKolkataDateString(date = new Date()) {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA produces YYYY-MM-DD
  return formatter.format(date);
}

// Get formatted date and day of week string in Asia/Kolkata
function getFormattedDateAndDay(date = new Date()) {
  const dateStr = getKolkataDateString(date);

  const dateOptions = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' };
  const dayOptions = { timeZone: 'Asia/Kolkata', weekday: 'long' };

  const formattedDate = new Intl.DateTimeFormat('en-GB', dateOptions).format(date);
  const dayOfWeek = new Intl.DateTimeFormat('en-GB', dayOptions).format(date);

  return {
    dateStr,
    formattedDate,
    dayOfWeek,
    displayString: `${dayOfWeek}, ${formattedDate}`
  };
}

// Get current Kolkata hour and minute
function getKolkataTime(date = new Date()) {
  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
  let hour = '00';
  let minute = '00';
  parts.forEach(p => {
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
  });
  return { hour: parseInt(hour, 10), minute: parseInt(minute, 10), timeString: `${hour}:${minute}` };
}

// Check if current time in Asia/Kolkata has passed cutoff time (e.g., "12:00")
function isAfterCutoff(cutoffTime = '12:00', date = new Date()) {
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
  const currentTime = getKolkataTime(date);

  if (currentTime.hour > cutoffHour) return true;
  if (currentTime.hour === cutoffHour && currentTime.minute >= cutoffMinute) return true;
  return false;
}

// Get Next Day Date Object
function getNextDayDate(date = new Date()) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

// Get Working Days in Month based on 6-Day Work Week (Monday-Saturday, Sunday off)
function getWorkingDays6DaysPerWeek(yearMonthStr) {
  const [year, month] = yearMonthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() !== 0) { // 0 is Sunday
      workingDays++;
    }
  }
  return workingDays;
}

module.exports = {
  getKolkataDateString,
  getFormattedDateAndDay,
  getKolkataTime,
  isAfterCutoff,
  getNextDayDate,
  getWorkingDays6DaysPerWeek
};
