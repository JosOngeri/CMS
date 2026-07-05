const { pool } = require('../config/database');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('workflowEngine');

class WorkflowExecutionEngine {
  async executeWorkflow(workflowId, entityId, entityType, initiatorId) {
    try {
      // Fetch workflow definition
      const workflowResult = await pool.query(
        `SELECT * FROM approval_workflows WHERE id = $1 AND is_active = true`,
        [workflowId]
      );

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found or inactive');
      }

      const workflow = workflowResult.rows[0];
      const steps = workflow.steps;

      // Create approval request
      const approvalResult = await pool.query(
        `INSERT INTO approval_requests (title, description, type, status, priority, requester_id, entity_type, entity_id, workflow_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          workflow.name,
          workflow.description,
          entityType,
          'pending',
          'medium',
          initiatorId,
          entityType,
          entityId,
          workflowId
        ]
      );

      const approvalId = approvalResult.rows[0].id;

      // Initialize workflow execution
      await this.initializeExecution(approvalId, steps, initiatorId);

      return { success: true, approvalId, currentStep: 0 };
    } catch (error) {
      logger.error('executeWorkflow', error);
      throw error;
    }
  }

  async initializeExecution(approvalId, steps, initiatorId) {
    try {
      // Get first step
      const firstStep = steps[0];

      // Assign to first approver(s)
      if (firstStep.approvers && firstStep.approvers.length > 0) {
        for (const approverId of firstStep.approvers) {
          await pool.query(
            `INSERT INTO workflow_assignments (approval_id, step_index, approver_id, status, assigned_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [approvalId, 0, approverId, 'pending']
          );
        }
      }

      // Log workflow start
      await pool.query(
        `INSERT INTO approval_history (approval_id, user_id, action, comment, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [approvalId, initiatorId, 'workflow_started', 'Workflow execution initiated']
      );
    } catch (error) {
      logger.error('initializeExecution', error);
      throw error;
    }
  }

  async processStep(approvalId, stepIndex, approverId, action, comment) {
    try {
      // Get workflow and current step
      const approvalResult = await pool.query(
        `SELECT ar.*, aw.steps FROM approval_requests ar
         JOIN approval_workflows aw ON ar.workflow_id = aw.id
         WHERE ar.id = $1`,
        [approvalId]
      );

      if (approvalResult.rows.length === 0) {
        throw new Error('Approval not found');
      }

      const approval = approvalResult.rows[0];
      const steps = approval.steps;
      const currentStep = steps[stepIndex];

      // Check if all required approvers have approved
      const requiredApprovals = currentStep.required_approvals || 1;
      const currentApprovals = await pool.query(
        `SELECT COUNT(*) as count FROM workflow_assignments
         WHERE approval_id = $1 AND step_index = $2 AND status = 'approved'`,
        [approvalId, stepIndex]
      );

      const approvalCount = parseInt(currentApprovals.rows[0].count);

      if (action === 'approve') {
        // Record approval
        await pool.query(
          `UPDATE workflow_assignments 
           SET status = 'approved', approved_at = CURRENT_TIMESTAMP, comment = $1
           WHERE approval_id = $2 AND step_index = $3 AND approver_id = $4`,
          [comment, approvalId, stepIndex, approverId]
        );

        // Check if step is complete
        if (approvalCount + 1 >= requiredApprovals) {
          await this.completeStep(approvalId, stepIndex, steps, approverId);
        }
      } else if (action === 'reject') {
        // Reject workflow
        await this.rejectWorkflow(approvalId, approverId, comment);
      } else if (action === 'delegate') {
        // Delegate to next approver
        await this.delegateApproval(approvalId, stepIndex, approverId, comment);
      }

      return { success: true };
    } catch (error) {
      logger.error('processStep', error);
      throw error;
    }
  }

  async completeStep(approvalId, stepIndex, steps, approverId) {
    try {
      // Check if there are more steps
      if (stepIndex < steps.length - 1) {
        // Move to next step
        const nextStep = steps[stepIndex + 1];

        // Assign to next approver(s)
        if (nextStep.approvers && nextStep.approvers.length > 0) {
          for (const approverId of nextStep.approvers) {
            await pool.query(
              `INSERT INTO workflow_assignments (approval_id, step_index, approver_id, status, assigned_at)
               VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
              [approvalId, stepIndex + 1, approverId, 'pending']
            );
          }
        }

        // Log step completion
        await pool.query(
          `INSERT INTO approval_history (approval_id, user_id, action, comment, created_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [approvalId, approverId, 'step_completed', `Step ${stepIndex} completed, moving to step ${stepIndex + 1}`]
        );
      } else {
        // Workflow complete - approve the request
        await this.approveWorkflow(approvalId, approverId);
      }
    } catch (error) {
      logger.error('completeStep', error);
      throw error;
    }
  }

  async approveWorkflow(approvalId, approverId) {
    try {
      await pool.query(
        `UPDATE approval_requests 
         SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [approverId, approvalId]
      );

      await pool.query(
        `INSERT INTO approval_history (approval_id, user_id, action, comment, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [approvalId, approverId, 'workflow_completed', 'Workflow execution completed successfully']
      );
    } catch (error) {
      logger.error('approveWorkflow', error);
      throw error;
    }
  }

  async rejectWorkflow(approvalId, approverId, comment) {
    try {
      await pool.query(
        `UPDATE approval_requests 
         SET status = 'rejected', rejected_by = $1, rejected_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [approverId, approvalId]
      );

      await pool.query(
        `INSERT INTO approval_history (approval_id, user_id, action, comment, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [approvalId, approverId, 'workflow_rejected', comment || 'Workflow rejected']
      );
    } catch (error) {
      logger.error('rejectWorkflow', error);
      throw error;
    }
  }

  async delegateApproval(approvalId, stepIndex, approverId, delegateToId) {
    try {
      await pool.query(
        `UPDATE workflow_assignments 
         SET status = 'delegated', delegated_to = $1, delegated_at = CURRENT_TIMESTAMP
         WHERE approval_id = $2 AND step_index = $3 AND approver_id = $4`,
        [delegateToId, approvalId, stepIndex, approverId]
      );

      // Add new assignment for delegate
      await pool.query(
        `INSERT INTO workflow_assignments (approval_id, step_index, approver_id, status, assigned_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [approvalId, stepIndex, delegateToId, 'pending']
      );

      await pool.query(
        `INSERT INTO approval_history (approval_id, user_id, action, comment, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [approvalId, approverId, 'delegated', `Delegated to user ${delegateToId}`]
      );
    } catch (error) {
      logger.error('delegateApproval', error);
      throw error;
    }
  }

  async getWorkflowStatus(approvalId) {
    try {
      const result = await pool.query(
        `SELECT 
          ar.*,
          aw.steps,
          (SELECT COUNT(*) FROM workflow_assignments WHERE approval_id = ar.id AND status = 'approved') as total_approvals,
          (SELECT COUNT(*) FROM workflow_assignments WHERE approval_id = ar.id AND status = 'pending') as pending_approvals
         FROM approval_requests ar
         JOIN approval_workflows aw ON ar.workflow_id = aw.id
         WHERE ar.id = $1`,
        [approvalId]
      );

      if (result.rows.length === 0) {
        throw new Error('Approval not found');
      }

      const approval = result.rows[0];
      const steps = approval.steps;
      const currentStepIndex = this.getCurrentStepIndex(approval, steps);

      return {
        success: true,
        approval: {
          ...approval,
          currentStep: currentStepIndex,
          totalSteps: steps.length,
          progress: ((currentStepIndex + 1) / steps.length) * 100
        }
      };
    } catch (error) {
      logger.error('getWorkflowStatus', error);
      throw error;
    }
  }

  getCurrentStepIndex(approval, steps) {
    // Determine current step based on approvals
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const requiredApprovals = step.required_approvals || 1;
      
      // Check if this step is complete
      const stepApprovals = approval.total_approvals || 0;
      if (stepApprovals < requiredApprovals) {
        return i;
      }
    }
    return steps.length - 1; // Last step
  }
}

module.exports = new WorkflowExecutionEngine();
