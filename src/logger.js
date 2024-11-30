const config = require('./config.js');

class Logger {
    constructor() {
        this.verbose = false;
        this.INFO = 'info';
        this.WARN = 'warn';
        this.ERROR = 'error';
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
            else if (logData.reqPath === '/api/order/' && logData.reqMethod === 'POST') this.logFactoryReq(req, res);

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
        const log = {server: serverEvent};
        const logEvent = [this.nowString(), JSON.stringify(log)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logLoginAttempt(req, res) {
        const level = this.statusToLogLevel(res.statusCode);
        const type = 'auth';
        const loginAttemptData = {
            userEmail: req.body.email,
            loginStatus: res.statusCode
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
            factoryStatus: res.statusCode
        };
        const logEvent = [this.nowString(), this.sanitizeData(factoryReqData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    logAuthTokenValidation(req, tokenIsValid) {
        const level = (tokenIsValid) ? this.INFO : this.ERROR;
        const type = 'authToken';
        const authTokenValidationData = {
            validAuthToken: tokenIsValid,
            reqMethod: req.method,
            reqPath: req.baseUrl + req.path
        };
        const logEvent = [this.nowString(), this.sanitizeData(authTokenValidationData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    async logDBQuery(functionName, queryStatus) {
        const level = queryStatus;
        const type = 'dbQuery';
        const dbQueryData = {
            dbFunction: functionName,
            queryStatus: queryStatus
        };
        const logEvent = [this.nowString(), this.sanitizeData(dbQueryData)];
        this.sendLogsToGrafana(level, type, logEvent);
    }

    // logError(endpointOrigin, errorNum) {
        
    // }

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