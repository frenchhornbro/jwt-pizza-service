const config = require('./config.js');

class Logger {
    constructor() {
        this.verbose = false;
        this.INFO = 'INFO';
        this.WARN = 'WARN';
        this.ERROR = 'ERROR';
    }

    // Handle requests and responses
    httpLogger = (req, res, next) => {
        // Modify send request to enable viewing response
        let send = res.send;
        res.send = (resBody) => {
            // Construct log and append it to the array of logs
            const authHeaders = (req.headers.authorization) ? req.headers.authorization : null;
            const logData = {
                method: req.method,
                path: req.baseUrl + req.path,
                authHeader: authHeaders,
                reqBody: JSON.stringify(req.body),
                status: res.statusCode,
                resBody: JSON.stringify(resBody),
                ip: req.ip
            };
            const values = [this.nowString(), this.sanitizeData(logData)];
            this.sendLogsToGrafana(this.statusToLogLevel(res.statusCode), 'http', values);

            // Restore previous send() functionality and call send()
            res.send = send;
            return res.send(resBody);
        }
        next();
    };

    logServerEvent(serverEvent, status=null) {
        let level;
        if (status) level = status;
        else level = (serverEvent === 'close') ? this.ERROR : this.INFO;
        const type = 'server';
        const log = {message: serverEvent};
        const logEvent = [this.nowString(), JSON.stringify(log)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logLoginAttempt(req, res) {
        const level = this.statusToLogLevel(res.statusCode);
        const type = 'auth';
        const loginAttemptData = {
            userEmail: req.body.email,
            status: res.statusCode,
            ip: req.ip
        };
        const logEvent = [this.nowString(), this.sanitizeData(loginAttemptData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logFactoryReq(req, res) {
        const level = this.statusToLogLevel(res.statusCode);
        const type = 'factory';
        const userEmail =  (req && req.user && req.user.email) ? req.user.email : null;
        const factoryReqData = {
            userEmail: userEmail,
            status: res.statusCode,
            ip: req.ip
        };
        const logEvent = [this.nowString(), this.sanitizeData(factoryReqData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logAuthTokenValidation(req, tokenIsValid) {
        const level = (tokenIsValid) ? this.INFO : this.ERROR;
        const type = 'authToken';
        const authTokenValidationData = {
            valid: tokenIsValid,
            method: req.method,
            path: req.baseUrl + req.path,
            ip: req.ip
        };
        const logEvent = [this.nowString(), this.sanitizeData(authTokenValidationData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    async logDBQuery(functionName, queryStatus) {
        const level = queryStatus;
        const type = 'dbQuery';
        const dbQueryData = {
            functionName: functionName,
        };
        const logEvent = [this.nowString(), this.sanitizeData(dbQueryData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logError(req, status, errorMessage) {
        const level = this.statusToLogLevel(status);
        const type = 'error';
        const errorData = {
            method: req.method,
            path: req.baseUrl + req.path,
            status: status,
            message: errorMessage,
            ip: req.ip
        };
        const logEvent = [this.nowString(), this.sanitizeData(errorData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    nowString() {
        return (Math.floor(Date.now()) * 1000000).toString(); // Loki reads time in nanoseconds, not milliseconds
    }

    statusToLogLevel(statusCode) {
        if (statusCode >= 500) return this.ERROR;
        if (statusCode >= 400) return this.WARN;
        return this.INFO;
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