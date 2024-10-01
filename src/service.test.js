const app = require('./service');
const request = require('supertest');

test('blankServiceTest', () => {

});

test('getReqNoErr', async () => {
    const response = await request(app).get('/');
});