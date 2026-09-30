const logger = require('../config/logging');

/**
 * Project Service
 * Handles business logic for project management, code generation, and milestone tracking
 * Ensures financial data is tied to project milestones
 */
class ProjectService {
  /**
   * Generate a unique project code
   * @param {string} projectType - Optional project type prefix
   * @returns {string} Generated project code
   */
  generateProjectCode(projectType = null) {
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    
    if (projectType) {
      const typePrefix = projectType.substring(0, 3).toUpperCase();
      return `PRJ-${typePrefix}-${year}-${random}`;
    }
    
    return `PRJ-${year}-${random}`;
  }

  /**
   * Validate project status transition
   * @param {string} currentStatus - Current project status
   * @param {string} newStatus - Desired new status
   * @returns {boolean} True if transition is valid
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'planning': ['active', 'cancelled'],
      'active': ['on_hold', 'completed', 'cancelled'],
      'on_hold': ['active', 'cancelled'],
      'completed': ['archived'],
      'cancelled': ['archived'],
      'archived': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Calculate project progress based on milestones
   * @param {Array} milestones - Array of milestone objects
   * @returns {Object} Progress information
   */
  calculateProgress(milestones) {
    if (!milestones || milestones.length === 0) {
      return { percentage: 0, completed: 0, total: 0, on_track: true };
    }

    const completed = milestones.filter(m => m.status === 'completed').length;
    const total = milestones.length;
    const percentage = Math.round((completed / total) * 100);

    // Check if project is on track based on dates
    const now = new Date();
    const overdueMilestones = milestones.filter(m => 
      m.status !== 'completed' && new Date(m.due_date) < now
    ).length;

    return {
      percentage,
      completed,
      total,
      on_track: overdueMilestones === 0,
      overdue_count: overdueMilestones
    };
  }

  /**
   * Calculate financial status based on contributions vs target
   * @param {number} targetAmount - Target amount for the project
   * @param {number} currentAmount - Current contributions
   * @returns {Object} Financial status information
   */
  calculateFinancialStatus(targetAmount, currentAmount) {
    const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    
    let status = 'on_track';
    if (percentage >= 100) {
      status = 'fully_funded';
    } else if (percentage >= 75) {
      status = 'well_funded';
    } else if (percentage >= 50) {
      status = 'moderately_funded';
    } else if (percentage >= 25) {
      status = 'under_funded';
    } else {
      status = 'poorly_funded';
    }

    return {
      target_amount: targetAmount,
      current_amount: currentAmount,
      remaining_amount: Math.max(0, targetAmount - currentAmount),
      percentage: Math.round(percentage),
      status
    };
  }

  /**
   * Validate milestone status transition
   * @param {string} currentStatus - Current milestone status
   * @param {string} newStatus - Desired new status
   * @param {Date} dueDate - Milestone due date
   * @returns {Object} Validation result
   */
  validateMilestoneTransition(currentStatus, newStatus, dueDate = null) {
    const validTransitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'on_hold', 'cancelled'],
      'on_hold': ['in_progress', 'cancelled'],
      'completed': [], // Completed is final
      'cancelled': []  // Cancelled is final
    };

    const isValid = validTransitions[currentStatus]?.includes(newStatus) || false;
    
    if (!isValid) {
      return {
        valid: false,
        reason: `Cannot transition from ${currentStatus} to ${newStatus}`
      };
    }

    // Check if milestone is overdue before marking as completed
    if (newStatus === 'completed' && dueDate) {
      const now = new Date();
      const due = new Date(dueDate);
      if (due < now) {
        return {
          valid: true,
          warning: 'Milestone was completed after due date'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get project summary with calculated values
   * @param {Object} project - Project object
   * @param {Array} milestones - Project milestones
   * @param {Array} contributions - Project contributions
   * @returns {Object} Enhanced project summary
   */
  getProjectSummary(project, milestones = [], contributions = []) {
    const progress = this.calculateProgress(milestones);
    const financial = this.calculateFinancialStatus(
      parseFloat(project.target_amount || 0),
      parseFloat(project.current_amount || 0)
    );

    return {
      ...project,
      progress,
      financial,
      health_score: this.calculateHealthScore(progress, financial)
    };
  }

  /**
   * Calculate overall project health score (0-100)
   * @param {Object} progress - Progress information
   * @param {Object} financial - Financial status
   * @returns {number} Health score
   */
  calculateHealthScore(progress, financial) {
    let score = 100;

    // Deduct for overdue milestones
    if (!progress.on_track) {
      score -= (progress.overdue_count * 10);
    }

    // Deduct for poor funding
    if (financial.status === 'poorly_funded') {
      score -= 30;
    } else if (financial.status === 'under_funded') {
      score -= 15;
    }

    // Add bonus for good funding
    if (financial.status === 'well_funded') {
      score += 5;
    } else if (financial.status === 'fully_funded') {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if project can be archived
   * @param {Object} project - Project object
   * @param {Array} milestones - Project milestones
   * @returns {boolean} True if can be archived
   */
  canArchiveProject(project, milestones = []) {
    // Project must be completed or cancelled
    if (project.status !== 'completed' && project.status !== 'cancelled') {
      return false;
    }

    // All milestones should be completed or cancelled
    const pendingMilestones = milestones.filter(m => 
      m.status === 'pending' || m.status === 'in_progress'
    );
    
    return pendingMilestones.length === 0;
  }

  /**
   * Get recommended priority based on project characteristics
   * @param {Object} project - Project object
   * @returns {string} Recommended priority
   */
  getRecommendedPriority(project) {
    const targetAmount = parseFloat(project.target_amount || 0);
    const now = new Date();
    const startDate = project.start_date ? new Date(project.start_date) : now;
    const endDate = project.end_date ? new Date(project.end_date) : null;

    // High value projects get higher priority
    if (targetAmount > 100000) {
      return 'critical';
    }

    // Time-sensitive projects get higher priority
    if (endDate && (endDate - now) < (30 * 24 * 60 * 60 * 1000)) {
      return 'high';
    }

    // Recently started projects get medium priority
    if ((now - startDate) < (90 * 24 * 60 * 60 * 1000)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Validate project data before creation/update
   * @param {Object} projectData - Project data to validate
   * @returns {Object} Validation result
   */
  validateProjectData(projectData) {
    const errors = [];

    // Validate dates
    if (projectData.start_date && projectData.end_date) {
      const start = new Date(projectData.start_date);
      const end = new Date(projectData.end_date);
      if (end <= start) {
        errors.push('End date must be after start date');
      }
    }

    // Validate amounts
    if (projectData.target_amount && projectData.target_amount < 0) {
      errors.push('Target amount cannot be negative');
    }

    if (projectData.current_amount && projectData.current_amount < 0) {
      errors.push('Current amount cannot be negative');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (projectData.priority && !validPriorities.includes(projectData.priority)) {
      errors.push('Priority must be one of: low, medium, high, critical');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ProjectService();