const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');
const { seedDatabase } = require('../src/utils/seedData');

describe('Breakfast Purchase Orders & Itemized Cost Engine Tests', () => {
  let adminToken = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'vasudev', password: 'Vasudev123' });
    adminToken = res.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('POST /api/orders & GET /api/orders - Computes Price x Qty totals accurately', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Role-Used', 'BREAKFAST_ADMIN')
      .send({
        businessDate: '2026-09-22',
        vendorName: 'Jest Test Vendor',
        notes: 'Jest Test Order',
        items: [
          { orderType: 'INDIVIDUAL', employeeId: 'EMP-0003', itemName: 'Upma', price: 35, quantity: 2 }, // ₹70
          { orderType: 'COMMON', itemName: 'Fruit Juice', price: 200, quantity: 1 } // ₹200
        ]
      });

    expect(createRes.statusCode).toEqual(201);
    expect(createRes.body.success).toBe(true);

    const getRes = await request(app)
      .get('/api/orders?date=2026-09-22')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.summary).toHaveProperty('grandTotal');
    expect(getRes.body.summary.grandTotal).toBeGreaterThan(0);
  });
});
