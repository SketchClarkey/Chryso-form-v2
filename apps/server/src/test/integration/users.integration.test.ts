import { describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from '../utils/testApp.js';
import { User } from '../../models/User.js';
import { Worksite } from '../../models/Worksite.js';
import { generateAccessToken } from '../../utils/jwt.js';
import type { Express } from 'express';

describe('Users API Integration Tests', () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let technicianToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let technicianUserId: string;
  let worksiteId: string;


  beforeEach(async () => {
    app = createTestApp();
    
    // Clean up database
    await User.deleteMany({});
    await Worksite.deleteMany({});
    
    const timestamp = Date.now();

    // Create test worksite
    const worksite = new Worksite({
      name: 'Test Worksite',
      customerName: 'Test Customer',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Australia'
      },
      contacts: [{
        name: 'Test Contact',
        email: `test-${timestamp}@example.com`,
        phone: '61123456789',
        isPrimary: true
      }],
      metadata: {
        createdBy: new mongoose.Types.ObjectId()
      }
    });
    await worksite.save();
    worksiteId = worksite._id.toString();

    // Create test users
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin-${timestamp}@test.com`,
      password: 'AdminPass123!',
      role: 'admin',
      emailVerified: true,
      worksites: [worksiteId]
    });
    await adminUser.save();
    adminUserId = adminUser._id.toString();

    const managerUser = new User({
      firstName: 'Manager',
      lastName: 'User', 
      email: `manager-${timestamp}@test.com`,
      password: 'ManagerPass123!',
      role: 'manager',
      emailVerified: true,
      worksites: [worksiteId]
    });
    await managerUser.save();
    managerUserId = managerUser._id.toString();

    const technicianUser = new User({
      firstName: 'Technician',
      lastName: 'User',
      email: `tech-${timestamp}@test.com`, 
      password: 'TechPass123!',
      role: 'technician',
      emailVerified: true,
      worksites: [worksiteId]
    });
    await technicianUser.save();
    technicianUserId = technicianUser._id.toString();

    // Generate tokens
    adminToken = generateAccessToken({
      id: adminUserId,
      email: `admin-${timestamp}@test.com`,
      role: 'admin',
      worksiteIds: [worksiteId]
    });

    managerToken = generateAccessToken({
      id: managerUserId,
      email: `manager-${timestamp}@test.com`, 
      role: 'manager',
      worksiteIds: [worksiteId]
    });

    technicianToken = generateAccessToken({
      id: technicianUserId,
      email: `tech-${timestamp}@test.com`,
      role: 'technician', 
      worksiteIds: [worksiteId]
    });
  });

  describe('GET /api/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should allow manager to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(3);
    });

    it('should deny technician access', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should filter users by search query', async () => {
      const response = await request(app)
        .get('/api/users?q=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].firstName).toBe('Admin');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=technician')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].role).toBe('technician');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should sort results', async () => {
      const response = await request(app)
        .get('/api/users?sort=firstName&order=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users[0].firstName).toBe('Admin');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should allow admin to get user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(technicianUserId);
      expect(response.body.data.user.firstName).toBe('Technician');
    });

    it('should allow manager to get user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(technicianUserId);
    });

    it('should deny technician access', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should allow admin to update any user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');
    });

    it('should allow user to update their own profile with limited fields', async () => {
      const updateData = {
        firstName: 'Updated',
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      };

      const response = await request(app)
        .put(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
    });

    it('should prevent non-admin from updating role', async () => {
      const updateData = {
        firstName: 'Updated',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.role).toBe('technician'); // Role unchanged
    });

    it('should prevent user from updating another user', async () => {
      const updateData = {
        firstName: 'Updated'
      };

      const response = await request(app)
        .put(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent duplicate email', async () => {
      const updateData = {
        email: `admin-${Date.now()}@test.com`
      };

      const response = await request(app)
        .put(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .put('/api/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should allow admin to deactivate user', async () => {
      const response = await request(app)
        .delete(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.isActive).toBe(false);
    });

    it('should deny manager access to delete users', async () => {
      const response = await request(app)
        .delete(`/api/users/${technicianUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CANNOT_DELETE_SELF');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .delete('/api/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PATCH /api/users/:id/worksites', () => {
    it('should allow admin to assign worksites', async () => {
      const response = await request(app)
        .patch(`/api/users/${technicianUserId}/worksites`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ worksiteIds: [worksiteId] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.worksites).toHaveLength(1);
    });

    it('should allow manager to assign worksites', async () => {
      const response = await request(app)
        .patch(`/api/users/${technicianUserId}/worksites`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ worksiteIds: [worksiteId] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.worksites).toHaveLength(1);
    });

    it('should deny technician access', async () => {
      const response = await request(app)
        .patch(`/api/users/${technicianUserId}/worksites`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ worksiteIds: [worksiteId] })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate worksite IDs', async () => {
      const response = await request(app)
        .patch(`/api/users/${technicianUserId}/worksites`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ worksiteIds: ['invalid-id'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .patch('/api/users/invalid-id/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ worksiteIds: [worksiteId] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/users/${fakeId}/worksites`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ worksiteIds: [worksiteId] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for all routes', async () => {
      await request(app).get('/api/users').expect(401);
      await request(app).get(`/api/users/${adminUserId}`).expect(401);
      await request(app).put(`/api/users/${adminUserId}`).send({}).expect(401);
      await request(app).delete(`/api/users/${adminUserId}`).expect(401);
      await request(app).patch(`/api/users/${adminUserId}/worksites`).send({}).expect(401);
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid-token';
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });
});