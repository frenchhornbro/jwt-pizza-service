const request = require('supertest');
const app = require('../service');
const {Role, DB} = require('../database/database.js');

let testAdmin = {name:Math.random().toString(36).substring(2, 12), email: 'reg@test.com', password: 'a'};
let testAdminAuthToken;

beforeAll(async() => {
    //Make an administrator
    testAdmin.email = testAdmin.name + '@admin.com';
    testAdmin.roles = [{role: Role.Admin}];
    await DB.addUser(testAdmin);
    testAdmin.password = 'a';
    const loginRes = await request(app).put('/api/auth').send(testAdmin);
    testAdminAuthToken = await loginRes.body.token;
});

test('menuGet', async() => {
    const getRes = await request(app).get('/api/order/menu');
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBe(0);
});

test('orderGetAdmin', async() => {
    const getRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.dinerId.toString()).toMatch(/\d+/);
    expect(getRes.body.orders.length).toBe(0);
});

test('orderGetUser', async() => {
    const getRes = await request(app).get('/api/order');
    expect(getRes.status).toBe(401);
    expect(getRes.body.message).toBe('unauthorized');
})