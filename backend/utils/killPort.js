/**
 * Kill Port Utility (Phase 7)
 * Zombie port cleanup utility to free up occupied ports
 * Used during development and deployment to prevent port conflicts
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Kill process running on specified port
 * @param {number} port - Port number to kill
 * @returns {Promise<void>}
 */
async function killPort(port) {
  try {
    // Check OS type
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Windows: Use netstat and taskkill
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(`Killed process ${pid} on port ${port}`);
          }
        }
      }
    } else {
      // Unix/Linux/Mac: Use lsof and kill
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n');
        
        for (const pid of pids) {
          if (pid) {
            await execAsync(`kill -9 ${pid}`);
            console.log(`Killed process ${pid} on port ${port}`);
          }
        }
      } catch (error) {
        // lsof may fail if no process is on the port
        if (!error.message.includes('lsof')) {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error(`Error killing port ${port}:`, error.message);
    throw error;
  }
}

/**
 * Check if port is in use
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} True if port is in use
 */
async function isPortInUse(port) {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return stdout.trim().length > 0;
    } else {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().length > 0;
    }
  } catch (error) {
    return false;
  }
}

// CLI usage
if (require.main === module) {
  const port = process.argv[2];
  
  if (!port) {
    console.error('Usage: node killPort.js <port>');
    process.exit(1);
  }

  const portNumber = parseInt(port);
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    console.error('Invalid port number. Must be between 1 and 65535.');
    process.exit(1);
  }

  (async () => {
    try {
      const inUse = await isPortInUse(portNumber);
      
      if (inUse) {
        console.log(`Port ${portNumber} is in use. Attempting to kill process...`);
        await killPort(portNumber);
        console.log(`Port ${portNumber} is now free.`);
      } else {
        console.log(`Port ${portNumber} is not in use.`);
      }
    } catch (error) {
      console.error('Failed to kill port:', error);
      process.exit(1);
    }
  })();
}

module.exports = { killPort, isPortInUse };
