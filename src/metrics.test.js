const metrics = require('./metrics.js');

test('sendToGrafana', async() => {
    const toSend = metrics.buildPrometheusStr("test", "-", "-", "-");
    await metrics.sendToGrafana(toSend);
    metrics.verbose = true;
    await metrics.sendToGrafana(toSend);
});

test('failurePrints', async() => {
    metrics.verbose = true;
    const res = {ok: false};
    res.json = () => {return "problem";}
    await metrics.checkFailure(res);
});

test('getPizzaFailures', () => {
    expect(() => metrics.getPizzaFailures()).not.toThrow();
});

test('getCPUUsage', () => {
    expect(() => metrics.getCpuUsagePercentage()).not.toThrow();
});

test('getMemoryUsage', () => {
    expect(() => metrics.getMemoryUsagePercentage()).not.toThrow();
});

test('buildAndSendMetrics', async() => {
    jest.useFakeTimers({now: 0});
    jest.spyOn(metrics, 'buildMetrics');
    metrics.startTimer();
    jest.advanceTimersByTime(metrics.interval*1.5);
    expect(metrics.buildMetrics).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
});