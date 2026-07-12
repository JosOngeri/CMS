const http = require('http');

function testEndpoint(path, name) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ name, status: res.statusCode, data: json });
        } catch (e) {
          resolve({ name, status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject({ name, error: error.message });
    });

    req.end();
  });
}

async function runTests() {
  const endpoints = [
    { path: '/api/announcements/public', name: 'Public Announcements' },
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/gallery/categories', name: 'Gallery Categories' },
  ];

  console.log('Testing API endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      const result = await testEndpoint(endpoint.path, endpoint.name);
      console.log(`✅ ${result.name}: ${result.status}`);
      if (result.data && result.data.success === false) {
        console.log(`   Error: ${result.data.error}`);
      }
    } catch (error) {
      console.log(`❌ ${error.name}: ${error.error}`);
    }
  }

  console.log('\nAPI testing complete!');
}

runTests();