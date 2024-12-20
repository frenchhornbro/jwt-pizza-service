const request = require('supertest');
const app = require('../service');

const randomName = () => Math.random().toString(36).substring(2, 12);

const testUser = {name:'pizza diner', email: 'reg@test.com', password: 'a'};
let testUserAuthToken;

beforeAll(async() => {
    testUser.email = randomName() + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
});

test('loginPos', async() => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const {password, ...user} = {...testUser, roles: [{role: 'diner'}]};
    expect(loginRes.body.user).toMatchObject(user);
    expect(password).toBe(testUser.password);
});

test('loginNeg', async() => {
    testUser.password = 'badPassword';
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).not.toBe(200);
});

test('updateFullPos', async() => {
    const newUser = {name:'ImATest', email: 'imatest@test.com', password: 'a'};
    const regRes = await request(app).post('/api/auth').send(newUser);
    const updateRes = await request(app).put(`/api/auth/${regRes.body.user.id}`).set('Authorization', `Bearer ${regRes.body.token}`).send({email:'coolerEmail@test.com', password: "betterPassword123"});
    expect(updateRes.status).toBe(200);
});

test('updateNeg', async() => {
    let updateRes = await request(app).put(`/api/auth/:${testUser.id}`).send(); 
    expect(updateRes.status).not.toBe(200);
    updateRes = await request(app).put(`/api/auth/:${testUser.id}`).set('Authorization', `Bearer ${testUserAuthToken}`).send({testUser}); 
    expect(updateRes.status).toBe(403);
});

test('deletePos', async() => {
    const deleteRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`).send(); 
    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.body.message).toBe('logout successful');
});

test('deleteNeg', async() => {
    const deleteRes = await request(app).delete('/api/auth').send(); 
    expect(deleteRes.status).not.toBe(200);
});

test('getPos', async() => {
    const getRes = await request(app).get('/');
    expect(getRes.status).toBe(200);
});

test('unknownEndpoint', async() => {
    const res = await request(app).put('/ajsdlfkjalkjdsfaoifjawe').send();
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('unknown endpoint');
});

test('docs', async() => {
    const res = await request(app).put('/api/docs').send();
    expect(res.status).toBe(200);
    expect(res.body.version).toMatch(/\d+\.\d+/);
});

test('cantOverwrite', async() => {
    const email = `${randomName()}@random.com`;
    const newUser = {
        name: randomName(),
        email: email,
        password: "password1"
    };
    let res = await request(app).post('/api/auth').send(newUser);
    expect(res.status).toBe(200);

    const overWriteUser = {
        name: 'hacker',
        email: email,
        password: 'hackerPassword'
    }
    res = await request(app).post('/api/auth').send(overWriteUser);
    expect(res.status).toBe(401);
})