const request = require('supertest');
const app = require('../service');
const {Role, DB} = require('../database/database.js');

const randomName = () => Math.random().toString(36).substring(2, 12);

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

test('franchiseNoAddGetPos', async() => {
    const getRes = await request(app).get('/api/franchise');
    expect(getRes.status).toBe(200);
    expect(getRes).not.toBeNull();
});

test('franchiseGetBlankUserPos', async() => {
    const getRes = await request(app).get(`/api/franchise/${testAdmin.id}`).set('Authorization', `Bearer ${testAdminAuthToken}`).send();
    expect(getRes.status).toBe(200);
    expect(getRes).not.toBeNull();
});

test('franchiseGetActualUserPos', async() => {
    //Create a user
    const tempUser = {name: randomName(), email: `${randomName()}@test.com`, password: 'a'};
    tempUser.roles = [{role: Role.Admin}];
    await DB.addUser(tempUser);
    tempUser.password = 'a';
    const loginRes = await request(app).put('/api/auth').send(tempUser);
    const tempUserAuthToken = loginRes.body.token;
    const tempUserID = loginRes.body.user.id;

    //Create a franchise with user as admin
    const franchise = {name: randomName(), admins: [{email: tempUser.email}]};
    await request(app).post('/api/franchise').set('Authorization', `Bearer ${tempUserAuthToken}`).send(franchise);

    //Make sure user is actually an admin for that franchise
    const getRes = await request(app).get(`/api/franchise/${tempUserID}`).set('Authorization', `Bearer ${tempUserAuthToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body[0].name).toBe(franchise.name);
    const resAdmin = getRes.body[0].admins[0];
    expect(resAdmin.name).toBe(tempUser.name);
    expect(resAdmin.email).toBe(tempUser.email);
    expect(resAdmin.id).toBe(tempUserID);
});

test('franchiseGetUserNeg', async() => {
    const getRes = await request(app).get(`/api/franchise/${testAdmin.id}`).set('Authorization', `Bearer bogus`).send();
    expect(getRes.status).toBe(401);
});

test('franchiseCreatePos', async() => {
    const franchise = {name: randomName(), admins: [{email: testAdmin.email}]};
    const makeFranchRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send(franchise);
    expect(makeFranchRes.status).toBe(200);
    expect(makeFranchRes.body.name).toBe(franchise.name);
});

test('franchiseCreateUser', async() => {
    const franchise = {name: randomName(), admins: [{email: testUser.email}]};
    const makeFranchRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(franchise);
    expect(makeFranchRes.status).toBe(403);
    expect(makeFranchRes.body.message).toBe('unable to create a franchise');
});

test('franchiseCreateNeg', async() => {
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send();
    expect(createRes.status).toBe(500);
});

test('storeCreatePos', async() => {
    const franchise = {name: randomName(), admins: [{email: testAdmin.email}]};
    const makeFranchRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send(franchise);
    const franchiseID = makeFranchRes.body.id;

    const store = {franchiseId: franchiseID, name: randomName()};
    const makeStoreRes = await request(app).post(`/api/franchise/${franchiseID}/store`).set('Authorization', `Bearer ${testAdminAuthToken}`).send(store);
    expect(makeStoreRes.status).toBe(200);
    expect(makeStoreRes.body.franchiseId).toBe(franchiseID);
    expect(makeStoreRes.body.name).toBe(store.name);
});

test('deleteNullFranchise', async() => {
    const delRes = await request(app).delete('/api/franchise/1379120484').set('Authorization', `Bearer ${testAdminAuthToken}`).send();
    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe('franchise deleted');
});

test('deleteFranchiseAsUser', async() => {
    const delRes = await request(app).delete('/api/franchise/1978398742').set('Authorization', `Bearer ${testUserAuthToken}`).send();
    expect(delRes.status).toBe(403);
    expect(delRes.body.message).toBe('unable to delete a franchise');
});

test('deleteActualFranchise', async() => {
    //Make franchise
    const franchise = {name: randomName(), admins: [{email: testAdmin.email}]};
    const makeFranchRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send(franchise);
    const franchiseID = makeFranchRes.body.id;

    //Delete franchise
    const delRes = await request(app).delete(`/api/franchise/${franchiseID}`).set('Authorization', `Bearer ${testAdminAuthToken}`).send();
    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe('franchise deleted');
});

test('deleteStore', async() => {
    const delRes = await request(app).delete('/api/franchise/1379120484/store/219387').set('Authorization', `Bearer ${testAdminAuthToken}`).send();
    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe('store deleted');
});

test('deleteStoreAsUser', async() => {
    const delRes = await request(app).delete('/api/franchise/314159265/store/12345').set('Authorization', `Bearer ${testUserAuthToken}`).send();
    expect(delRes.status).toBe(403);
    expect(delRes.body.message).toBe('unable to delete a store');
});

    