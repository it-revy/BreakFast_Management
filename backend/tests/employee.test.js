const request = require('supertest');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const app = require('../src/index');

describe('Employee Admin CRUD & Soft/Hard Delete Tests', () => {
  let adminToken = '';
  const testEmpId = `EMP-TEST-${Date.now().toString().slice(-4)}`;

  beforeAll(async () => {
    await connectDB();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP-0001', password: 'Password123!' });
    adminToken = res.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('POST /api/employees - Admin creates new employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: testEmpId,
        name: 'Test QA User',
        email: `qa.${Date.now()}@company.com`,
        department: 'Quality Assurance',
        designation: 'Software Tester',
        roles: ['EMPLOYEE']
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.employee.employeeId).toEqual(testEmpId);
  });

  test('DELETE /api/employees/:id - Soft deactivates employee account', async () => {
    const res = await request(app)
      .delete(`/api/employees/${testEmpId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.employee.status).toEqual('inactive');
  });

  test('POST /api/employees/:id/hard-delete - IT_ADMIN permanent hard delete', async () => {
    const res = await request(app)
      .post(`/api/employees/${testEmpId}/hard-delete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Role-Used', 'IT_ADMIN')
      .send({ confirmCode: 'CONFIRM_PERMANENT_DELETE' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
