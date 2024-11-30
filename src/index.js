const app = require('./service.js');
const logger = require('./logger.js');

const port = process.argv[2] || 3000;
let server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  logger.logServerEvent("Server started");
});

server.on('close', () => {
  logger.logServerEvent("Server closed");
});