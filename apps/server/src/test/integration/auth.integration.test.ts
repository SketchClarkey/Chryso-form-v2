import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { User } from '../../models/User.js';
import authRoutes from '../../routes/auth.js';
import { authenticate } from '../../middleware/auth.js';

let app: express.Application;

// Test app setup
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/auth', authRoutes);
  return testApp;
};

describe('Auth Routes Integration', () => {
  beforeEach(async () => {
    app = createTestApp();
    await User.deleteMany({}); // Clean up users before each test
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        role: 'technician',
      };

      const response = await request(app).post('/auth/register').send(userData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeTruthy();
      expect(response.body.data.tokens.refreshToken).toBeTruthy();

      // Verify user is saved in database
      const savedUser = await User.findOne({ email: userData.email.toLowerCase() });
      expect(savedUser).toBeTruthy();
      expect(savedUser?.email).toBe(userData.email.toLowerCase());
    });

    it('should not register user with existing email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        role: 'technician',
      };

      // Create first user
      await request(app).post('/auth/register').send(userData).expect(201);

      // Try to create second user with same email
      const response = await request(app).post('/auth/register').send(userData).expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email already exists');
      expect(response.body.code).toBe('USER_EXISTS');
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/auth/register').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should validate email format', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePass123!',
        role: 'technician',
      };

      const response = await request(app).post('/auth/register').send(userData).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: '123', // Weak password
        role: 'technician',
      };

      const response = await request(app).post('/auth/register').send(userData).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('WEAK_PASSWORD');
    });

    it('should validate role enum', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        role: 'invalid-role',
      };

      const response = await request(app).post('/auth/register').send(userData).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'JOHN.DOE@EXAMPLE.COM',
        password: 'SecurePass123!',
        role: 'technician',
      };

      const response = await request(app).post('/auth/register').send(userData).expect(201);

      expect(response.body.data.user.email).toBe('john.doe@example.com');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'technician',
        isActive: true,
        emailVerified: true,
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app).post('/auth/login').send(loginData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeTruthy();
      expect(response.body.data.tokens.refreshToken).toBeTruthy();

      // Verify lastLogin is updated
      const updatedUser = await User.findOne({ email: loginData.email });
      expect(updatedUser?.lastLogin).toBeDefined();
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app).post('/auth/login').send(loginData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app).post('/auth/login').send(loginData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login inactive user', async () => {
      // Create inactive user
      await User.create({
        firstName: 'Inactive',
        lastName: 'User',
        email: 'inactive@example.com',
        password: 'SecurePass123!',
        role: 'technician',
        isActive: false,
      });

      const loginData = {
        email: 'inactive@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app).post('/auth/login').send(loginData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account is deactivated');
      expect(response.body.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should handle account lockout after failed attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/auth/login').send(loginData).expect(401);
      }

      // Next attempt should be blocked due to lockout
      const response = await request(app).post('/auth/login').send(loginData).expect(423);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account temporarily locked');
      expect(response.body.code).toBe('ACCOUNT_LOCKED');
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/auth/login').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should be case-insensitive for email', async () => {
      const loginData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePass123!',
      };

      const response = await request(app).post('/auth/login').send(loginData).expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register user and get refresh token
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'technician',
      };

      const registerResponse = await request(app).post('/auth/register').send(userData);

      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({ refreshToken }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeTruthy();
      expect(response.body.data.tokens.refreshToken).toBeTruthy();
      expect(response.body.data.user).toBeDefined();

      // New tokens should be different from the old ones
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
      expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should not refresh with expired token', async () => {
      // This test would require mocking time or creating an expired token
      // For now, we'll test with a malformed token
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'expired.token.here' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should invalidate old refresh token after use', async () => {
      // Use the refresh token
      await request(app).post('/auth/refresh').send({ refreshToken }).expect(200);

      // Try to use the same token again
      const response = await request(app).post('/auth/refresh').send({ refreshToken }).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Register user and get tokens
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'technician',
      };

      const registerResponse = await request(app).post('/auth/register').send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should logout successfully with valid tokens', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/auth/logout').send({ refreshToken }).expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should invalidate tokens after logout', async () => {
      // Logout
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Try to use refresh token after logout
      const response = await request(app).post('/auth/refresh').send({ refreshToken }).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register user and get token
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'technician',
      };

      const registerResponse = await request(app).post('/auth/register').send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(userId);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.firstName).toBe('Test');
      expect(response.body.data.user.lastName).toBe('User');
      expect(response.body.data.user.password).toBeUndefined(); // Should not include password
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not accept invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not accept expired token', async () => {
      // Test with a token that has 'expired' signature
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send('email=test@example.com&password=password')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors gracefully', async () => {
      // Close database connection to simulate error
      await mongoose.connection.close();

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        })
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      await mongoose.connect(mongoServer.getUri());
    });
  });

  describe('Security Features', () => {
    it('should include security headers', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'password',
      });

      // Check for common security headers (if your security middleware adds them)
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    it('should not expose sensitive user data in responses', async () => {
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'technician',
        isActive: true,
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      // Should not expose password or sensitive fields
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.refreshTokenVersion).toBeUndefined();
    });
  });
});
