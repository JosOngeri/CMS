const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all projects
router.get('/', projectsController.getAllProjects);

// Get project by ID
router.get('/:id', projectsController.getProjectById);

// Create project
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.createProject);

// Update project
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.updateProject);

// Delete project
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), projectsController.deleteProject);

// Project milestones
router.get('/:id/milestones', projectsController.getProjectMilestones);
router.post('/:id/milestones', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.createMilestone);
router.put('/:id/milestones/:milestoneId', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.updateMilestone);
router.delete('/:id/milestones/:milestoneId', requireRole(['Super Admin', 'Pastor']), projectsController.deleteMilestone);

// Project contributions
router.get('/:id/contributions', projectsController.getProjectContributions);
router.post('/:id/contributions', projectsController.addContribution);

// Project analytics
router.get('/:id/analytics', projectsController.getProjectAnalytics);

// Project status
router.put('/:id/status', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), projectsController.updateProjectStatus);

module.exports = router;
