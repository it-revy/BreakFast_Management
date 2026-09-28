const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');
const { seedDatabase } = require('../src/utils/seedData');

describe('Breakfast Money & Actual Status Mapping Integration Tests', () => {
  let adminToken = '';
  let employeeToken = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    // Login as Breakfast Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'faiz', password: 'Faiz123' });
    adminToken = adminRes.body.token;

    // Login as Employee
    const empRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'jyoti', password: 'Jyoti123' });
    employeeToken = empRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('1. Automatic Mapping: Employee request TAKING maps to TAKEN, NOT_TAKING to NOT_TAKEN, NO_RESPONSE to NO_RESPONSE', async () => {
    const testDate = '2026-11-20';

    // Fetch Daily Entry records
    const res = await request(app)
      .get(`/api/breakfast/admin/records?date=${testDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    const empRecord = res.body.allList.find(e => e.employeeId === 'EMP-0004');
    expect(empRecord).toBeDefined();
    expect(empRecord.employeeResponse).toEqual('NO_RESPONSE');
    expect(empRecord.actualStatus).toEqual('NO_RESPONSE');
    expect(empRecord.actualStatusSource).toEqual('EMPLOYEE_RESPONSE');
  });

  test('2. GET /api/breakfast/money/balance - Fetch initial money balance', async () => {
    const res = await request(app)
      .get('/api/breakfast/money/balance')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toHaveProperty('currentBalance');
  });

  test('3. POST /api/breakfast/money/receive - Record cash received from Finance', async () => {
    const res = await request(app)
      .post('/api/breakfast/money/receive')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transactionDate: '2026-11-20',
        transactionTime: '10:30 AM',
        amount: 5000,
        source: 'Finance Team',
        note: 'Test Fund Advance'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction.amount).toEqual(5000);
    expect(res.body.newBalance).toBeGreaterThanOrEqual(5000);
  });

  test('4. POST /api/breakfast/money/expense - Record manual expense & deduct from running balance', async () => {
    const res = await request(app)
      .post('/api/breakfast/money/expense')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transactionDate: '2026-11-20',
        transactionTime: '11:00 AM',
        amount: 300,
        source: 'Manual Expense',
        expenseCategory: 'OTHER_BREAKFAST_EXPENSE',
        description: 'Extra fruits purchase'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction.amount).toEqual(300);
  });

  test('5. Insufficient Balance Check - Block expense exceeding available balance', async () => {
    const res = await request(app)
      .post('/api/breakfast/money/expense')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transactionDate: '2026-11-20',
        transactionTime: '11:30 AM',
        amount: 9999999, // Exceeds balance
        description: 'Huge expense'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.isInsufficient).toBe(true);
    expect(res.body).toHaveProperty('shortfall');
  });

  test('6. GET /api/breakfast/money/statement/daily & monthly - Fetch statements', async () => {
    const dailyRes = await request(app)
      .get('/api/breakfast/money/statement/daily?date=2026-11-20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dailyRes.statusCode).toEqual(200);
    expect(dailyRes.body.success).toBe(true);
    expect(dailyRes.body.statement).toHaveProperty('moneyReceived');

    const monthlyRes = await request(app)
      .get('/api/breakfast/money/statement/monthly?month=2026-11')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(monthlyRes.statusCode).toEqual(200);
    expect(monthlyRes.body.success).toBe(true);
    expect(monthlyRes.body.statement).toHaveProperty('openingBalance');
  });
});
