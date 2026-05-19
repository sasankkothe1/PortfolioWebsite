const request = require('supertest');
const app = require('../app');

describe('GET /api/events — SSE', () => {
  it('responds with text/event-stream content type', async () => {
    const res = await request(app)
      .get('/api/events')
      .timeout({ response: 500 })  // don't wait for stream to close
      .catch(err => err.response || err);

    // Supertest may timeout on a streaming response; check what we got.
    const status = res.status || res.statusCode;
    const contentType = (res.headers || {})['content-type'] || '';
    expect(status).toBe(200);
    expect(contentType).toContain('text/event-stream');
  });

  it('sends initial connected event', done => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.get(`http://localhost:${port}/api/events`, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk.toString();
          if (data.includes('event: connected')) {
            expect(data).toContain('event: connected');
            req.destroy();
            server.close(done);
          }
        });
      });
      req.on('error', () => {}); // ignore abort error
    });
  });
});
