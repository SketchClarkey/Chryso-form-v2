import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { User, IUser } from '../../models/User.js';
import * as passwordUtils from '../../utils/password.js';

// Mock password utilities
vi.mock('../../utils/password.js');

describe('User Model', () => {
  beforeEach(async () => {
    // Use the global database connection from setup.ts
    // Clear the users collection before each test
    await User.deleteMany({});

    // Mock password utilities
    vi.mocked(passwordUtils.hashPassword).mockImplementation(async (password: string) => `hashed_${password}`);
    vi.mocked(passwordUtils.comparePassword).mockImplementation(async (plaintext: string, hash: string) => {
      return hash === `hashed_${plaintext}`;
    });
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'technician' as const,
      };

      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.role).toBe('technician');
      expect(user.isActive).toBe(true);
      expect(user.emailVerified).toBe(false);
      expect(user.refreshTokenVersion).toBe(0);
      expect(user.loginAttempts).toBe(0);
      expect(user.preferences.theme).toBe('light');
      expect(user.preferences.notifications).toBe(true);
      expect(user.preferences.language).toBe('en');
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should fail validation for missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // Missing password, firstName, lastName
      };

      await expect(User.create(incompleteData)).rejects.toThrow();
    });

    it('should fail validation for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(User.create(userData)).rejects.toThrow(/Please enter a valid email/);
    });

    it('should fail validation for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(User.create(userData)).rejects.toThrow(/Password must be at least 8 characters/);
    });

    it('should fail validation for invalid role', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid-role' as any,
      };

      await expect(User.create(userData)).rejects.toThrow(/Role must be admin, manager, or technician/);
    });

    it('should fail when creating user with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.create(userData);
      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from names', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: '  John  ',
        lastName: '  Doe  ',
      };

      const user = await User.create(userData);
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });
  });

  describe('Virtual Properties', () => {
    it('should generate fullName virtual', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.fullName).toBe('John Doe');
    });

    it('should return false for isLocked when not locked', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.isLocked).toBe(false);
    });

    it('should return true for isLocked when locked', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        lockUntil: new Date(Date.now() + 60000), // 1 minute from now
      });

      expect(user.isLocked).toBe(true);
    });

    it('should return false for isLocked when lock has expired', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        lockUntil: new Date(Date.now() - 60000), // 1 minute ago
      });

      expect(user.isLocked).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    let testUser: IUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const result = await testUser.comparePassword('password123');
        expect(result).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const result = await testUser.comparePassword('wrongpassword');
        expect(result).toBe(false);
      });
    });

    describe('incrementLoginAttempts', () => {
      it('should increment login attempts', async () => {
        await testUser.incrementLoginAttempts();
        
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser?.loginAttempts).toBe(1);
      });

      it('should lock user after 5 failed attempts', async () => {
        // Set login attempts to 4
        testUser.loginAttempts = 4;
        await testUser.save();

        await testUser.incrementLoginAttempts();
        
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser?.loginAttempts).toBe(5);
        expect(updatedUser?.lockUntil).toBeDefined();
        expect(updatedUser?.lockUntil!.getTime()).toBeGreaterThan(Date.now());
      });

      it('should reset attempts if lock has expired', async () => {
        // Set expired lock
        testUser.lockUntil = new Date(Date.now() - 60000); // 1 minute ago
        testUser.loginAttempts = 5;
        await testUser.save();

        await testUser.incrementLoginAttempts();
        
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser?.loginAttempts).toBe(1);
        expect(updatedUser?.lockUntil).toBeUndefined();
      });
    });

    describe('resetLoginAttempts', () => {
      it('should reset login attempts and update last login', async () => {
        testUser.loginAttempts = 3;
        testUser.lockUntil = new Date(Date.now() + 60000);
        await testUser.save();

        await testUser.resetLoginAttempts();
        
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser?.loginAttempts).toBe(0); // Default value after unset
        expect(updatedUser?.lockUntil).toBeUndefined();
        expect(updatedUser?.lastLogin).toBeDefined();
      });
    });
  });

  describe('Static Methods', () => {
    let testUser: IUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      });
    });

    describe('findByEmailWithPassword', () => {
      it('should find active user by email with password field', async () => {
        const user = await (User as any).findByEmailWithPassword('test@example.com');
        
        expect(user).toBeTruthy();
        expect(user.email).toBe('test@example.com');
        expect(user.password).toBeDefined();
        expect(user.refreshTokenVersion).toBeDefined();
      });

      it('should not find inactive user', async () => {
        await User.findByIdAndUpdate(testUser._id, { isActive: false });
        
        const user = await (User as any).findByEmailWithPassword('test@example.com');
        expect(user).toBeNull();
      });

      it('should return null for non-existent email', async () => {
        const user = await (User as any).findByEmailWithPassword('nonexistent@example.com');
        expect(user).toBeNull();
      });
    });
  });

  describe('JSON Transform', () => {
    it('should exclude sensitive fields from JSON output', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        passwordResetToken: 'reset-token',
        emailVerificationToken: 'verify-token',
      });

      const json = user.toJSON();
      
      expect(json.password).toBeUndefined();
      expect(json.refreshTokenVersion).toBeUndefined();
      expect(json.passwordResetToken).toBeUndefined();
      expect(json.passwordResetExpires).toBeUndefined();
      expect(json.emailVerificationToken).toBeUndefined();
      expect(json.email).toBe('test@example.com');
      expect(json.firstName).toBe('John');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password on save', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'plaintext123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await user.save();
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('plaintext123');
      expect(user.password).toBe('hashed_plaintext123');
    });

    it('should not hash password if not modified', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      vi.clearAllMocks();

      user.firstName = 'Jane';
      await user.save();

      expect(passwordUtils.hashPassword).not.toHaveBeenCalled();
    });
  });

  describe('Preferences', () => {
    it('should set default preferences', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.preferences.theme).toBe('light');
      expect(user.preferences.notifications).toBe(true);
      expect(user.preferences.language).toBe('en');
    });

    it('should validate theme preference', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        preferences: {
          theme: 'invalid-theme' as any,
        },
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Metadata', () => {
    it('should store metadata fields', async () => {
      const creatorId = new mongoose.Types.ObjectId();
      
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        metadata: {
          createdBy: creatorId,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(user.metadata.createdBy?.toString()).toBe(creatorId.toString());
      expect(user.metadata.ipAddress).toBe('127.0.0.1');
      expect(user.metadata.userAgent).toBe('Mozilla/5.0');
    });
  });
});