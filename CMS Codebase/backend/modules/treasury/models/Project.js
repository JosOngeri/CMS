/**
 * Project Model
 * Represents a church project for expense tracking
 */

class Project {
  constructor(data = {}) {
    this.id = data.id || null;
    this.project_code = data.project_code || '';
    this.project_name = data.project_name || '';
    this.description = data.description || '';
    this.objectives = data.objectives || '';
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.budget_amount = data.budget_amount || 0;
    this.spent_amount = data.spent_amount || 0;
    this.department_id = data.department_id || null;
    this.department_name = data.department_name || null;
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.project_manager = data.project_manager || null;
    this.project_manager_name = data.project_manager_name || null;
    this.status = data.status || 'planning'; // planning, active, completed, cancelled
    this.priority = data.priority || 'medium'; // low, medium, high
    this.progress_percentage = data.progress_percentage || 0;
    this.location = data.location || '';
    this.beneficiaries = data.beneficiaries || '';
    this.expected_outcomes = data.expected_outcomes || '';
    this.created_by = data.created_by || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  validate() {
    const errors = [];

    if (!this.project_name || this.project_name.trim() === '') {
      errors.push('Project name is required');
    }

    if (this.start_date && this.end_date) {
      const start = new Date(this.start_date);
      const end = new Date(this.end_date);
      if (end < start) {
        errors.push('End date must be after start date');
      }
    }

    const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  toDatabase() {
    return {
      project_code: this.project_code,
      project_name: this.project_name,
      description: this.description,
      objectives: this.objectives,
      start_date: this.start_date,
      end_date: this.end_date,
      budget_amount: this.budget_amount,
      spent_amount: this.spent_amount,
      department_id: this.department_id,
      fund_id: this.fund_id,
      project_manager: this.project_manager,
      status: this.status,
      priority: this.priority,
      progress_percentage: this.progress_percentage,
      location: this.location,
      beneficiaries: this.beneficiaries,
      expected_outcomes: this.expected_outcomes,
      created_by: this.created_by
    };
  }

  static fromDatabase(row) {
    return new Project(row);
  }

  getRemainingBudget() {
    return Math.max(0, this.budget_amount - this.spent_amount);
  }

  isOverBudget() {
    return this.spent_amount > this.budget_amount;
  }

  getBudgetUsedPercentage() {
    if (this.budget_amount === 0) return 0;
    return Math.min(100, (this.spent_amount / this.budget_amount) * 100);
  }

  isDelayed() {
    if (this.status !== 'active') return false;
    if (!this.end_date) return false;
    return new Date() > new Date(this.end_date);
  }
}

module.exports = Project;
