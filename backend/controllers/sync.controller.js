const BaseController = require('./BaseController');
const syncRepository = require('../repositories/SyncRepository');

/**
 * Sync Controller (Phase 13)
 * Handles Delta-Sync for offline-first mobile applications
 */
class SyncController extends BaseController {

  async getDelta(req, res) {
    const { lastSyncedAt, wave } = req.body;
    const churchId = req.user.church_id;
    const since = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

    try {
      // Phase 13: 3-Tier Sync Strategy
      let tables = [];
      if (wave === 1) {
        tables = ['users', 'churches', 'department_features'];
      } else if (wave === 2) {
        tables = ['members', 'announcements', 'events'];
      } else {
        tables = ['payments', 'chat_messages', 'gallery_photos'];
      }

      const delta = await syncRepository.getDelta(tables, churchId, since);

      res.json({
        success: true,
        delta,
        wave,
        serverTime: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SyncController();
