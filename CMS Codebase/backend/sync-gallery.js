const axios = require('axios');

async function syncGallery() {
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5005/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Logged in successfully');
    
    // Call sync endpoint
    const syncResponse = await axios.post('http://localhost:5005/api/gallery/sync', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Sync result:', syncResponse.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

syncGallery();
