const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');
const { seedDatabase } = require('../src/utils/seedData');

describe('All Orders Unified View & Employee Permissions Verification', () => {
  let bfAdminToken = '';
  let ceoToken = '';
  let itAdminToken = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    // Login as BF Admin (Faiz Saiyad - faiz)
    const bfRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'faiz', password: 'Faiz123' });
    bfAdminToken = bfRes.body.token;

    // Login as CEO (Rajneesh Prasad - rajneesh)
    const ceoRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rajneesh', password: 'Rajneesh123' });
    ceoToken = ceoRes.body.token;

    // Login as IT Admin (Vasudev Kava - vasudev)
    const itRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'vasudev', password: 'Vasudev123' });
    itAdminToken = itRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('1. GET /api/breakfast/orders - Unified All Orders endpoint returns valid structure', async () => {
    const res = await request(app)
      .get('/api/breakfast/orders')
      .set('Authorization', `Bearer ${bfAdminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  test('2. Employee CRUD Permission Enforcement: BF Admin is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${bfAdminToken}`)
      .send({
        employeeId: 'EMP-DENIED-1',
        name: 'Denied Test User',
        email: 'denied@company.com',
        department: 'Engineering',
        designation: 'Developer'
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  test('3. Employee CRUD Permission: CEO can create an employee', async () => {
    const testEmpId = `EMP-CEO-${Date.now().toString().slice(-4)}`;
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${ceoToken}`)
      .send({
        employeeId: testEmpId,
        name: 'CEO Created Employee',
        email: `ceo.emp.${Date.now()}@company.com`,
        department: 'Executive Office',
        designation: 'Executive Analyst'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.employee.employeeId).toEqual(testEmpId);
  });

  test('4. Employee CRUD Permission: BF Admin can READ employees (GET /api/employees)', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${bfAdminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.employees)).toBe(true);
  });
});
