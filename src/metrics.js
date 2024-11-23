const os = require('os');
const config = require('./config.js');

class Metrics {
    constructor() {
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
        
        const interval = 15000;
        const timer = setInterval(() => {
            //TODO: Refactor into sending one string, not 10
            this.sendToGrafana('request', 'ALL', 'total', this.totalRequests);
            this.sendToGrafana('request', 'GET', 'get', this.totalGet);
            this.sendToGrafana('request', 'POST', 'post', this.totalPost);
            this.sendToGrafana('request', 'PUT', 'put', this.totalPut);
            this.sendToGrafana('request', 'DELETE', 'delete', this.totalDelete);
            this.sendToGrafana('cpu', '-', 'CPU', this.getCpuUsagePercentage());
            this.sendToGrafana('memory', '-', 'MEMORY', this.getMemoryUsagePercentage());
            this.sendToGrafana('pizza', '-', 'PURCHASES', this.totalPizzasSold);
            this.sendToGrafana('pizza', '-', 'FAILURES', this.getPizzaFailures());
            this.sendToGrafana('revenue', '-', 'REVENUE', this.totalRevenue);
            this.sendToGrafana('auth', '-', 'SUCCESS', this.totalAuthSuccess);
            this.sendToGrafana('auth', '-', 'FAIL', this.totalAuthFail);
            this.sendToGrafana('users', '-', 'ACTIVE', this.numactiveUsers);
        }, interval);
        timer.unref();
    }

    requestTracker = async (req, res, next) => {
        let method = req.method;
        this.incrementRequestMetric(method);
        next();
    };

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
    
    handlePizzaFailureMetrics = () => this.pizzaFailures++;

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

    sendToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
        const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;
    
        fetch(`${config.metrics.url}`, {
            method: 'post',
            body: metric,
            headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
        })
        .then((response) => {
            if (!response.ok) {
                console.error('Failed to push metrics data to Grafana');
                response.json();
            }
            else {
                console.log(`Pushed ${metric}`);
            }
        })
        .catch((error) => {
            console.error('Error pushing metrics:', error);
        });
    }
}

const metrics = new Metrics();
module.exports = metrics;