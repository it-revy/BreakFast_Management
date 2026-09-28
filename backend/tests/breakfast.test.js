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
      .send({ username: 'rajneesh', password: 'Rajneesh123' });
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

  test('POST /api/breakfast/submit - Submits Taking Breakfast (YES)', async () => {
    const res = await request(app)
      .post('/api/breakfast/submit')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ response: 'YES' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.record.response).toEqual('YES');
  });

  test('POST /api/breakfast/submit - Updates response to Not Taking Breakfast (NO) with valid reason', async () => {
    const res = await request(app)
      .post('/api/breakfast/submit')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ response: 'NO', reasonCode: 'FASTING' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.record.response).toEqual('NO');
    expect(res.body.record.reasonCode).toEqual('FASTING');
  });

  test('GET /api/breakfast/history - Returns personal submission history', async () => {
    const res = await request(app)
      .get('/api/breakfast/history')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.records)).toBe(true);
  });
});
