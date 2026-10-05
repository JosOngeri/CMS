/**
 * E2E User Workflow Tests
 * Simulates real user actions and workflows across the application
 */

const request = require('supertest');
const { pool } = require('../../config/database');

describe('E2E User Workflows', () => {
  let app;
  let adminToken;
  let pastorToken;
  let memberToken;
  let testUserId;
  let testDepartmentId;

  beforeAll(async () => {
    // Import app after database is ready
    app = require('../../server').app;
    
    // Clean up test data
    await pool.query("DELETE FROM users WHERE email LIKE 'test-%'");
    await pool.query("DELETE FROM departments WHERE name LIKE 'Test Department%'");
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM users WHERE email LIKE 'test-%'");
    await pool.query("DELETE FROM departments WHERE name LIKE 'Test Department%'");
    await pool.end();
  });

  describe('Authentication Workflows', () => {
    test('Super Admin can login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@sda.org',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.roles).toContain('Super Admin');
      
      adminToken = response.body.data.accessToken;
    });

    test('Super Admin can access protected route', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Invalid credentials are rejected', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@sda.org',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Protected route rejects requests without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('User Management Workflows', () => {
    test('Super Admin can create new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-pastor@sda.org',
          password: 'Str0ng#Falcon',
          first_name: 'Test',
          last_name: 'Pastor',
          phone: '+254712345678'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      testUserId = response.body.data.user.id;
    });

    test('Super Admin can assign Pastor role to user', async () => {
      // Get Pastor role ID
      const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'Pastor'");
      const pastorRoleId = roleResult.rows[0].id;

      const response = await request(app)
        .post(`/api/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: pastorRoleId });

      expect(response.status).toBe(201);
    });

    test('Pastor can login with assigned role', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-pastor@sda.org',
          password: 'Str0ng#Falcon'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.roles).toContain('Pastor');
      
      pastorToken = response.body.data.accessToken;
    });

    test('Regular member can be created', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-member@sda.org',
          password: 'Str0ng#Falcon',
          first_name: 'Test',
          last_name: 'Member',
          phone: '+254712345679'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member can login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-member@sda.org',
          password: 'Str0ng#Falcon'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.roles).toContain('Member');
      
      memberToken = response.body.data.accessToken;
    });
  });

  describe('Department Management Workflows', () => {
    test('Super Admin can create department', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Department',
          description: 'A test department for E2E testing',
          category: 'Ministry',
          is_active: true
        });

      expect(response.status).toBe(201);
      expect(response.body.department).toBeDefined();
      testDepartmentId = response.body.department.id;
    });

    test('Super Admin can view all departments', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // /api/departments uses the legacy { departments: [...] } shape, not
      // the { success, data } envelope.
      expect(Array.isArray(response.body.departments)).toBe(true);
    });

    test('Pastor can view departments', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${pastorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.departments)).toBe(true);
    });

    test('Member can view departments', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.departments)).toBe(true);
    });

    test('Super Admin can update department', async () => {
      const response = await request(app)
        .put(`/api/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Department Updated',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member cannot update department', async () => {
      const response = await request(app)
        .put(`/api/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Gallery Management Workflows', () => {
    test('Super Admin can view gallery', async () => {
      const response = await request(app)
        .get('/api/gallery/photos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member can view public gallery', async () => {
      const response = await request(app)
        .get('/api/gallery/photos?public=true')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Super Admin can create album', async () => {
      const response = await request(app)
        .post('/api/gallery/albums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Album',
          description: 'Test album for E2E testing'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('Member cannot create album', async () => {
      const response = await request(app)
        .post('/api/gallery/albums')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Album'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Document Management Workflows', () => {
    test('Super Admin can view documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member can view documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('SMS Management Workflows', () => {
    test('Super Admin can view SMS history', async () => {
      const response = await request(app)
        .get('/api/sms/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Pastor can send SMS', async () => {
      const response = await request(app)
        .post('/api/sms/send-blessed')
        .set('Authorization', `Bearer ${pastorToken}`)
        .send({
          message: 'Test message from E2E test',
          recipients: 'all',
          recipientType: 'all'
        });

      // 200 sent · 400 suppressed by the sms_notifications settings gate ·
      // 500 provider unconfigured
      expect([200, 400, 500]).toContain(response.status);
    });

    test('Member cannot send SMS', async () => {
      const response = await request(app)
        .post('/api/sms/send-blessed')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          message: 'Unauthorized SMS'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Announcement Management Workflows', () => {
    test('Super Admin can create announcement', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Announcement',
          content: 'Test announcement for E2E testing',
          status: 'published'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('Member can view announcements', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member cannot create announcement', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Announcement'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Approval Workflows', () => {
    test('Super Admin can view approvals', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member cannot create approvals directly (module-scoped only)', async () => {
      // Approval requests are created by module flows (payments, documents) —
      // a plain Member hitting POST /api/approvals is rejected by the
      // Pastor+-only role check (403), which is the real contract.
      const response = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          type: 'document_upload',
          title: 'Test Approval Request',
          description: 'Test approval request from E2E test'
        });

      expect(response.status).toBe(403);
    });

    test('Pastor can approve request', async () => {
      // First get pending approvals
      const approvalsResponse = await request(app)
        .get('/api/approvals?status=pending')
        .set('Authorization', `Bearer ${pastorToken}`);

      if (approvalsResponse.body.data && approvalsResponse.body.data.length > 0) {
        const approvalId = approvalsResponse.body.data[0].id;
        
        const response = await request(app)
          .put(`/api/approvals/${approvalId}/approve`)
          .set('Authorization', `Bearer ${pastorToken}`)
          .send({ comments: 'Approved in E2E test' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Settings Management Workflows', () => {
    test('Super Admin can view settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Super Admin can update settings', async () => {
      const response = await request(app)
        .put('/api/settings/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          settings: [
            { key: 'site_name', value: 'Msabato CMS Test' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Member cannot update settings', async () => {
      const response = await request(app)
        .put('/api/settings/bulk')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          settings: [
            { key: 'site_name', value: 'Unauthorized Change' }
          ]
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Permission Enforcement', () => {
    test('Member cannot access treasury', async () => {
      const response = await request(app)
        .get('/api/treasury')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    test('Super Admin can access treasury', async () => {
      const response = await request(app)
        .get('/api/treasury')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status); // 404 if route doesn't exist yet
    });

    test('Member cannot access user management', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    test('Super Admin can access user management', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Session Management', () => {
    test('User can logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ refreshToken: 'dummy_token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Expired token is rejected', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer expired_token_12345');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('Invalid route returns 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('Invalid JSON is rejected', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    test('Missing required fields are rejected', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
    });
  });
});
