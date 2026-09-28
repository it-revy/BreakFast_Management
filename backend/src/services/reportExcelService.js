const ExcelJS = require('exceljs');

/**
 * Generate multi-sheet Excel workbook for Breakfast & Money Reporting Module
 *
 * Sheet 1: Monthly Summary
 * Sheet 2: Employee Monthly Report
 * Sheet 3: Order Summary
 * Sheet 4: Money Transactions
 */
const generateReportExcelWorkbook = async (data) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Breakfast Management System';
  workbook.created = new Date();

  // Styling Tokens
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
  const headerFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const titleFont = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } }; // Deep Navy Blue
  const subTitleFont = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
  const totalsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  const totalsFont = { name: 'Arial', size: 11, bold: true };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };
  const doubleBottomBorder = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } }
  };

  // =========================================================================
  // SHEET 1: Monthly Summary
  // =========================================================================
  const sheet1 = workbook.addWorksheet('Monthly Summary');
  sheet1.views = [{ state: 'frozen', ySplit: 4 }];

  sheet1.mergeCells('A1:E1');
  sheet1.getCell('A1').value = 'MONTHLY BREAKFAST & FINANCIAL SUMMARY';
  sheet1.getCell('A1').font = titleFont;

  sheet1.mergeCells('A2:E2');
  sheet1.getCell('A2').value = `Year: ${data.selectedYear === 'all' ? 'All Years' : data.selectedYear} | Department: ${data.selectedDepartment || 'ALL'}`;
  sheet1.getCell('A2').font = subTitleFont;

  sheet1.addRow([]); // Blank row 3

  const s1Headers = ['Month', 'Opening Balance', 'Money Received', 'Total Spent', 'Closing Balance'];
  const s1HeaderRow = sheet1.addRow(s1Headers);
  s1HeaderRow.height = 24;
  s1HeaderRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  (data.monthlySummary || []).forEach(row => {
    const r = sheet1.addRow([
      row.monthName,
      row.openingBalance,
      row.moneyReceived,
      row.totalSpent,
      row.closingBalance
    ]);
    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    [2, 3, 4, 5].forEach(colIdx => {
      const cell = r.getCell(colIdx);
      cell.numFmt = '"₹"#,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    r.eachCell(c => { c.border = thinBorder; });
  });

  if (data.yearlyTotal) {
    const totRow = sheet1.addRow([
      'TOTAL / PERIOD SUMMARY',
      '',
      data.yearlyTotal.totalMoneyReceived,
      data.yearlyTotal.totalSpent,
      data.yearlyTotal.closingBalance
    ]);
    totRow.height = 22;
    totRow.eachCell(cell => {
      cell.fill = totalsFill;
      cell.font = totalsFont;
      cell.border = doubleBottomBorder;
    });
    totRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    [3, 4, 5].forEach(colIdx => {
      const cell = totRow.getCell(colIdx);
      cell.numFmt = '"₹"#,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
  }

  autoFitColumns(sheet1);

  // =========================================================================
  // SHEET 2: Employee Monthly Report
  // =========================================================================
  const sheet2 = workbook.addWorksheet('Employee Monthly Report');
  sheet2.views = [{ state: 'frozen', ySplit: 4 }];

  sheet2.mergeCells('A1:L1');
  sheet2.getCell('A1').value = 'EMPLOYEE MONTHLY BREAKFAST REPORT';
  sheet2.getCell('A1').font = titleFont;

  sheet2.mergeCells('A2:L2');
  sheet2.getCell('A2').value = `Year: ${data.selectedYear === 'all' ? 'All Years' : data.selectedYear} | Month: ${data.selectedMonth || 'ALL'} | Department: ${data.selectedDepartment || 'ALL'}`;
  sheet2.getCell('A2').font = subTitleFont;

  sheet2.addRow([]);

  const s2Headers = [
    'Employee ID',
    'Username',
    'Name',
    'Department',
    'Designation',
    'Participation Type',
    'Permanent Non-Taker',
    'Total Working Days',
    'Breakfast Taken',
    'Not Taken',
    'No Response',
    'Reasons Breakdown'
  ];
  const s2HeaderRow = sheet2.addRow(s2Headers);
  s2HeaderRow.height = 24;
  s2HeaderRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let sumTaken = 0;
  let sumNotTaken = 0;
  let sumNoResponse = 0;

  (data.employeeReport || []).forEach(emp => {
    sumTaken += emp.takenCount || 0;
    sumNotTaken += emp.notTakenCount || 0;
    sumNoResponse += emp.noResponseCount || 0;

    const reasonStr = Object.entries(emp.reasonBreakdown || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');

    const r = sheet2.addRow([
      emp.employeeId,
      emp.username || '',
      emp.name,
      emp.department,
      emp.designation,
      emp.participationType,
      emp.isPermanentNotTaking ? 'YES' : 'NO',
      emp.totalDays,
      emp.takenCount,
      emp.notTakenCount,
      emp.noResponseCount,
      reasonStr
    ]);
    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    [3, 4, 5, 6, 7, 12].forEach(colIdx => {
      r.getCell(colIdx).alignment = { vertical: 'middle', horizontal: 'left' };
    });
    [8, 9, 10, 11].forEach(colIdx => {
      r.getCell(colIdx).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(colIdx).numFmt = '#,##0';
    });
    r.eachCell(c => { c.border = thinBorder; });
  });

  const totS2Row = sheet2.addRow([
    `TOTAL EMPLOYEES: ${(data.employeeReport || []).length}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    sumTaken,
    sumNotTaken,
    sumNoResponse,
    ''
  ]);
  totS2Row.height = 22;
  totS2Row.eachCell(cell => {
    cell.fill = totalsFill;
    cell.font = totalsFont;
    cell.border = doubleBottomBorder;
  });
  totS2Row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  [9, 10, 11].forEach(colIdx => {
    const cell = totS2Row.getCell(colIdx);
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  autoFitColumns(sheet2);

  // =========================================================================
  // SHEET 3: Order Summary
  // =========================================================================
  const sheet3 = workbook.addWorksheet('Order Summary');
  sheet3.views = [{ state: 'frozen', ySplit: 4 }];

  sheet3.mergeCells('A1:K1');
  sheet3.getCell('A1').value = 'BREAKFAST ORDER SUMMARY';
  sheet3.getCell('A1').font = titleFont;

  sheet3.mergeCells('A2:K2');
  sheet3.getCell('A2').value = `Period: ${data.selectedYear === 'all' ? 'All Years' : data.selectedYear}`;
  sheet3.getCell('A2').font = subTitleFont;

  sheet3.addRow([]);

  const s3Headers = [
    'Order ID',
    'Business Date',
    'Order Type',
    'Order Title',
    'Order Time',
    'Applicable Employee Count',
    'Breakfast Items',
    'Common Items',
    'Total Cost',
    'Created By',
    'Created At'
  ];
  const s3HeaderRow = sheet3.addRow(s3Headers);
  s3HeaderRow.height = 24;
  s3HeaderRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let sumOrderCost = 0;

  (data.orderSummary || []).forEach(ord => {
    sumOrderCost += ord.totalCost || 0;
    const r = sheet3.addRow([
      ord.orderId,
      ord.businessDate,
      ord.orderType,
      ord.orderTitle,
      ord.orderTime || '',
      ord.applicableCount || 0,
      ord.breakfastItems || '',
      ord.commonItems || '',
      ord.totalCost || 0,
      ord.createdBy || '',
      ord.createdAt ? new Date(ord.createdAt).toLocaleString('en-IN') : ''
    ]);
    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    [4, 5, 7, 8, 10, 11].forEach(colIdx => {
      r.getCell(colIdx).alignment = { vertical: 'middle', horizontal: 'left' };
    });
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    r.getCell(6).numFmt = '#,##0';
    r.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    r.getCell(9).numFmt = '"₹"#,##0.00';
    r.eachCell(c => { c.border = thinBorder; });
  });

  const totS3Row = sheet3.addRow([
    `TOTAL ORDERS: ${(data.orderSummary || []).length}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    sumOrderCost,
    '',
    ''
  ]);
  totS3Row.height = 22;
  totS3Row.eachCell(cell => {
    cell.fill = totalsFill;
    cell.font = totalsFont;
    cell.border = doubleBottomBorder;
  });
  totS3Row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  const costCell = totS3Row.getCell(9);
  costCell.numFmt = '"₹"#,##0.00';
  costCell.alignment = { vertical: 'middle', horizontal: 'right' };

  autoFitColumns(sheet3);

  // =========================================================================
  // SHEET 4: Money Transactions
  // =========================================================================
  const sheet4 = workbook.addWorksheet('Money Transactions');
  sheet4.views = [{ state: 'frozen', ySplit: 4 }];

  sheet4.mergeCells('A1:K1');
  sheet4.getCell('A1').value = 'BREAKFAST MONEY TRANSACTIONS';
  sheet4.getCell('A1').font = titleFont;

  sheet4.mergeCells('A2:K2');
  sheet4.getCell('A2').value = `Period: ${data.selectedYear === 'all' ? 'All Years' : data.selectedYear}`;
  sheet4.getCell('A2').font = subTitleFont;

  sheet4.addRow([]);

  const s4Headers = [
    'Transaction ID',
    'Date',
    'Time',
    'Transaction Type',
    'Amount',
    'Balance After Transaction',
    'Reference Type',
    'Reference ID',
    'Description',
    'Created By',
    'Created At'
  ];
  const s4HeaderRow = sheet4.addRow(s4Headers);
  s4HeaderRow.height = 24;
  s4HeaderRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  (data.moneyTransactions || []).forEach(txn => {
    const r = sheet4.addRow([
      txn.transactionId,
      txn.transactionDate,
      txn.transactionTime,
      txn.type,
      txn.amount,
      txn.balanceAfterTransaction,
      txn.referenceType,
      txn.referenceId || '',
      txn.description || '',
      txn.createdBy,
      txn.createdAt ? new Date(txn.createdAt).toLocaleString('en-IN') : ''
    ]);
    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    [5, 6].forEach(colIdx => {
      const cell = r.getCell(colIdx);
      cell.numFmt = '"₹"#,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    [7, 8, 9, 10, 11].forEach(colIdx => {
      r.getCell(colIdx).alignment = { vertical: 'middle', horizontal: 'left' };
    });
    r.eachCell(c => { c.border = thinBorder; });
  });

  autoFitColumns(sheet4);

  return workbook;
};

/**
 * Auto fit worksheet columns based on content length
 */
const autoFitColumns = (worksheet) => {
  worksheet.columns.forEach(column => {
    let maxLen = 10;
    column.eachCell({ includeEmpty: false }, cell => {
      const valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 3, 12), 50);
  });
};

module.exports = {
  generateReportExcelWorkbook
};
