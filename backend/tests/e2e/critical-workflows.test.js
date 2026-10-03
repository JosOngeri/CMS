/**
 * End-to-End Tests for Critical User Workflows
 *
 * These tests simulate complete user journeys through the system
 */

const request = require('supertest');
const { app } = require('../../server');
const { pool } = require('../../config/database');

describe('Critical User Workflows E2E Tests', () => {
  let authToken;
  let adminToken;
  let userId;
  let announcementId;
  let eventId;
  let documentId;
  let paymentId;

  // Workflows 2-7 exercise privileged actions (announcements, events,
  // payments, SMS, AI) — they need an admin token, not the member token
  // registered in Workflow 1.
  beforeAll(async () => {
    // Register is not idempotent — remove leftovers from previous runs.
    await pool.query("DELETE FROM users WHERE email = 'newmember@msabato.test'");
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@msabato.test', password: 'TestPassword123!' });
    adminToken = res.body.data && res.body.data.accessToken;
  });
  describe('Workflow 1: New Member Registration and Onboarding', () => {
    it('should complete full member registration workflow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newmember@msabato.test',
          password: 'Str0ng#Falcon',
          first_name: 'John',
          last_name: 'Doe',
          phone: '254712345678'
        });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body).toHaveProperty('success', true);
      userId = registerResponse.body.data.user.id;

      // Step 2: Login with new credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newmember@msabato.test',
          password: 'Str0ng#Falcon'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('success', true);
      authToken = loginResponse.body.data.accessToken;

      // Step 3: Complete profile
      const profileResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '123 Church Street',
          city: 'Nairobi',
          country: 'Kenya',
          date_of_birth: '1990-01-01'
        });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body).toHaveProperty('success', true);

      // Step 4: Join a department — admin creates one, member files a
      // pending join request (members cannot add themselves directly).
      // Reuse across runs — the slug is unique per church.
      const adminProfile = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      const churchId = adminProfile.body.data.church_id;
      const existingOnbDept = await pool.query(
        `SELECT id FROM departments WHERE name = 'E2E Onboarding Department' AND church_id = $1`,
        [churchId]
      );
      let deptId;
      if (existingOnbDept.rows[0]) {
        deptId = existingOnbDept.rows[0].id;
      } else {
        const createDept = await request(app)
          .post('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'E2E Onboarding Department', description: 'Created for join-flow test' });
        expect(createDept.status).toBe(201);
        deptId = createDept.body.department.id;
      }

      const deptResponse = await request(app)
        .post(`/api/departments/${deptId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deptResponse.status).toBe(200);
      expect(deptResponse.body).toHaveProperty('success', true);

      // Step 5: Verify user data
      const userResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(userResponse.status).toBe(200);
      expect(userResponse.body.data).toHaveProperty('first_name', 'John');
      expect(userResponse.body.data).toHaveProperty('roles');
    });
  });

  describe('Workflow 2: Create and Publish Announcement', () => {
    it('should complete announcement creation and publishing workflow', async () => {
      // Step 1: Create announcement draft
      const createResponse = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sunday Service Announcement',
          content: 'Join us for Sunday service at 10 AM',
          announcement_type: 'general',
          priority: 'normal',
          is_public: false
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('success', true);
      announcementId = createResponse.body.data.id;

      // Step 2: Update announcement
      const updateResponse = await request(app)
        .put(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Join us for Sunday service at 10 AM. Special guest speaker!'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('success', true);

      // Step 3: Publish — announcements have no /publish endpoint; toggling
      // is_public via the update route is the real mechanism.
      const publishResponse = await request(app)
        .put(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_public: true });

      expect(publishResponse.status).toBe(200);
      expect(publishResponse.body).toHaveProperty('success', true);

      // Step 4: Verify announcement is listed publicly
      const publicResponse = await request(app)
        .get('/api/announcements/public');

      expect(publicResponse.status).toBe(200);
      const publicAnnouncements = publicResponse.body.data.announcements || [];
      expect(publicAnnouncements.find(a => a.id === announcementId)).toBeDefined();
    });
  });

  describe('Workflow 3: Event Creation and Registration', () => {
    it('should complete event creation and registration workflow', async () => {
      // Step 1: Create event
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Church Retreat 2024',
          description: 'Annual church retreat at Kiserian',
          event_date: '2024-12-15T09:00:00Z',
          location: 'Kiserian Church Grounds',
          max_attendees: 100,
          is_public: true
        });

      expect(createResponse.status).toBe(201);
      // Events routes use the legacy { event } shape, not the { success, data }
      // envelope.
      eventId = createResponse.body.event.id;

      // Step 2: Register for event
      const registerResponse = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(registerResponse.status).toBe(201);

      // Step 3: Send confirmation notification (push endpoint is /push)
      const notificationResponse = await request(app)
        .post('/api/notifications/push')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: userId,
          title: 'Event Registration Confirmed',
          body: 'You have successfully registered for Church Retreat 2024'
        });

      expect(notificationResponse.status).toBe(200);

      // Step 4: Verify registration
      const eventResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(eventResponse.status).toBe(200);
      expect(eventResponse.body.event.attendees.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow 4: Payment Processing and Reconciliation', () => {
    it('should complete payment recording and reconciliation workflow', async () => {
      // M-Pesa STK push/callback need live Daraja credentials — this workflow
      // exercises the DB-backed recording + reconciliation surfaces instead.
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      const adminId = profileRes.body.data.id;
      const churchId = profileRes.body.data.church_id;

      // Prerequisites: a member to pay as, and an active payment method.
      const member = await pool.query(
        `INSERT INTO members (user_id, first_name, last_name, email, membership_status, church_id)
         VALUES ($1, 'Pay', 'Tester', 'pay-tester@test.local', 'Active', $2)
         RETURNING id`,
        [adminId, churchId]
      );
      const method = await pool.query(
        `INSERT INTO payment_methods (name, type, is_active, church_id)
         VALUES ('E2E Cash', 'cash', true, $1) RETURNING id`,
        [churchId]
      );
      const memberId = member.rows[0].id;
      const methodId = method.rows[0].id;

      // Step 1: Record a manual payment
      const createResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentMethodId: methodId,
          memberId,
          amount: 1000,
          paymentType: 'tithe',
          notes: 'E2E workflow payment'
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('success', true);
      paymentId = createResponse.body.data.id;

      // Step 2: Mark the payment completed
      const statusResponse = await request(app)
        .put(`/api/payments/status/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(statusResponse.status).toBe(200);

      // Step 3: Payment shows in history
      const historyResponse = await request(app)
        .get('/api/payments/my-payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyResponse.status).toBe(200);

      // Step 4: Reconciliation queue is reachable for finance roles
      const reconcileResponse = await request(app)
        .get('/api/reconciliation/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reconcileResponse.status).toBe(200);
    });
  });

  describe('Workflow 5: Document Creation and Approval', () => {
    it('should complete document approval workflow', async () => {
      // Documents are only created via multipart /upload — seed the row
      // directly and exercise the real approval contract.
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      const adminId = profileRes.body.data.id;
      const churchId = profileRes.body.data.church_id;

      // A department where the admin is an eligible approver ('Leader').
      // Reuse across runs — the slug is unique per church.
      const existingDept = await pool.query(
        `SELECT id FROM departments WHERE name = 'E2E Approval Dept' AND church_id = $1`,
        [churchId]
      );
      let deptId;
      if (existingDept.rows[0]) {
        deptId = existingDept.rows[0].id;
      } else {
        const deptRes = await request(app)
          .post('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'E2E Approval Dept', description: 'doc approval workflow' });
        expect(deptRes.status).toBe(201);
        deptId = deptRes.body.department.id;
      }
      await pool.query(
        `INSERT INTO department_members (user_id, department_id, role, status, is_active, church_id)
         SELECT $1, $2, 'Leader', 'active', true, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM department_members WHERE user_id = $1 AND department_id = $2
         )`,
        [adminId, deptId, churchId]
      );

      const doc = await pool.query(
        `INSERT INTO documents (name, file_name, file_path, file_size, category, uploaded_by, church_id)
         VALUES ('E2E Policy', 'policy.pdf', '/uploads/documents/policy.pdf', 1024, 'policies', $1, $2)
         RETURNING id`,
        [adminId, churchId]
      );
      documentId = doc.rows[0].id;

      // Step 1: The member requests basic-level approval (1 approver needed)
      const approvalResponse = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ documentId, departmentId: deptId, approvalLevel: 'basic' });

      expect(approvalResponse.status).toBe(201);
      const approvalId = approvalResponse.body.data.id;

      // Step 2: The dept leader approves (approver != requester)
      const approveResponse = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'Approved for implementation' });

      expect(approveResponse.status).toBe(200);

      // Step 3: Document is marked approved
      const docRow = await pool.query(
        'SELECT approval_status FROM documents WHERE id = $1', [documentId]);
      expect(docRow.rows[0].approval_status).toBe('approved');
    });
  });

  describe('Workflow 6: SMS Notification Workflow', () => {
    it('should complete SMS notification workflow', async () => {
      // hybridSMS.sendViaJOSms requires socket.io — server.js wires it during
      // listen(), which supertest skips. Inject a stub emitter instead.
      const hybridSMS = require('../../services/hybridSMS');
      hybridSMS.setIo({ to: () => ({ emit: () => {} }) });

      // Step 1: Send SMS (real payload shape is { recipients, message })
      const smsResponse = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipients: ['254712345678'],
          message: 'Test message from E2E test'
        });

      expect(smsResponse.status).toBe(200);
      expect(smsResponse.body).toHaveProperty('success', true);

      // Step 2: Send to multiple recipients via the same queue endpoint
      const bulkResponse = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipients: ['254712345678', '254798765432'],
          message: 'Bulk test message'
        });

      expect(bulkResponse.status).toBe(200);

      // Step 3: Provider status surface is reachable
      const statusResponse = await request(app)
        .get('/api/sms-hub/providers/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statusResponse.status).toBe(200);
    });
  });

  describe('Workflow 7: AI Content Generation', () => {
    it('should expose the AI service contract', async () => {
      // Usage stats is always available
      const statsResponse = await request(app)
        .get('/api/ai/usage-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(200);

      // condense is the only generation endpoint; without GEMINI_API_KEY the
      // service must fail with a controlled error, not hang or crash.
      const condenseResponse = await request(app)
        .post('/api/ai/condense')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Join us for the Easter Sunday service at Kiserian Main SDA church. All members are welcome for the celebration.'
        });

      expect(condenseResponse.status).toBeGreaterThanOrEqual(400);
      expect(condenseResponse.body.success).toBe(false);
    });
  });

  describe('Workflow 8: Complete User Session', () => {
    it('should handle complete user session from login to logout', async () => {
      // Step 1: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newmember@msabato.test',
          password: 'Str0ng#Falcon'
        });

      expect(loginResponse.status).toBe(200);
      const sessionToken = loginResponse.body.data.accessToken;

      // Step 2: View dashboard
      const dashboardResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(dashboardResponse.status).toBe(200);

      // Step 3: View announcements
      const announcementsResponse = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(announcementsResponse.status).toBe(200);

      // Step 4: View events
      const eventsResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(eventsResponse.status).toBe(200);

      // Step 5: View profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(profileResponse.status).toBe(200);

      // Step 6: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(logoutResponse.status).toBe(200);

      // Step 7: Access tokens are stateless — logout revokes the refresh
      // token and clears the cookie, but a presented access token stays
      // valid until expiry (no server-side access denylist yet).
      const verifyResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(verifyResponse.status).toBe(200);
    });
  });
});
