const logger = require('./logger.js');
const config = require('./config.js');

test('sanitizeMetrics', async() => {
    const tokenResponse = {resBody: JSON.stringify({ user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'tttttt' })};
    const sanitizedResponseStr = JSON.stringify({resBody: JSON.stringify({ user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: '*****' })});
    expect(logger.sanitizeData(tokenResponse)).toBe(sanitizedResponseStr);
});

test('createPackage', async() => {
    const component = config.logging.source;
    const level = 'test';
    const type = 'test';
    const labels = {component: component, level: level, type: type};
    const expected = {streams: [{stream: labels, values: [[]]}]};
    expect(logger.createPackage(level, type, [])).toMatchObject(expected);
});

test('sendToGrafana', async() => {
    logger.verbose = true;
    await logger.sendLogsToGrafana('test', 'test', []);
});

test('failurePrints', async() => {
    const res = {ok: false};
    res.text = () => {return "problem";}
    logger.checkFailure(res);
});