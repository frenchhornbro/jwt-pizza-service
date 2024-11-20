const os = require('os');
const config = require('./config.js');

class Metrics {
    constructor() {
        this.totalRequests = 0;
        this.totalGet = 0;
        this.totalPost = 0;
        this.totalPut = 0;
        this.totalDelete = 0;
        
        const interval = 3000;
        const timer = setInterval(() => {
            this.sendToGrafana('request', 'ALL', 'total', this.totalRequests);
            this.sendToGrafana('request', 'GET', 'get', this.totalGet);
            this.sendToGrafana('request', 'POST', 'post', this.totalPost);
            this.sendToGrafana('request', 'PUT', 'put', this.totalPost);
            this.sendToGrafana('request', 'DELETE', 'delete', this.totalDelete);
            this.sendToGrafana('cpu', '-', 'CPU', this.getCpuUsagePercentage());
            this.sendToGrafana('memory', '-', 'MEMORY', this.getMemoryUsagePercentage());
        }, interval);
        timer.unref();
    }
  
    requestTracker = async (req, res, next) => {
        let method = req.method;
        this.incrementRequestMetric(method);
        next();
    };

    getCpuUsagePercentage = () => {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
    }

    getMemoryUsagePercentage = () => {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem) * 100;
        return memUsage.toFixed(2);
    };

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

    incrementRequestMetric(method) {
        this.totalRequests++;
        switch (method) {
            case 'GET':
                this.totalGet++;
                break
            case 'POST':
                this.totalPost++;
                break
            case 'PUT':
                this.totalPut++;
                break;
            case 'DELETE':
                this.totalDelete++;
                break
            default:
                console.log(`Unknown method: ${method}`);
        }
    }
}

const metrics = new Metrics();
module.exports = metrics;