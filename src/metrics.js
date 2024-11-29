const os = require('os');
const config = require('./config.js');

class Metrics {
    constructor() {
        this.verbose = false;
        this.interval = 15000;
        this.totalRequests = 0;
        this.totalGet = 0;
        this.totalPost = 0;
        this.totalPut = 0;
        this.totalDelete = 0;
        this.totalPizzasSold = 0;
        this.totalRevenue = 0;
        this.pizzaFailures = 0;
        this.totalAuthSuccess = 0;
        this.totalAuthFail = 0;
        this.numactiveUsers = 0;
        this.latency = new Map(); // endpointName: [time, numRequests]
        
        const timer = setInterval(() => {
            let metricsStr = "";
            metricsStr += this.buildPrometheusStr('request', 'ALL', 'total', this.totalRequests);
            metricsStr += this.buildPrometheusStr('request', 'GET', 'get', this.totalGet);
            metricsStr += this.buildPrometheusStr('request', 'POST', 'post', this.totalPost);
            metricsStr += this.buildPrometheusStr('request', 'PUT', 'put', this.totalPut);
            metricsStr += this.buildPrometheusStr('request', 'DELETE', 'delete', this.totalDelete);
            metricsStr += this.buildPrometheusStr('cpu', '-', 'CPU', this.getCpuUsagePercentage());
            metricsStr += this.buildPrometheusStr('memory', '-', 'MEMORY', this.getMemoryUsagePercentage());
            metricsStr += this.buildPrometheusStr('pizza', '-', 'PURCHASES', this.totalPizzasSold);
            metricsStr += this.buildPrometheusStr('pizza', '-', 'FAILURES', this.getPizzaFailures());
            metricsStr += this.buildPrometheusStr('revenue', '-', 'REVENUE', this.totalRevenue);
            metricsStr += this.buildPrometheusStr('auth', '-', 'SUCCESS', this.totalAuthSuccess);
            metricsStr += this.buildPrometheusStr('auth', '-', 'FAIL', this.totalAuthFail);
            metricsStr += this.buildPrometheusStr('users', '-', 'ACTIVE', this.numactiveUsers);
            for (const [endpointName, timeArr] of this.latency) {
                const reportedTime = (timeArr[1] === 0) ? 0 : timeArr[0] / timeArr[1];
                metricsStr += this.buildPrometheusStr('latency', '-', endpointName, reportedTime);
                this.latency.set(endpointName, [0, 0]);
            }
            this.sendToGrafana(metricsStr);
        }, this.interval);
        timer.unref();
    }

    requestTracker = async (req, res, next) => {
        let method = req.method;
        this.incrementRequestMetric(method);
        next();
    };

    reportLatency = (endpointName, start, end) => {
        if (this.latency.get(endpointName) === undefined) this.latency.set(endpointName, [0, 0]);
        this.latency.set(endpointName, [this.latency.get(endpointName)[0]+end-start, this.latency.get(endpointName)[1]+1]);
    }

    handlePizzaSuccessMetrics = (order) => {
        try {
            for (let pizza of order.items) {
                this.totalRevenue += pizza.price;
                this.totalPizzasSold++;
            }
        }
        catch {
            console.error("handlePizzaMetrics failed");
        }
    };
    handlePizzaFailureMetrics = () => this.pizzaFailures++;

    handleRegistrationMetrics = () => this.trackActiveUser(true);
    handleLogoutMetrics = () => this.trackActiveUser(false);

    handleLoginMetrics = (success) => {
        if (success) {
            this.totalAuthSuccess++;
            this.trackActiveUser(true);
        }
        else this.totalAuthFail++;
    };

    trackActiveUser = (isIncoming) => {
        if (isIncoming) this.numactiveUsers++;
        else this.numactiveUsers--;
    };

    getPizzaFailures = () => {
        let ret = this.pizzaFailures;
        this.pizzaFailures = 0;
        return ret;
    };

    getCpuUsagePercentage = () => {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
    };

    getMemoryUsagePercentage = () => {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem) * 100;
        return memUsage.toFixed(2);
    };

    incrementRequestMetric(metricName) {
        this.totalRequests++;
        switch (metricName) {
            case 'GET':
                this.totalGet++;
                break;
            case 'POST':
                this.totalPost++;
                break;
            case 'PUT':
                this.totalPut++;
                break;
            case 'DELETE':
                this.totalDelete++;
                break;
            default:
                console.error(`Unknown method: ${metricName}`);
        }
    }

    buildPrometheusStr(metricPrefix, httpMethod, metricName, metricValue) {
        return `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}\n`;
    }

    async sendToGrafana(metrics) {
        try {
            const grafRes = await fetch(`${config.metrics.url}`, {
                method: 'post',
                body: metrics,
                headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
            });
            this.checkFailure(grafRes);
            if (this.verbose) console.log(`Pushed ${metrics}`);
        }
        catch(error) {
            console.error('Error pushing metrics:', error);
        }
    }

    async checkFailure(grafRes) {
        if (!grafRes.ok) {
            console.error(`Failed to push metrics data to Grafana: ${metrics}`);
            console.error(`\t${await grafRes.json()}`);
        }
    }
}

const metrics = new Metrics();
module.exports = metrics;