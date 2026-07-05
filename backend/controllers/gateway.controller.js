const BaseController = require('./BaseController');
const gatewayRepository = require('../repositories/GatewayRepository');

/**
 * Gateway Controller (Phase 9)
 * Handles JOSms Android Device registration and health status
 */
class GatewayController extends BaseController {

  async registerDevice(req, res) {
    const { deviceId, model, batteryLevel, signalStrength } = req.body;
    const churchId = req.user.church_id;

    try {
      await gatewayRepository.registerDevice({
        deviceId, churchId, model, batteryLevel, signalStrength
      });

      res.json({ success: true, message: 'Device registered' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStatus(req, res) {
    const churchId = req.user.church_id;
    try {
      const result = await gatewayRepository.getStatus(churchId);
      res.json({ success: true, gateways: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new GatewayController();
