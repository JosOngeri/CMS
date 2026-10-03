/**
 * Integration Tests for Document Approval API Endpoints
 *
 * Exercises the real service contract in documentApprovalService.js:
 *   POST /api/document-approval/request      { documentId, departmentId, approvalLevel }
 *   POST /api/document-approval/:id/approve  (Super Admin/Pastor, eligible dept member)
 *   POST /api/document-approval/:id/reject
 *   GET  /api/document-approval/pending
 *   GET  /api/document-approval/:id
 *   GET  /api/document-approval/document/:documentId/history
 *
 * Approvers are derived from department membership (Leader/Chairperson/etc.),
 * not supplied in the request body.
 */

const request = require('supertest');
const { app } = require('../../server');
const { pool } = require('../../config/database');

const uniq = Date.now().toString(36);

describe('Document Approval API Integration Tests', () => {
  let adminToken;
  let memberToken;
  let approver2Token;
  let adminId;
  let approver2Id;
  let churchId;
  let deptId;
  let documentId;
  let basicRequestId;

  const addApprover = async (userId) => {
    await pool.query(
      `INSERT INTO department_members (user_id, department_id, role, status, is_active, church_id)
       SELECT $1, $2, 'Leader', 'active', true, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM department_members WHERE user_id = $1 AND department_id = $2
       )`,
      [userId, deptId, churchId]
    );
  };

  const createRequest = (level = 'basic') =>
    request(app)
      .post('/api/document-approval/request')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId, departmentId: deptId, approvalLevel: level });

  beforeAll(async () => {
    const login = (email, password) =>
      request(app).post('/api/auth/login').send({ email, password });

    const adminLogin = await login('admin@msabato.test', 'TestPassword123!');
    adminToken = adminLogin.body.data.accessToken;

    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    adminId = profile.body.data.id;
    churchId = profile.body.data.church_id;

    // A plain member files requests; a second member is an eligible approver.
    for (const name of [`requester-${uniq}@test.local`, `approver-${uniq}@test.local`]) {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: name,
          password: 'Str0ng#Falcon',
          first_name: 'IT',
          last_name: 'Tester'
        });
    }

    // Look the ids up in the DB rather than /profile — authenticateToken caches
    // the identity per userId, so the Pastor grant must land BEFORE approver2's
    // first authenticated request or the Member-only identity is cached.
    const approver2Row = await pool.query(
      `SELECT id FROM users WHERE email = $1`, [`approver-${uniq}@test.local`]
    );
    approver2Id = approver2Row.rows[0].id;

    // The approve route gates on Super Admin/Pastor — grant approver2 Pastor
    // so it can exercise the multi-approver path.
    const pastorRole = await pool.query(`SELECT id FROM roles WHERE name = 'Pastor'`);
    if (pastorRole.rows[0]) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, church_id)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
         )`,
        [approver2Id, pastorRole.rows[0].id, churchId]
      );
    }

    memberToken = (await login(`requester-${uniq}@test.local`, 'Str0ng#Falcon')).body.data.accessToken;
    approver2Token = (await login(`approver-${uniq}@test.local`, 'Str0ng#Falcon')).body.data.accessToken;

    // A department where admin + approver2 are eligible approvers ('Leader').
    const existingDept = await pool.query(
      `SELECT id FROM departments WHERE name = 'IT Approval Dept' AND church_id = $1`,
      [churchId]
    );
    if (existingDept.rows[0]) {
      deptId = existingDept.rows[0].id;
    } else {
      const deptRes = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'IT Approval Dept', description: 'document approval integration tests' });
      deptId = deptRes.body.department.id;
    }
    await addApprover(adminId);
    await addApprover(approver2Id);

    const doc = await pool.query(
      `INSERT INTO documents (name, file_name, file_path, file_size, category, uploaded_by, church_id)
       VALUES ('IT Approval Doc', 'it-approval.pdf', '/uploads/documents/it-approval.pdf', 1024, 'policies', $1, $2)
       RETURNING id`,
      [adminId, churchId]
    );
    documentId = doc.rows[0].id;
  });

  describe('POST /api/document-approval/request', () => {
    it('should create approval request', async () => {
      const response = await createRequest('basic');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'pending');
      basicRequestId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ documentId });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 when the document does not exist', async () => {
      const response = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          documentId: '00000000-0000-0000-0000-000000000000',
          departmentId: deptId,
          approvalLevel: 'standard'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/document-approval/:id/approve', () => {
    it('should return 403 for a plain Member (route requires Pastor+)', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${basicRequestId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ comments: 'Self approval attempt' });

      expect(response.status).toBe(403);
    });

    it('should not let the requester approve their own request', async () => {
      // approver2 (Pastor + dept Leader) files a request, then tries to
      // approve it — the service-level self-approval guard fires.
      const ownRes = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${approver2Token}`)
        .send({ documentId, departmentId: deptId, approvalLevel: 'basic' });
      const ownId = ownRes.body.data.id;

      const response = await request(app)
        .post(`/api/document-approval/${ownId}/approve`)
        .set('Authorization', `Bearer ${approver2Token}`)
        .send({ comments: 'Self approval attempt' });

      expect(response.status).toBe(400);
    });

    it('should approve document (basic = single approver)', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${basicRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'Approved for publication' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      const check = await request(app)
        .get(`/api/document-approval/${basicRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.body.data).toHaveProperty('status', 'approved');
    });

    it('should prevent duplicate approvals', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${basicRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'Trying to approve again' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/document-approval/:id/reject', () => {
    it('should reject document', async () => {
      const createRes = await createRequest('basic');
      const rejectId = createRes.body.data.id;

      const response = await request(app)
        .post(`/api/document-approval/${rejectId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'Needs revision' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      const check = await request(app)
        .get(`/api/document-approval/${rejectId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.body.data).toHaveProperty('status', 'rejected');
    });

    it('should refuse to reject a non-pending request', async () => {
      const response = await request(app)
        .post(`/api/document-approval/${basicRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'Too late' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/document-approval/:id', () => {
    it('should get approval request details', async () => {
      const response = await request(app)
        .get(`/api/document-approval/${basicRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('entity_id', documentId);
    });

    it('should return 404 for non-existent approval', async () => {
      const response = await request(app)
        .get('/api/document-approval/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/document-approval/pending', () => {
    it('should get pending approvals for the current user', async () => {
      const response = await request(app)
        .get('/api/document-approval/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/document-approval/document/:documentId/history', () => {
    it('should get approval history for document', async () => {
      const response = await request(app)
        .get(`/api/document-approval/document/${documentId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Multi-level approval workflow', () => {
    it('should require all approvers for standard level (2 of 2)', async () => {
      const createRes = await createRequest('standard');
      expect(createRes.status).toBe(201);
      const approvalId = createRes.body.data.id;

      // First approval — still pending (needs 2)
      const first = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'First approval' });
      expect(first.status).toBe(200);

      const midCheck = await request(app)
        .get(`/api/document-approval/${approvalId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(midCheck.body.data.status).toBe('pending');

      // Second approval — reaches quorum
      const second = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${approver2Token}`)
        .send({ comments: 'Second approval' });
      expect(second.status).toBe(200);

      const finalCheck = await request(app)
        .get(`/api/document-approval/${approvalId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(finalCheck.body.data.status).toBe('approved');
    });
  });
});
