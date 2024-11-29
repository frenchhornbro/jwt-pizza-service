const config = require('./config.js');

class Logger {
    constructor() {
        this.verbose = false;
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
            this.sendLogsToGrafana(this.statusToLogLevel(res.statusCode), 'http', values);

            if (logData.reqPath === '/api/auth/' && logData.reqMethod === 'PUT') this.logLoginAttempt(req, res);

            // Restore previous send() functionality and call send()
            res.send = send;
            return res.send(resBody);
        }
        next();
    };

    logLoginAttempt(req, res) {
        const level = this.statusToLogLevel(res.statusCode);
        const type = 'auth';
        const loginAttemptData = {
            username: req.body.email,
            status: res.statusCode
        };
        const logEvent = [this.nowString(), this.sanitizeData(loginAttemptData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logAuthTokenValidation(req, tokenIsValid) {
        const level = (tokenIsValid) ? 'info' : 'warn';
        const type = 'authToken';
        const authTokenValidationData = {
            validAuthToken: tokenIsValid,
            reqMethod: req.method,
            reqPath: req.baseUrl + req.path
        };
        const logEvent = [this.nowString(), this.sanitizeData(authTokenValidationData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    // logError(endpointOrigin, errorNum) {
        // Q: Should I bundle errors or send them immediately?
    // }

    nowString() {
        return (Math.floor(Date.now()) * 1000000).toString(); // Loki reads time in nanoseconds, not milliseconds
    }

    statusToLogLevel(statusCode) {
        if (statusCode >= 500) return 'error';
        if (statusCode >= 400) return 'warn';
        return 'info';
    }

    sanitizeData(dataToSanitize) {
        const logData = JSON.stringify(dataToSanitize);
        let sanitizedData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\":\\"*****\\"');
        sanitizedData = sanitizedData.replace(/\\"token\\":\s*\\"[^"]*\\"/g, '\\"token\\":\\"*****\\"');
        sanitizedData = sanitizedData.replace(/\\"Authorization\\":\s*\\"Bearer\s+\S+\\"/g, '\\"Authorization\\":\\"*****\\"');
        sanitizedData = sanitizedData.replace(/"Bearer\s+\S+"/g, '"Bearer *****"');
        return sanitizedData;
    }

    // Bundle logs such that they can be sent to Grafana
    createPackage(level, type, logEvent) {
        const labels = {component: config.logging.source, level: level, type: type};
        const eventToLog = {streams: [{stream: labels, values: [logEvent]}]};
        return eventToLog;
    }

    async sendLogsToGrafana(level, type, logEvent) {
        try {
            const packageToSend = this.createPackage(level, type, logEvent);
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