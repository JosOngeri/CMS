const { exec } = require('child_process');
const BaseController = require('./BaseController');
const TestingRepository = require('../repositories/TestingRepository');
const TestingService = require('../services/TestingService');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Testing Controller
 * Handles test execution and results retrieval
 */
class TestingController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('TestingController');
  }

  /**
   * Get test results
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getResults(req, res) {
    try {
      const rows = await TestingRepository.getTestResults();

      const results = {
        unit: { passed: 0, failed: 0, total: 0 },
        integration: { passed: 0, failed: 0, total: 0 },
        e2e: { passed: 0, failed: 0, total: 0 }
      };

      rows.forEach(row => {
        if (results[row.test_type]) {
          results[row.test_type].passed += row.passed;
          results[row.test_type].failed += row.failed;
          results[row.test_type].total += row.total;
        }
      });

      const lastRun = rows.length > 0 ? rows[0].run_date : null;

      this.success(res, { results, lastRun });
    } catch (error) {
      this.logger.error('getResults', error);
      this.error(res, 'Failed to fetch results');
    }
  }

  /**
   * Run tests by type
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.type - Test type (unit/integration/e2e)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async runTests(req, res) {
    const { type } = req.params;

    try {
      if (!TestingService.isValidTestType(type)) {
        return this.badRequest(res, 'Invalid test type. Must be unit, integration, or e2e');
      }

      const command = TestingService.getTestCommand(type);

      // Only allow test execution in development environment for safety
      if (process.env.NODE_ENV === 'production') {
        return this.forbidden(res, 'Test execution is disabled in production');
      }

      // Execute the test command
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('runTests', error);
          // Parse output to extract test results even if there was an error
          const parsed = TestingService.parseTestOutput(stdout);

          TestingRepository.createTestResult({
            test_type: type,
            passed: parsed.passed,
            failed: parsed.failed,
            total: parsed.total
          }).catch(err => this.logger.error('createTestResult', err));

          return this.success(res, {
            results: { [type]: parsed },
            output: stdout,
            error: stderr
          });
        }

        // Parse the output to extract test results
        const parsed = TestingService.parseTestOutput(stdout);

        TestingRepository.createTestResult({
          test_type: type,
          passed: parsed.passed,
          failed: parsed.failed,
          total: parsed.total
        }).catch(err => this.logger.error('createTestResult', err));

        this.success(res, { results: { [type]: parsed }, output: stdout });
      });
    } catch (error) {
      this.logger.error('runTests', error);
      this.error(res, 'Failed to run tests');
    }
  }
}

module.exports = new TestingController();
