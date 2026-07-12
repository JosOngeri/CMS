const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const smsAutomationRepository = require('../repositories/SmsAutomationRepository');
const SmsAutomationService = require('../services/SmsAutomationService');

/**
 * SMS Automation Controller
 * Handles SMS automation rules and execution
 */
class SmsAutomationController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SmsAutomationController');
  }

  /**
   * Get all SMS automation rules
   */
  async getAllAutomationRules(req, res) {
    try {
      const { is_active, trigger_module } = req.query;

      const result = await smsAutomationRepository.getAllAutomationRules({ is_active, trigger_module });

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('getAllAutomationRules', error);
      this.error(res, 'Failed to fetch automation rules');
    }
  }

  /**
   * Get automation rule by ID
   */
  async getAutomationRuleById(req, res) {
    try {
      const { id } = req.params;

      const result = await smsAutomationRepository.getAutomationRuleById(id);

      if (!result) {
        return this.notFound(res, 'Automation rule not found');
      }

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('getAutomationRuleById', error);
      this.error(res, 'Failed to fetch automation rule');
    }
  }

  /**
   * Create new SMS automation rule
   */
  async createAutomationRule(req, res) {
    try {
      const { name, trigger_module, trigger_event, template_id, conditions, is_active } = req.body;

      const result = await smsAutomationRepository.createAutomationRule({
        name, trigger_module, trigger_event, template_id, conditions, is_active, created_by: req.user.id
      });

      this.created(res, { data: result });
    } catch (error) {
      this.logger.error('createAutomationRule', error);
      this.error(res, 'Failed to create automation rule');
    }
  }

  /**
   * Update SMS automation rule
   */
  async updateAutomationRule(req, res) {
    try {
      const { id } = req.params;
      const { name, trigger_module, trigger_event, template_id, conditions, is_active } = req.body;

      const result = await smsAutomationRepository.updateAutomationRule(id, {
        name, trigger_module, trigger_event, template_id, conditions, is_active
      });

      if (!result) {
        return this.notFound(res, 'Automation rule not found');
      }

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('updateAutomationRule', error);
      this.error(res, 'Failed to update automation rule');
    }
  }

  /**
   * Delete SMS automation rule
   */
  async deleteAutomationRule(req, res) {
    try {
      const { id } = req.params;

      const result = await smsAutomationRepository.deleteAutomationRule(id);

      if (!result) {
        return this.notFound(res, 'Automation rule not found');
      }

      this.success(res, { message: 'Automation rule deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAutomationRule', error);
      this.error(res, 'Failed to delete automation rule');
    }
  }

  /**
   * Test automation rule
   */
  async testAutomationRule(req, res) {
    try {
      const { id } = req.params;
      const { test_data } = req.body;

      const rule = await smsAutomationRepository.getAutomationRuleByIdSimple(id);

      if (!rule) {
        return this.notFound(res, 'Automation rule not found');
      }

      const conditionsMatch = SmsAutomationService.evaluateConditions(rule.conditions, test_data);

      let template = null;
      if (conditionsMatch && rule.template_id) {
        template = await smsAutomationRepository.getTemplateById(rule.template_id);
      }

      this.success(res, {
        data: {
          rule_id: rule.id,
          rule_name: rule.name,
          conditions_match: conditionsMatch,
          template: template,
          would_send: conditionsMatch && template !== null
        }
      });
    } catch (error) {
      this.logger.error('testAutomationRule', error);
      this.error(res, 'Failed to test automation rule');
    }
  }

  /**
   * Trigger automation rules for a specific event
   */
  async triggerAutomation(req, res) {
    try {
      const { module, event, data } = req.body;

      const rules = await smsAutomationRepository.getMatchingAutomationRules(module, event);

      const triggeredRules = [];

      for (const rule of rules) {
        const conditionsMatch = SmsAutomationService.evaluateConditions(rule.conditions, data);

        if (conditionsMatch && rule.template_id) {
          const template = await smsAutomationRepository.getTemplateById(rule.template_id);

          if (template) {
            const processedRule = SmsAutomationService.processRuleForTrigger(rule, data, template);
            if (processedRule) {
              triggeredRules.push(processedRule);
            }
          }
        }
      }

      this.success(res, {
        data: {
          module,
          event,
          triggered_rules: triggeredRules,
          total_triggered: triggeredRules.length
        }
      });
    } catch (error) {
      this.logger.error('triggerAutomation', error);
      this.error(res, 'Failed to trigger automation');
    }
  }
}

module.exports = new SmsAutomationController();
