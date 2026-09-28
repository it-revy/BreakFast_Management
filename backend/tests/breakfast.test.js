const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');
const { seedDatabase } = require('../src/utils/seedData');

describe('Breakfast Daily Submission & Validation Tests', () => {
  let empToken = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP-0003', password: 'Password123!' });
    empToken = res.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('GET /api/breakfast/today - Returns daily status and business date', async () => {
    const res = await request(app)
      .get('/api/breakfast/today')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('businessDate');
    expect(res.body).toHaveProperty('cutoffTime');
  });

  test('POST /api/breakfast/multi-day-absence - Records multi-day planned absence', async () => {
    const res = await request(app)
      .post('/api/breakfast/multi-day-absence')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        fromDate: '2026-10-10',
        toDate: '2026-10-12',
        reasonCode: 'ON_LEAVE',
        reasonText: 'Vacation Leave'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.datesCount).toEqual(3);
  });
});
