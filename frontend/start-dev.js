import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🌐 Starting SDA Church Kiserian Frontend...');
console.log('');
console.log('🔑 Default Admin Login Credentials:');
console.log('   Username: admin');
console.log('   Password: admin@123');
console.log('');
console.log('🌐 Frontend URL: http://localhost:5180');
console.log('📡 Backend API: http://localhost:5005');
console.log('');
console.log('👥 Other Test Users:');
console.log('   pastor / pastor@123');
console.log('   member / member@123');
console.log('');
console.log('⚡ Starting development server...');
console.log('');

// Start the Vite development server
const vite = spawn('npm', ['run', 'dev-simple'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

vite.on('error', (error) => {
  console.error('❌ Failed to start frontend:', error.message);
  process.exit(1);
});

vite.on('close', (code) => {
  console.log(`Frontend server exited with code ${code}`);
  process.exit(code);
});
