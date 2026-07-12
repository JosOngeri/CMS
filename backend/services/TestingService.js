/**
 * Testing Service
 * Handles test output parsing and test execution logic
 */
class TestingService {
  /**
   * Parse test output to extract pass/fail counts
   * @param {string} output - Test output string
   * @returns {Object} Parsed test results
   */
  parseTestOutput(output) {
    // Default values if parsing fails
    let passed = 0;
    let failed = 0;
    let total = 0;

    if (!output) {
      return { passed, failed, total };
    }

    // Try to parse Jest output format
    const jestMatch = output.match(/(\d+) passed, (\d+) failed/);
    if (jestMatch) {
      passed = parseInt(jestMatch[1]) || 0;
      failed = parseInt(jestMatch[2]) || 0;
      total = passed + failed;
    }

    // Try to parse other common formats
    if (total === 0) {
      const totalMatch = output.match(/Tests:\s+(\d+)\s+passed/);
      if (totalMatch) {
        passed = parseInt(totalMatch[1]) || 0;
        total = passed;
      }
    }

    return { passed, failed, total };
  }

  /**
   * Get test command based on test type
   * @param {string} type - Test type (unit/integration/e2e)
   * @returns {string} NPM command
   */
  getTestCommand(type) {
    const commands = {
      unit: 'npm test -- --coverage --watchAll=false',
      integration: 'npm run test:integration',
      e2e: 'npm run test:e2e'
    };

    return commands[type] || null;
  }

  /**
   * Validate test type
   * @param {string} type - Test type to validate
   * @returns {boolean} True if valid
   */
  isValidTestType(type) {
    return ['unit', 'integration', 'e2e'].includes(type);
  }
}

module.exports = new TestingService();
