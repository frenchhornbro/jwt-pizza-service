const app = require('./service.js');
const logger = require('./logger.js');

const port = process.argv[2] || 3000;
let server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  logger.logServerEvent("start");
});

server.on('close', () => {
  logger.logServerEvent("end");
});