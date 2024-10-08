const request = require('supertest');
const app = require('../service');
const {Role, DB} = require('../database/database.js');

randomName = () => Math.random().toString(36).substring(2, 12);

let testAdmin = {name: randomName(), email: 'reg@test.com', password: 'a'};
let testAdminAuthToken;
const testUser = {name:'pizza diner', email: 'reg@test.com', password: 'a'};
let testUserAuthToken;

beforeAll(async() => {
    //Make an administrator
    testAdmin.email = testAdmin.name + '@admin.com';
    testAdmin.roles = [{role: Role.Admin}];
    await DB.addUser(testAdmin);
    testAdmin.password = 'a';
    const loginRes = await request(app).put('/api/auth').send(testAdmin);
    testAdminAuthToken = await loginRes.body.token;

    //Make a standard user
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
});

test('menuGetAuth', async() => {
    const getRes = await request(app).get('/api/order/menu').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getRes.status).toBe(200);
});

test('menuGet', async() => {
    const getRes = await request(app).get('/api/order/menu');
    expect(getRes.status).toBe(200);
});

test('orderGetUser', async() => {
    const getRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.dinerId.toString()).toMatch(/\d+/);
    expect(getRes.body.orders.length).toBe(0);
});

test('orderGetNoAuth', async() => {
    const getRes = await request(app).get('/api/order');
    expect(getRes.status).toBe(401);
    expect(getRes.body.message).toBe('unauthorized');
})

test('addToMenuAdmin', async() => {
    const newItem = {title: 'Taco', description: 'It is a taco', image: 'taco.png', price: 20};
    const putRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testAdminAuthToken}`).send(newItem); 
    expect(putRes.status).toBe(200);
    expect(putRes.body[putRes.body.length-1].title).toBe(newItem.title);
    expect(putRes.body[putRes.body.length-1].description).toBe(newItem.description);
    expect(putRes.body[putRes.body.length-1].image).toBe(newItem.image);
    expect(putRes.body[putRes.body.length-1].price).toBe(newItem.price);
});

test('addToMenuUser', async() => {
    const putRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testUserAuthToken}`); 
    expect(putRes.status).toBe(403);
    expect(putRes.body.message).toBe('unable to add menu item');
});

test('createOrderNoAuth', async() => {
    const createRes = await request(app).post('/api/order');
    expect(createRes.status).toBe(401);
    expect(createRes.body.message).toBe('unauthorized');
});