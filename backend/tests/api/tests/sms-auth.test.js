/**
 * sms-auth.test.js
 *
 * Test suite for SMS-specific authentication endpoints.
 */

// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key';

// Mock hibp before importing security
jest.mock('hibp', () => ({
  breachedAccount: jest.fn().mockResolvedValue(false),
  pwnedPasswordRange: jest.fn().mockResolvedValue(0)
}));

// Mock the dependencies
jest.mock('../../../repositories/UserRepository');
jest.mock('../../../repositories/ChurchRepository');
jest.mock('../../../services/IdentityService');

const bcrypt = require('bcryptjs');

const smsAuthController = require('../../../controllers/smsAuth.controller');
const UserRepository = require('../../../repositories/UserRepository');
const ChurchRepository = require('../../../repositories/ChurchRepository');
const IdentityService = require('../../../services/IdentityService');
const { generateAccessToken } = require('../../../helpers/security');

const TEST_PASSWORD = 'TestPass123!';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

describe('SMS Authentication Controller', () => {
  let mockReq, mockRes;
  let testUser, testChurch;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request and response objects
    mockReq = {
      body: {},
      user: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock church data
    testChurch = {
      id: 1,
      name: 'Test Church',
      slug: 'test-church',
      api_key: 'test-api-key',
      is_active: true
    };

    // Mock user data
    testUser = {
      id: 1,
      email: 'test@example.com',
      password_hash: TEST_PASSWORD_HASH,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      phone: '+1234567890',
      is_active: true,
      church_id: testChurch.id,
      church_slug: testChurch.slug,
      failed_login_attempts: 0,
      locked_until: null
    };
  });

  describe('smsLogin', () => {
    it('should login with username and return organization metadata with SMS-scoped token', async () => {
      mockReq.body = {
        identifier: 'testuser',
        password: TEST_PASSWORD
      };

      UserRepository.findByIdentifier.mockResolvedValue(testUser);
      ChurchRepository.findById.mockResolvedValue(testChurch);
      IdentityService.getIdentity.mockResolvedValue({
        roles: ['Member'],
        mfaEnabled: false,
        mfaVerified: false
      });
      IdentityService.hasAnyRole.mockReturnValue(false);
      UserRepository.update.mockResolvedValue({});

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            church: expect.objectContaining({
              id: testChurch.id,
              slug: testChurch.slug,
              database_connection_key: expect.any(String)
            }),
            sync_config: expect.any(Object)
          })
        })
      );
    });

    it('should login with email and return organization metadata with SMS-scoped token', async () => {
      mockReq.body = {
        identifier: 'test@example.com',
        password: TEST_PASSWORD
      };

      UserRepository.findByIdentifier.mockResolvedValue(testUser);
      ChurchRepository.findById.mockResolvedValue(testChurch);
      IdentityService.getIdentity.mockResolvedValue({
        roles: ['Member'],
        mfaEnabled: false,
        mfaVerified: false
      });
      IdentityService.hasAnyRole.mockReturnValue(false);
      UserRepository.update.mockResolvedValue({});

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            church: expect.objectContaining({
              id: testChurch.id
            })
          })
        })
      );
    });

    it('should login with phone number and return organization metadata with SMS-scoped token', async () => {
      mockReq.body = {
        identifier: '+1234567890',
        password: TEST_PASSWORD
      };

      UserRepository.findByIdentifier.mockResolvedValue(testUser);
      ChurchRepository.findById.mockResolvedValue(testChurch);
      IdentityService.getIdentity.mockResolvedValue({
        roles: ['Member'],
        mfaEnabled: false,
        mfaVerified: false
      });
      IdentityService.hasAnyRole.mockReturnValue(false);
      UserRepository.update.mockResolvedValue({});

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            church: expect.any(Object)
          })
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq.body = {
        identifier: 'testuser',
        password: 'wrongpassword'
      };

      UserRepository.findByIdentifier.mockResolvedValue(testUser);
      ChurchRepository.findById.mockResolvedValue(testChurch);
      IdentityService.getIdentity.mockResolvedValue({
        roles: ['Member'],
        mfaEnabled: false,
        mfaVerified: false
      });
      IdentityService.hasAnyRole.mockReturnValue(false);

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 401 for inactive user', async () => {
      const inactiveUser = { ...testUser, is_active: false };
      mockReq.body = {
        identifier: 'testuser',
        password: TEST_PASSWORD
      };

      UserRepository.findByIdentifier.mockResolvedValue(inactiveUser);

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 429 for locked account with remaining time', async () => {
      const lockedUser = { 
        ...testUser, 
        locked_until: new Date(Date.now() + 15 * 60 * 1000),
        failed_login_attempts: 5
      };
      mockReq.body = {
        identifier: 'testuser',
        password: TEST_PASSWORD
      };

      UserRepository.findByIdentifier.mockResolvedValue(lockedUser);

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('minutes')
        })
      );
    });

    it('should return 400 for missing identifier or password', async () => {
      mockReq.body = {
        identifier: 'testuser'
      };

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should require MFA token for admin users with MFA enabled', async () => {
      const adminUser = { ...testUser, username: 'adminuser' };
      mockReq.body = {
        identifier: 'adminuser',
        password: TEST_PASSWORD
      };

      UserRepository.findByIdentifier.mockResolvedValue(adminUser);
      IdentityService.getIdentity.mockResolvedValue({
        roles: ['Super Admin'],
        mfaEnabled: true,
        mfaVerified: false
      });
      IdentityService.hasAnyRole.mockReturnValue(true);

      await smsAuthController.smsLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('MFA')
        })
      );
    });
  });

  describe('getOrganization', () => {
    it('should return organization configuration for valid SMS token', async () => {
      mockReq.user = {
        id: testUser.id,
        churchId: testChurch.id,
        scope: ['sms']
      };

      ChurchRepository.findById.mockResolvedValue(testChurch);

      await smsAuthController.getOrganization(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            church: expect.objectContaining({
              id: testChurch.id,
              slug: testChurch.slug
            }),
            sms_config: expect.any(Object)
          })
        })
      );
    });

    it('should return 400 for missing church_id in token', async () => {
      mockReq.user = {
        id: testUser.id,
        churchId: null,
        scope: ['sms']
      };

      await smsAuthController.getOrganization(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 403 for non-SMS scoped token', async () => {
      mockReq.user = {
        id: testUser.id,
        churchId: testChurch.id,
        scope: ['web']
      };

      await smsAuthController.getOrganization(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 403 for inactive church', async () => {
      const inactiveChurch = { ...testChurch, is_active: false };
      mockReq.user = {
        id: testUser.id,
        churchId: testChurch.id,
        scope: ['sms']
      };

      ChurchRepository.findById.mockResolvedValue(inactiveChurch);

      await smsAuthController.getOrganization(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 404 for church not found', async () => {
      mockReq.user = {
        id: testUser.id,
        churchId: testChurch.id,
        scope: ['sms']
      };

      ChurchRepository.findById.mockResolvedValue(null);

      await smsAuthController.getOrganization(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });
});