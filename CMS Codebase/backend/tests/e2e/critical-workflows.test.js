/**
 * End-to-End Tests for Critical User Workflows
 *
 * These tests simulate complete user journeys through the system
 */

const request = require('supertest');
const app = require('../server');

describe('Critical User Workflows E2E Tests', () => {
  let authToken;
  let userId;
  let announcementId;
  let eventId;
  let documentId;
  let paymentId;

  describe('Workflow 1: New Member Registration and Onboarding', () => {
    it('should complete full member registration workflow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newmember@kmaincms.test',
          password: 'SecurePassword123!',
          first_name: 'John',
          last_name: 'Doe',
          phone: '254712345678'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('success', true);
      userId = registerResponse.body.data.id;

      // Step 2: Login with new credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newmember@kmaincms.test',
          password: 'SecurePassword123!'
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

      // Step 4: Join a department
      const deptResponse = await request(app)
        .post('/api/departments/1/members')
        .set('Authorization', `Bearer ${authToken}`);

      expect(deptResponse.status).toBe(200);
      expect(deptResponse.body).toHaveProperty('success', true);

      // Step 5: Verify user data
      const userResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(userResponse.status).toBe(200);
      expect(userResponse.body.data).toHaveProperty('first_name', 'John');
      expect(userResponse.body.data).toHaveProperty('departments');
    });
  });

  describe('Workflow 2: Create and Publish Announcement', () => {
    it('should complete announcement creation and publishing workflow', async () => {
      // Step 1: Create announcement draft
      const createResponse = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Join us for Sunday service at 10 AM. Special guest speaker!'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('success', true);

      // Step 3: Submit for approval (if approval workflow is enabled)
      const approvalResponse = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          document_id: announcementId,
          document_type: 'announcement',
          approval_level: 'basic',
          approvers: ['admin-1']
        });

      expect(approvalResponse.status).toBe(201);

      // Step 4: Approve announcement
      const approveResponse = await request(app)
        .post(`/api/document-approval/${approvalResponse.body.data.id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'admin-1',
          comments: 'Approved for publication'
        });

      expect(approveResponse.status).toBe(200);

      // Step 5: Publish announcement
      const publishResponse = await request(app)
        .put(`/api/announcements/${announcementId}/publish`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(publishResponse.status).toBe(200);
      expect(publishResponse.body.data.is_published).toBe(true);

      // Step 6: Verify announcement is public
      const publicResponse = await request(app)
        .get('/api/announcements/public');

      expect(publicResponse.status).toBe(200);
      const publicAnnouncement = publicResponse.body.data.find(a => a.id === announcementId);
      expect(publicAnnouncement).toBeDefined();
    });
  });

  describe('Workflow 3: Event Creation and Registration', () => {
    it('should complete event creation and registration workflow', async () => {
      // Step 1: Create event
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Church Retreat 2024',
          description: 'Annual church retreat at Kiserian',
          event_date: '2024-12-15T09:00:00Z',
          location: 'Kiserian Church Grounds',
          max_attendees: 100,
          is_public: true
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('success', true);
      eventId = createResponse.body.data.id;

      // Step 2: Register for event
      const registerResponse = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attendees: 2
        });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body).toHaveProperty('success', true);

      // Step 3: Send confirmation notification
      const notificationResponse = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: userId,
          type: 'event-registration',
          title: 'Event Registration Confirmed',
          message: 'You have successfully registered for Church Retreat 2024'
        });

      expect(notificationResponse.status).toBe(200);

      // Step 4: Verify registration
      const eventResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(eventResponse.status).toBe(200);
      expect(eventResponse.body.data.attendees).toBeGreaterThan(0);
    });
  });

  describe('Workflow 4: Payment Processing and Reconciliation', () => {
    it('should complete payment workflow with M-Pesa', async () => {
      // Step 1: Initiate STK Push
      const paymentResponse = await request(app)
        .post('/api/payments/stk-push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '254712345678',
          amount: 1000,
          account_reference: 'TITHING',
          transaction_desc: 'Tithe Payment'
        });

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.body).toHaveProperty('success', true);
      const merchantRequestID = paymentResponse.body.data.MerchantRequestID;

      // Step 2: Simulate callback (in real scenario, this comes from Safaricom)
      const callbackResponse = await request(app)
        .post('/api/payments/callback')
        .send({
          Body: {
            stkCallback: {
              MerchantRequestID: merchantRequestID,
              ResultCode: 0, // Success
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: 1000 },
                  { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
                  { Name: 'TransactionDate', Value: '20240623120000' }
                ]
              }
            }
          }
        });

      expect(callbackResponse.status).toBe(200);

      // Step 3: Verify payment status
      const statusResponse = await request(app)
        .get(`/api/payments/status/${merchantRequestID}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toBe('completed');
      paymentId = statusResponse.body.data.id;

      // Step 4: Auto-reconcile payment
      const reconcileResponse = await request(app)
        .post('/api/reconciliation/auto-reconcile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(reconcileResponse.status).toBe(200);
      expect(reconcileResponse.body).toHaveProperty('success', true);

      // Step 5: Get payment history
      const historyResponse = await request(app)
        .get('/api/payments/my-payments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      const payment = historyResponse.body.data.find(p => p.id === paymentId);
      expect(payment).toBeDefined();
      expect(payment.reconciled).toBe(true);
    });
  });

  describe('Workflow 5: Document Creation and Approval', () => {
    it('should complete document approval workflow', async () => {
      // Step 1: Create document
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Church Policy Document',
          content: 'This is a policy document for church operations',
          document_type: 'policy',
          department_id: 1
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('success', true);
      documentId = createResponse.body.data.id;

      // Step 2: Request approval
      const approvalResponse = await request(app)
        .post('/api/document-approval/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          document_id: documentId,
          approval_level: 'standard',
          approvers: ['manager-1', 'manager-2']
        });

      expect(approvalResponse.status).toBe(201);
      const approvalId = approvalResponse.body.data.id;

      // Step 3: First approver approves
      const firstApproval = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'manager-1',
          comments: 'Looks good, proceed to final approval'
        });

      expect(firstApproval.status).toBe(200);

      // Step 4: Second approver approves
      const secondApproval = await request(app)
        .post(`/api/document-approval/${approvalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approver_id: 'manager-2',
          comments: 'Approved for implementation'
        });

      expect(secondApproval.status).toBe(200);
      expect(secondApproval.body.data.status).toBe('approved');

      // Step 5: Verify document is approved
      const docResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(docResponse.status).toBe(200);
      expect(docResponse.body.data.approval_status).toBe('approved');
    });
  });

  describe('Workflow 6: SMS Notification Workflow', () => {
    it('should complete SMS notification workflow', async () => {
      // Step 1: Send single SMS
      const smsResponse = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '254712345678',
          message: 'Test message from E2E test'
        });

      expect(smsResponse.status).toBe(200);
      expect(smsResponse.body).toHaveProperty('success', true);

      // Step 2: Send bulk SMS
      const bulkResponse = await request(app)
        .post('/api/sms-hub/send-bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipients: ['254712345678', '254798765432'],
          message: 'Bulk test message'
        });

      expect(bulkResponse.status).toBe(200);
      expect(bulkResponse.body).toHaveProperty('success', true);
      expect(bulkResponse.body.sentCount).toBe(2);

      // Step 3: Check SMS hub health
      const healthResponse = await request(app)
        .get('/api/sms-hub/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body).toHaveProperty('success', true);
    });
  });

  describe('Workflow 7: AI Content Generation', () => {
    it('should complete AI content generation workflow', async () => {
      // Step 1: Generate announcement content
      const generateResponse = await request(app)
        .post('/api/ai/generate-announcement')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Easter Sunday Service',
          tone: 'inspirational',
          key_points: ['Resurrection', 'Hope', 'Community']
        });

      expect(generateResponse.status).toBe(200);
      expect(generateResponse.body).toHaveProperty('success', true);
      expect(generateResponse.body.data).toHaveProperty('content');

      // Step 2: Generate member communication
      const commResponse = await request(app)
        .post('/api/ai/generate-communication')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipient_type: 'new_members',
          purpose: 'welcome',
          personalization: {
            name: 'John'
          }
        });

      expect(commResponse.status).toBe(200);
      expect(commResponse.body).toHaveProperty('success', true);

      // Step 3: Get content suggestions
      const suggestionsResponse = await request(app)
        .post('/api/ai/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          context: 'weekly_bulletin',
          count: 5
        });

      expect(suggestionsResponse.status).toBe(200);
      expect(suggestionsResponse.body).toHaveProperty('success', true);
      expect(Array.isArray(suggestionsResponse.body.data)).toBe(true);
    });
  });

  describe('Workflow 8: Complete User Session', () => {
    it('should handle complete user session from login to logout', async () => {
      // Step 1: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newmember@kmaincms.test',
          password: 'SecurePassword123!'
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

      // Step 7: Verify token is invalidated
      const verifyResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(verifyResponse.status).toBe(401);
    });
  });
});
