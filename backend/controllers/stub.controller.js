/**
 * Stub Controller for Phased Migration
 * Handles requests for features that are not yet fully migrated to production.
 * Returns graceful empty states or friendly "Coming Soon" messages.
 */

class StubController {
  /**
   * Returns an empty data array for list endpoints
   */
  async emptyCollection(req, res) {
    res.json({
      success: true,
      data: [],
      message: 'Feature coming soon in Phase 3',
      isStub: true
    });
  }

  /**
   * Returns an empty object for detail endpoints
   */
  async emptyObject(req, res) {
    res.json({
      success: true,
      data: {},
      message: 'Feature coming soon in Phase 3',
      isStub: true
    });
  }

  /**
   * Returns a 404 with a helpful message for specific unmigrated actions
   */
  async comingSoon(req, res) {
    res.status(200).json({
      success: false,
      error: 'NOT_MIGRATED',
      message: 'This specific action is scheduled for migration in a future phase.',
      phase: 3
    });
  }
}

module.exports = new StubController();
