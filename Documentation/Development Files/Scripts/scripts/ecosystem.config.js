module.exports = {
  apps : [{
    name: 'kmaincms-backend',
    script: 'server.js',
    cwd: './backend',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    }
  }, {
    name: 'kmaincms-frontend',
    script: 'node',
    args: '../node_modules/vite/dist/node/cli.js --port 5180 --host 0.0.0.0',
    cwd: './frontend',
    env: {
      NODE_ENV: 'development',
      NODE_PATH: 'D:/VIbeCode/KMainCMS/node_modules'
    }
  }]
};
