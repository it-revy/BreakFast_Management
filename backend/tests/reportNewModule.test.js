const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');
const { seedDatabase } = require('../src/utils/seedData');

describe('Monthly Breakfast & Money Reporting Module Integration Tests', () => {
  let adminToken = '';
  let employeeToken = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    // Login as Breakfast Admin (has breakfast.report)
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP-0002', password: 'Password123!' });
    adminToken = adminRes.body.token;

    // Login as Standard Employee (no report permission)
    const empRes = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP-0004', password: 'Password123!' });
    employeeToken = empRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('1. GET /api/reports/years - Returns dynamically detected available years', async () => {
    const res = await request(app)
      .get('/api/reports/years')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.years)).toBe(true);
    expect(res.body).toHaveProperty('defaultYear');
  });

  test('2. GET /api/reports/monthly - Returns 4 sheets report data structure', async () => {
    const res = await request(app)
      .get('/api/reports/monthly?year=2026&department=ALL')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('monthlySummary');
    expect(res.body).toHaveProperty('yearlyTotal');
    expect(res.body).toHaveProperty('employeeReport');
    expect(res.body).toHaveProperty('orderSummary');
    expect(res.body).toHaveProperty('moneyTransactions');
    expect(Array.isArray(res.body.monthlySummary)).toBe(true);
  });

  test('3. GET /api/reports/monthly?year=all - Chronological All Years support', async () => {
    const res = await request(app)
      .get('/api/reports/monthly?year=all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.selectedYear).toEqual('all');
    expect(Array.isArray(res.body.monthlySummary)).toBe(true);
  });

  test('4. GET /api/reports/export-excel - Streams .xlsx Excel file with 4 sheets', async () => {
    const res = await request(app)
      .get('/api/reports/export-excel?year=2026')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
    expect(res.body).toBeDefined();
  });

  test('5. Permissions Security Check - Unauthorized employee receives 403', async () => {
    const res = await request(app)
      .get('/api/reports/monthly')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });
});
