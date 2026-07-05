const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const smsAutomationRepository = require('../repositories/SmsAutomationRepository');

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

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAllAutomationRules', error);
      res.status(500).json({ success: false, error: 'Failed to fetch automation rules' });
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
        return res.status(404).json({ success: false, error: 'Automation rule not found' });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAutomationRuleById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch automation rule' });
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

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('createAutomationRule', error);
      res.status(500).json({ success: false, error: 'Failed to create automation rule' });
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
        return res.status(404).json({ success: false, error: 'Automation rule not found' });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('updateAutomationRule', error);
      res.status(500).json({ success: false, error: 'Failed to update automation rule' });
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
        return res.status(404).json({ success: false, error: 'Automation rule not found' });
      }

      res.json({ success: true, message: 'Automation rule deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAutomationRule', error);
      res.status(500).json({ success: false, error: 'Failed to delete automation rule' });
    }
  }

  /**
   * Test automation rule
   */
  async testAutomationRule(req, res) {
    try {
      const { id } = req.params;
      const { test_data } = req.body;

      // Get the automation rule
      const rule = await smsAutomationRepository.getAutomationRuleByIdSimple(id);

      if (!rule) {
        return res.status(404).json({ success: false, error: 'Automation rule not found' });
      }

      // Check if conditions match
      let conditionsMatch = true;
      if (rule.conditions && Object.keys(rule.conditions).length > 0) {
        conditionsMatch = this.evaluateConditions(rule.conditions, test_data);
      }

      // Get template if conditions match
      let template = null;
      if (conditionsMatch && rule.template_id) {
        template = await smsAutomationRepository.getTemplateById(rule.template_id);
      }

      res.json({
        success: true,
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
      res.status(500).json({ success: false, error: 'Failed to test automation rule' });
    }
  }

  /**
   * Trigger automation rules for a specific event
   */
  async triggerAutomation(req, res) {
    try {
      const { module, event, data } = req.body;

      // Get matching automation rules
      const rules = await smsAutomationRepository.getMatchingAutomationRules(module, event);

      const triggeredRules = [];

      for (const rule of rules) {
        // Check if conditions match
        let conditionsMatch = true;
        if (rule.conditions && Object.keys(rule.conditions).length > 0) {
          conditionsMatch = this.evaluateConditions(rule.conditions, data);
        }

        if (conditionsMatch && rule.template_id) {
          // Get template
          const template = await smsAutomationRepository.getTemplateById(rule.template_id);

          if (template) {
            // Replace variables in template
            let message = template.content;
            if (template.variables && Array.isArray(template.variables)) {
              template.variables.forEach(variable => {
                const regex = new RegExp(`{${variable}}`, 'g');
                message = message.replace(regex, data[variable] || '');
              });
            }

            triggeredRules.push({
              rule_id: rule.id,
              rule_name: rule.name,
              template_id: template.id,
              template_name: template.name,
              message: message
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          module,
          event,
          triggered_rules: triggeredRules,
          total_triggered: triggeredRules.length
        }
      });
    } catch (error) {
      this.logger.error('triggerAutomation', error);
      res.status(500).json({ success: false, error: 'Failed to trigger automation' });
    }
  }

  /**
   * Evaluate conditions against data
   */
  evaluateConditions(conditions, data) {
    for (const key in conditions) {
      const expectedValue = conditions[key];
      const actualValue = data[key];

      // Handle different comparison types
      if (typeof expectedValue === 'object') {
        if (expectedValue.min !== undefined && actualValue < expectedValue.min) {
          return false;
        }
        if (expectedValue.max !== undefined && actualValue > expectedValue.max) {
          return false;
        }
        if (expectedValue.equals !== undefined && actualValue !== expectedValue.equals) {
          return false;
        }
      } else {
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }
    return true;
  }
}

module.exports = new SmsAutomationController();
