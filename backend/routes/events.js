const router = require('express').Router();
const { addClient, removeClient } = require('../lib/sseClients');

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // prevents nginx from buffering the stream
  res.flushHeaders();

  // Confirm the connection is open.
  res.write('event: connected\ndata: {}\n\n');

  // Keep the connection alive with a heartbeat every 25 seconds.
  // Without this, some proxies and browsers drop idle connections.
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 25000);

  addClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

module.exports = router;
