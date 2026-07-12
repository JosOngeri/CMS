/**
 * SMS Automation Service
 * Handles SMS automation condition evaluation and template processing
 */
class SmsAutomationService {
  /**
   * Evaluate conditions against data
   * @param {Object} conditions - Conditions to evaluate
   * @param {Object} data - Data to check against
   * @returns {boolean} True if all conditions match
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

  /**
   * Replace variables in template message
   * @param {string} message - Template message
   * @param {Array} variables - Variables to replace
   * @param {Object} data - Data for variable replacement
   * @returns {string} Processed message
   */
  replaceTemplateVariables(message, variables, data) {
    if (!variables || !Array.isArray(variables)) {
      return message;
    }

    let processedMessage = message;
    variables.forEach(variable => {
      const regex = new RegExp(`{${variable}}`, 'g');
      processedMessage = processedMessage.replace(regex, data[variable] || '');
    });

    return processedMessage;
  }

  /**
   * Process automation rule for triggering
   * @param {Object} rule - Automation rule
   * @param {Object} data - Event data
   * @param {Object} template - Template object
   * @returns {Object} Triggered rule data
   */
  processRuleForTrigger(rule, data, template) {
    if (!template) {
      return null;
    }

    const message = this.replaceTemplateVariables(template.content, template.variables, data);

    return {
      rule_id: rule.id,
      rule_name: rule.name,
      template_id: template.id,
      template_name: template.name,
      message: message
    };
  }
}

module.exports = new SmsAutomationService();
