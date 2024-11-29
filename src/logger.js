const config = require('./config.js');

class Logger {
    constructor() {
        this.verbose = false;
        this.interval = 5000;
        this.logs = [];
        const timer = setInterval(() => {
            if (this.logs.length > 0) {
                this.sendLogsToGrafana('info', 'http');
            }
        }, this.interval);
        timer.unref();
    }

    // Handle requests and responses
    httpLogger = (req, res, next) => {
        // Modify send request to enable viewing response
        let send = res.send;
        res.send = (resBody) => {
            // Construct log and append it to the array of logs
            const authHeaders = (req.headers.authorization) ? req.headers.authorization : null;
            const logData = {
                reqMethod: req.method,
                reqPath: req.baseUrl + req.path,
                reqAuthHeader: authHeaders,
                reqBody: JSON.stringify(req.body),
                resStatus: res.statusCode,
                resBody: JSON.stringify(res.body)
            };
            const values = [this.nowString(), this.sanitizeData(logData)];
            this.logs.push(values);

            // Restore previous send() functionality and call send()
            res.send = send;
            return res.send(resBody);
        }
        next();
    };

    // logError(endpointOrigin, errorNum) {
        // Q: Should I bundle errors or send them immediately?
    // }

    nowString() {
        return (Math.floor(Date.now()) * 1000000).toString(); // Loki reads time in nanoseconds, not milliseconds
    }

    // statusToLogLevel(status) {
        //Q: I'm sending logs bundled. Do I have to have separate bundles for seperate status codes? Since labels are applied to all logs within.
    // }

    sanitizeData(dataToSanitize) {
        const logData = JSON.stringify(dataToSanitize);
        let sanitizedData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\":\\"*****\\"');
        sanitizedData = sanitizedData.replace(/\\"token\\":\s*\\"[^"]*\\"/g, '\\"token\\":\\"*****\\"');
        sanitizedData = sanitizedData.replace(/\\"Authorization\\":\s*\\"Bearer\s+\S=\\"/g, '\\"Authorization\\":\\"*****\\"');
        return sanitizedData;
    }

    // Bundle logs such that they can be sent to Grafana
    createPackage(level, type) {
        const labels = {component: config.logging.source, level: level, type: type};
        const eventToLog = {streams: [{stream: labels, values: this.logs}]};
        return eventToLog;
    }

    async sendLogsToGrafana(level, type) {
        try {
            const packageToSend = this.createPackage(level, type);
            this.logs = [];
            const body = JSON.stringify(packageToSend);
            const grafRes = await fetch(`${config.logging.url}`, {
                method: 'POST',
                body: body,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
                },
            });
            this.checkFailure(grafRes);
            if (this.verbose) console.log('Logs sent to Grafana');
        }
        catch (error) {
            console.error('Error pushing logs:', error);
        }
    }

    async checkFailure(grafRes) {
        if (!grafRes.ok) {
            const errText = await grafRes.text();
            console.log(`Failed to send log to Grafana: ${errText}`);
        }
    }
}

const logger = new Logger();
module.exports = logger;