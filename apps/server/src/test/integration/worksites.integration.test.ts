import { describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from '../utils/testApp.js';
import { User } from '../../models/User.js';
import { Worksite } from '../../models/Worksite.js';
import { Template } from '../../models/Template.js';
import { generateAccessToken } from '../../utils/jwt.js';
import type { Express } from 'express';

describe('Worksites API Integration Tests', () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let technicianToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let technicianUserId: string;
  let worksiteId: string;
  let templateId: string;

  beforeEach(async () => {
    app = createTestApp();

    // Clean up database
    await User.deleteMany({});
    await Worksite.deleteMany({});
    await Template.deleteMany({});

    const timestamp = Date.now();

    // Create test template
    const template = new Template({
      name: 'Test Template',
      category: 'inspection',
      description: 'Test template for worksites',
      elements: [
        {
          id: 'test-field',
          type: 'text',
          label: 'Test Field',
          required: true,
        },
      ],
      status: 'active',
      metadata: {
        createdBy: new mongoose.Types.ObjectId(),
        version: 1,
      },
    });
    await template.save();
    templateId = template._id.toString();

    // Create test worksite
    const worksite = new Worksite({
      name: 'Test Worksite',
      customerName: 'Test Customer',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Australia',
      },
      contacts: [
        {
          name: 'Test Contact',
          position: 'Manager',
          email: `test-${timestamp}@example.com`,
          phone: '1234567890',
          isPrimary: true,
        },
      ],
      equipment: [],
      isActive: true,
      metadata: {
        createdBy: new mongoose.Types.ObjectId(),
        defaultFormTemplate: template._id,
        serviceHistory: { totalForms: 0 },
      },
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
      worksites: [worksiteId],
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
      worksites: [worksiteId],
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
      worksites: [worksiteId],
    });
    await technicianUser.save();
    technicianUserId = technicianUser._id.toString();

    // Generate tokens
    adminToken = generateAccessToken({
      id: adminUserId,
      email: `admin-${timestamp}@test.com`,
      role: 'admin',
      worksiteIds: [worksiteId],
    });

    managerToken = generateAccessToken({
      id: managerUserId,
      email: `manager-${timestamp}@test.com`,
      role: 'manager',
      worksiteIds: [worksiteId],
    });

    technicianToken = generateAccessToken({
      id: technicianUserId,
      email: `tech-${timestamp}@test.com`,
      role: 'technician',
      worksiteIds: [worksiteId],
    });
  });

  describe('GET /api/worksites', () => {
    it('should allow admin to get all worksites', async () => {
      const response = await request(app)
        .get('/api/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksites).toHaveLength(1);
      expect(response.body.data.worksites[0].name).toBe('Test Worksite');
      expect(response.body.data.worksites[0].customerName).toBe('Test Customer');
    });

    it('should allow manager to get assigned worksites only', async () => {
      const response = await request(app)
        .get('/api/worksites')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksites).toHaveLength(1);
      expect(response.body.data.worksites[0].name).toBe('Test Worksite');
    });

    it('should allow technician to get assigned worksites only', async () => {
      const response = await request(app)
        .get('/api/worksites')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksites).toHaveLength(1);
      expect(response.body.data.worksites[0].name).toBe('Test Worksite');
    });

    it('should include populated template data', async () => {
      const response = await request(app)
        .get('/api/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksites[0].defaultTemplate).toBeDefined();
    });
  });

  describe('GET /api/worksites/:id', () => {
    it('should allow admin to get worksite by ID', async () => {
      const response = await request(app)
        .get(`/api/worksites/${worksiteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksite.id).toBe(worksiteId);
      expect(response.body.data.worksite.name).toBe('Test Worksite');
      expect(response.body.data.worksite.address).toBeDefined();
      expect(response.body.data.worksite.contacts).toHaveLength(1);
      expect(response.body.data.worksite.defaultTemplate).toBeDefined();
    });

    it('should allow assigned user to get worksite details', async () => {
      const response = await request(app)
        .get(`/api/worksites/${worksiteId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksite.id).toBe(worksiteId);
    });

    it('should deny access to non-assigned users', async () => {
      // Create a user not assigned to the worksite
      const unassignedUser = new User({
        firstName: 'Unassigned',
        lastName: 'User',
        email: `unassigned-${Date.now()}@test.com`,
        password: 'UnassignedPass123!',
        role: 'technician',
        emailVerified: true,
        worksites: [],
      });
      await unassignedUser.save();

      const unassignedToken = generateAccessToken({
        id: unassignedUser._id.toString(),
        email: unassignedUser.email,
        role: 'technician',
        worksiteIds: [],
      });

      const response = await request(app)
        .get(`/api/worksites/${worksiteId}`)
        .set('Authorization', `Bearer ${unassignedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent worksite', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/worksites/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('WORKSITE_NOT_FOUND');
    });
  });

  describe('POST /api/worksites', () => {
    const validWorksiteData = {
      name: 'New Worksite',
      customerName: 'New Customer',
      address: {
        street: '456 New St',
        city: 'New City',
        state: 'New State',
        zipCode: '54321',
        country: 'Australia',
      },
      contacts: [
        {
          name: 'New Contact',
          position: 'Supervisor',
          email: `newcontact-${Date.now()}@example.com`,
          phone: '987-654-3210',
          isPrimary: true,
        },
      ],
      equipment: [],
      defaultTemplate: templateId,
    };

    it('should allow admin to create new worksite', async () => {
      const response = await request(app)
        .post('/api/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validWorksiteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksite.name).toBe('New Worksite');
      expect(response.body.data.worksite.customerName).toBe('New Customer');
      expect(response.body.data.worksite.isActive).toBe(true);
      expect(response.body.data.worksite.defaultTemplate).toBe(templateId);
    });

    it('should deny manager access to create worksite', async () => {
      const response = await request(app)
        .post('/api/worksites')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(validWorksiteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny technician access to create worksite', async () => {
      const response = await request(app)
        .post('/api/worksites')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(validWorksiteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Worksite',
        // Missing customerName and address
      };

      const response = await request(app)
        .post('/api/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors).toBeDefined();
    });

    it('should validate template ID if provided', async () => {
      const invalidTemplateData = {
        ...validWorksiteData,
        defaultTemplate: 'invalid-template-id',
      };

      const response = await request(app)
        .post('/api/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTemplateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TEMPLATE');
    });

    it('should create worksite without default template', async () => {
      const { defaultTemplate, ...worksiteWithoutTemplate } = validWorksiteData;

      const response = await request(app)
        .post('/api/worksites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(worksiteWithoutTemplate)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksite.name).toBe('New Worksite');
      expect(response.body.data.worksite.defaultTemplate).toBeUndefined();
    });
  });

  describe('PATCH /api/worksites/:id/template', () => {
    it('should allow admin to assign template to worksite', async () => {
      // Create another template
      const newTemplate = new Template({
        name: 'New Template',
        category: 'maintenance',
        description: 'New template for assignment',
        elements: [
          {
            id: 'new-field',
            type: 'text',
            label: 'New Field',
            required: false,
          },
        ],
        status: 'active',
        metadata: {
          createdBy: new mongoose.Types.ObjectId(),
          version: 1,
        },
      });
      await newTemplate.save();

      const response = await request(app)
        .patch(`/api/worksites/${worksiteId}/template`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: newTemplate._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.worksite.defaultTemplate._id).toBe(newTemplate._id.toString());
    });

    it('should allow admin to remove template from worksite', async () => {
      const response = await request(app)
        .patch(`/api/worksites/${worksiteId}/template`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: null })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');
    });

    it('should deny manager access', async () => {
      const response = await request(app)
        .patch(`/api/worksites/${worksiteId}/template`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ templateId })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent worksite', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/worksites/${fakeId}/template`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('WORKSITE_NOT_FOUND');
    });

    it('should validate template exists', async () => {
      const fakeTemplateId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/worksites/${worksiteId}/template`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: fakeTemplateId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TEMPLATE');
    });

    it('should require template to be active', async () => {
      // Create inactive template
      const inactiveTemplate = new Template({
        name: 'Inactive Template',
        category: 'inspection',
        description: 'Inactive template',
        elements: [],
        status: 'draft',
        metadata: {
          createdBy: new mongoose.Types.ObjectId(),
          version: 1,
        },
      });
      await inactiveTemplate.save();

      const response = await request(app)
        .patch(`/api/worksites/${worksiteId}/template`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: inactiveTemplate._id.toString() })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TEMPLATE_NOT_ACTIVE');
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for all routes', async () => {
      await request(app).get('/api/worksites').expect(401);
      await request(app).get(`/api/worksites/${worksiteId}`).expect(401);
      await request(app).post('/api/worksites').send({}).expect(401);
      await request(app).patch(`/api/worksites/${worksiteId}/template`).send({}).expect(401);
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid-token';
      await request(app)
        .get('/api/worksites')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });
});
