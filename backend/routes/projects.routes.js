const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Projects carry treasury budgets/targets — reads are restricted to the
// finance + department-leadership set used by the write routes below.
const PROJECT_ROLES = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Department Head'];

// Get all projects
router.get('/', requireRole(PROJECT_ROLES), projectsController.getAllProjects);

// Get project by ID
router.get('/:id', requireRole(PROJECT_ROLES), projectsController.getProjectById);

// Create project
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.createProject);

// Update project
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.updateProject);

// Delete project
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), projectsController.deleteProject);

// Project milestones
router.get('/:id/milestones', requireRole(PROJECT_ROLES), projectsController.getProjectMilestones);
router.post('/:id/milestones', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.createMilestone);
router.put('/:id/milestones/:milestoneId', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.updateMilestone);
router.delete('/:id/milestones/:milestoneId', requireRole(['Super Admin', 'Pastor']), projectsController.deleteMilestone);

// Project contributions
router.get('/:id/contributions', requireRole(PROJECT_ROLES), projectsController.getProjectContributions);
router.post('/:id/contributions', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.addContribution);

// Project analytics
router.get('/:id/analytics', requireRole(PROJECT_ROLES), projectsController.getProjectAnalytics);

// Project status
router.put('/:id/status', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.updateProjectStatus);

module.exports = router;
