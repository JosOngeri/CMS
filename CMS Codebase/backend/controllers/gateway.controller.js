const BaseController = require('./BaseController');
const gatewayRepository = require('../repositories/GatewayRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Gateway Controller (Phase 9)
 * Handles JOSms Android Device registration and health status
 */
class GatewayController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('GatewayController');
  }

  async registerDevice(req, res) {
    const { deviceId, model, batteryLevel, signalStrength } = req.body;
    const churchId = req.user.church_id;

    try {
      await gatewayRepository.registerDevice({
        deviceId, churchId, model, batteryLevel, signalStrength
      });

      this.success(res, null, 'Device registered successfully');
    } catch (error) {
      this.logger.error('registerDevice', error);
      this.error(res, error.message);
    }
  }

  async getStatus(req, res) {
    const churchId = req.user.church_id;
    try {
      const result = await gatewayRepository.getStatus(churchId);
      this.success(res, result, 'Gateway status retrieved successfully');
    } catch (error) {
      this.logger.error('getStatus', error);
      this.error(res, error.message);
    }
  }
}

module.exports = new GatewayController();
