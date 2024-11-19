const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // WebSocket-specific endpoint
  app.use(
    '/api/chat/*/ws',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      ws: true,
      changeOrigin: true,
    })
  );

  // All other API endpoints
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
}; 