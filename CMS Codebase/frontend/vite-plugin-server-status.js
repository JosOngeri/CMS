import axios from 'axios';

export default function serverStatusPlugin() {
  return {
    name: 'server-status-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/__server_status') {
          try {
            const response = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              status: response.data.status,
              environment: response.data.environment,
              database: response.data.database
            }));
          } catch (error) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: error.message
            }));
          }
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/__server_status') {
          try {
            const response = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              status: response.data.status,
              environment: response.data.environment,
              database: response.data.database
            }));
          } catch (error) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: error.message
            }));
          }
        } else {
          next();
        }
      });
    }
  };
}
