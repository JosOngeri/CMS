/**
 * Integration Tests for Document Approval API Endpoints
 */

const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

describe('Document Approval API Integration Tests', () => {
  let authToken;
  let testDocumentId;
  let testApprovalId;

  beforeAll(async () => {
    // Setup: Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@kmaincms.test',
        password: 'TestPassword123!'
      });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.accessToken;
    }

    // Create a test document
    const docResponse = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Document for Approval',
        content: 'Test content',
        document_type: 'policy',
        department_id: 1
      });

    if (docResponse.body.success) {
      testDocumentId = docResponse.body.data.id;
    }
  });

  describe('POST /api/document-approval/request', () => {
    it('should create approval request', async () => {
      const approvalData = {
        document_id: testDocumentId,
        approval_level: 'standard',
        requested_by: 'user-1',
        approvers: ['user-2', 'user-3']
      };

      const response = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(approvalData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'pending');

      if (response.body.data.id) {
        testApprovalId = response.body.data.id;
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ document_id: testDocumentId }); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should check if document exists', async () => {
      const response = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          document_id: 99999,
          approval_level: 'standard',
          approvers: ['user-2']
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/document-approval/:id/approve', () => {
    it('should approve document', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${testApprovalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-2',
          comments: 'Approved for publication'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status');
    });

    it('should require approver comments for critical level', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${testApprovalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-2'
          // Missing comments
        });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate approvals', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${testApprovalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-2',
          comments: 'Trying to approve again'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already approved');
    });
  });

  describe('POST /api/document-approval/:id/reject', () => {
    it('should reject document', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${testApprovalId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-3',
          reason: 'Needs revision'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'rejected');
    });

    it('should require rejection reason', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${testApprovalId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-3'
          // Missing reason
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/document-approval/:id', () => {
    it('should get approval request details', async () => {
      const response = await request(app)
        .get(`/api/document-approval/${testApprovalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('document_id');
      expect(response.body.data).toHaveProperty('approval_history');
    });

    it('should return 404 for non-existent approval', async () => {
      const response = await request(app)
        .get('/api/document-approval/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/document-approval/pending', () => {
    it('should get pending approvals for user', async () => {
      const response = await request(app)
        .get('/api/document-approval/pending?user_id=user-2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by department', async () => {
      const response = await request(app)
        .get('/api/document-approval/pending?department_id=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/document-approval/history/:documentId', () => {
    it('should get approval history for document', async () => {
      const response = await request(app)
        .get(`/api/document-approval/history/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Multi-level approval workflow', () => {
    it('should handle basic level approval (single approver)', async () => {
      const approvalData = {
        document_id: testDocumentId,
        approval_level: 'basic',
        approvers: ['user-4']
      };

      const createResponse = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(approvalData);

      const approvalId = createResponse.body.data.id;

      const approveResponse = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-4',
          comments: 'Approved'
        });

      expect(approveResponse.body.data.status).toBe('approved');
    });

    it('should require all approvers for standard level', async () => {
      const approvalData = {
        document_id: testDocumentId,
        approval_level: 'standard',
        approvers: ['user-5', 'user-6']
      };

      const createResponse = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(approvalData);

      const approvalId = createResponse.body.data.id;

      // First approval
      await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-5',
          comments: 'First approval'
        });

      // Check status - should still be pending
      const statusResponse = await request(app)
        .get(`/api/document-approval/${approvalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.body.data.status).toBe('pending');

      // Second approval
      const finalResponse = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'user-6',
          comments: 'Second approval'
        });

      expect(finalResponse.body.data.status).toBe('approved');
    });
  });
});
