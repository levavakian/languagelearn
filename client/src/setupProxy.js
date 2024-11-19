const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    console.log("setting up proxy");
  // WebSocket endpoint first
  app.use(
    '/api/chat',  // Simplified path
    createProxyMiddleware({
      target: 'http://localhost:8080', // Use http instead of ws://
      changeOrigin: true,
      ws: true,
      onError: (err, req, res) => {
        console.log('Proxy1 Error:', err);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxy1 Request:', req.method, req.path);
      }
    })
  );

  // Regular HTTP endpoints
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
}; 