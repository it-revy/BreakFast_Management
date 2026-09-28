const request = require('supertest');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const app = require('../src/index');
const { seedDatabase } = require('../src/utils/seedData');

describe('Authentication & Multi-Role Permission Tests', () => {
  beforeAll(async () => {
    await connectDB();
    await seedDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('POST /api/auth/login - Success for Super Admin (EMP-0001)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP-0001', password: 'Password123!' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.roles).toContain('IT_ADMIN');
    expect(res.body.user.roles).toContain('BREAKFAST_ADMIN');
    expect(res.body.user.permissions).toContain('*');
  });

  test('POST /api/auth/login - Rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP-0001', password: 'WrongPassword!' });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});
