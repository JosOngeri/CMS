import axios from 'axios';

async function checkServerStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 KMainCMS Frontend - Server Connection Check');
  console.log('='.repeat(60));
  
  console.log('📍 Target Server: http://localhost:5000 (via Vite proxy)');
  console.log('🔍 Checking connection...');
  
  try {
    const startTime = Date.now();
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Backend server connected successfully! (${responseTime}ms)`);
    console.log(`📊 Server Status: ${response.data.status}`);
    console.log(`🌍 Environment: ${response.data.environment}`);
    console.log(`🗄️  Database: ${response.data.database}`);
    console.log(`⏰ Server Time: ${new Date(response.data.timestamp).toLocaleString()}`);
    console.log(`💾 Memory Usage: ${response.data.memory.heapUsed} / ${response.data.memory.heapTotal}`);
    console.log('='.repeat(60) + '\n');
    return true;
  } catch (error) {
    console.log(`❌ Backend server connection failed!`);
    console.log(`🔴 Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`💡 Make sure the backend server is running on port 5000`);
      console.log(`💡 Run: cd backend && npm start`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`💡 Server connection timed out - check if backend is responsive`);
    }
    console.log('='.repeat(60) + '\n');
    return false;
  }
}

// Run the check
checkServerStatus().then(connected => {
  if (!connected) {
    console.log('⚠️  Warning: Starting frontend without backend connection');
    console.log('⚠️  Some features may not work properly\n');
  }
  // Changed to always exit 0 so frontend can start even if backend is down
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  // Still exit 0 to allow frontend to start
  process.exit(0);
});
