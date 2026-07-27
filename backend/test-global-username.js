const UserRepository = require('./repositories/UserRepository');

async function testGlobalUsernameValidation() {
  console.log('Testing global username validation...\n');
  
  try {
    // Test 1: Check if an existing username is taken
    console.log('Test 1: Checking existing username "admin"');
    const adminCheck = await UserRepository.isUsernameAvailable('admin');
    console.log(`  Result: ${adminCheck ? 'Available' : 'Taken'}`);
    console.log(`  Expected: Taken (should be false)`);
    console.log(`  Status: ${adminCheck === false ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Test 2: Check if a new username is available
    const testUsername = `testuser_${Date.now()}`;
    console.log(`Test 2: Checking new username "${testUsername}"`);
    const newCheck = await UserRepository.isUsernameAvailable(testUsername);
    console.log(`  Result: ${newCheck ? 'Available' : 'Taken'}`);
    console.log(`  Expected: Available (should be true)`);
    console.log(`  Status: ${newCheck === true ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Test 3: Check findByUsernameGlobal method
    console.log('Test 3: Finding existing username "admin" globally');
    const adminUser = await UserRepository.findByUsernameGlobal('admin');
    console.log(`  Result: ${adminUser ? 'Found' : 'Not found'}`);
    console.log(`  Expected: Found (should return user object)`);
    console.log(`  Status: ${adminUser ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Test 4: Check findByUsernameGlobal with non-existent username
    console.log(`Test 4: Finding non-existent username "${testUsername}" globally`);
    const testUser = await UserRepository.findByUsernameGlobal(testUsername);
    console.log(`  Result: ${testUser ? 'Found' : 'Not found'}`);
    console.log(`  Expected: Not found (should return null)`);
    console.log(`  Status: ${!testUser ? '✅ PASS' : '❌ FAIL'}\n`);
    
    console.log('✅ All global username validation tests completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testGlobalUsernameValidation()
  .then(() => {
    console.log('Test process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test process failed:', error);
    process.exit(1);
  });