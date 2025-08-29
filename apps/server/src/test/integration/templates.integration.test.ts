import { describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from '../utils/testApp.js';
import { User } from '../../models/User.js';
import { Template } from '../../models/Template.js';
import { Form } from '../../models/Form.js';
import { generateAccessToken } from '../../utils/jwt.js';
import type { Express } from 'express';

describe('Templates API Integration Tests', () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let technicianToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let technicianUserId: string;
  let templateId: string;

  beforeEach(async () => {
    app = createTestApp();

    // Clean up database
    await User.deleteMany({});
    await Template.deleteMany({});
    await Form.deleteMany({});

    const timestamp = Date.now();

    // Create test users first
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin-${timestamp}@test.com`,
      password: 'AdminPass123!',
      role: 'admin',
      emailVerified: true,
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
    });
    await technicianUser.save();
    technicianUserId = technicianUser._id.toString();

    // Create test template after users are created
    const template = new Template({
      name: 'Test Template',
      category: 'inspection',
      description: 'A test template for integration testing',
      elements: [
        {
          id: 'field1',
          type: 'text',
          label: 'Test Field 1',
          required: true,
          validation: {
            required: true,
            minLength: 1,
          },
        },
        {
          id: 'field2',
          type: 'number',
          label: 'Test Field 2',
          required: false,
        },
      ],
      status: 'active',
      createdBy: new mongoose.Types.ObjectId(adminUserId),
      metadata: {
        version: 1,
      },
      permissions: {
        canView: ['admin', 'manager', 'technician'],
        canUse: ['admin', 'manager', 'technician'],
        canEdit: ['admin', 'manager'],
      },
      usage: {
        totalForms: 0,
        lastUsed: null,
      },
    });
    await template.save();
    templateId = template._id.toString();

    // Generate tokens
    adminToken = generateAccessToken({
      id: adminUserId,
      email: `admin-${timestamp}@test.com`,
      role: 'admin',
      worksiteIds: [],
    });

    managerToken = generateAccessToken({
      id: managerUserId,
      email: `manager-${timestamp}@test.com`,
      role: 'manager',
      worksiteIds: [],
    });

    technicianToken = generateAccessToken({
      id: technicianUserId,
      email: `tech-${timestamp}@test.com`,
      role: 'technician',
      worksiteIds: [],
    });
  });

  describe('GET /api/templates', () => {
    it('should get all templates for admin', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1);
      expect(response.body.data.templates[0].name).toBe('Test Template');
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter templates by category', async () => {
      const response = await request(app)
        .get('/api/templates?category=inspection')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1);
      expect(response.body.data.templates[0].category).toBe('inspection');
    });

    it('should filter templates by status', async () => {
      const response = await request(app)
        .get('/api/templates?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1);
      expect(response.body.data.templates[0].status).toBe('active');
    });

    it('should search templates', async () => {
      const response = await request(app)
        .get('/api/templates?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/templates?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should sort templates', async () => {
      const response = await request(app)
        .get('/api/templates?sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should get template by ID for authorized user', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template._id).toBe(templateId);
      expect(response.body.data.template.name).toBe('Test Template');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid template ID', async () => {
      const response = await request(app)
        .get('/api/templates/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/templates', () => {
    const validTemplateData = {
      name: 'New Template',
      category: 'maintenance',
      description: 'A new test template',
      elements: [
        {
          id: 'new-field',
          type: 'text',
          label: 'New Field',
          required: true,
        },
      ],
    };

    it('should allow admin to create template', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validTemplateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('New Template');
      expect(response.body.data.template.category).toBe('maintenance');
    });

    it('should allow manager to create template', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(validTemplateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('New Template');
    });

    it('should deny technician access to create template', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(validTemplateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Template',
        // Missing category and elements
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate category', async () => {
      const invalidCategoryData = {
        ...validTemplateData,
        category: 'invalid-category',
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCategoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/templates/:id', () => {
    const updateData = {
      name: 'Updated Template',
      category: 'service',
      description: 'Updated description',
      elements: [
        {
          id: 'updated-field',
          type: 'text',
          label: 'Updated Field',
          required: false,
        },
      ],
    };

    it('should allow admin to update template', async () => {
      const response = await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('Updated Template');
      expect(response.body.data.template.category).toBe('service');
    });

    it('should allow manager to update template', async () => {
      const response = await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('Updated Template');
    });

    it('should deny technician access to update template', async () => {
      const response = await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('should allow admin to delete unused template', async () => {
      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny manager access to delete template', async () => {
      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent deletion of template in use', async () => {
      // Create a form using the template
      const form = new Form({
        formId: 'TEST-001',
        worksite: new mongoose.Types.ObjectId(),
        technician: technicianUserId,
        templateUsed: templateId,
        status: 'draft',
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Test Location',
        },
        formData: {},
        metadata: {
          createdBy: new mongoose.Types.ObjectId(technicianUserId),
          syncStatus: 'synced',
          version: 1,
        },
      });
      await form.save();

      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('being used');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/templates/:id/clone', () => {
    it('should allow admin to clone template', async () => {
      const response = await request(app)
        .post(`/api/templates/${templateId}/clone`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cloned Template' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('Cloned Template');
      expect(response.body.data.template._id).not.toBe(templateId);
    });

    it('should require name for cloned template', async () => {
      const response = await request(app)
        .post(`/api/templates/${templateId}/clone`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/templates/${fakeId}/clone`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cloned Template' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/templates/:id/status', () => {
    it('should allow admin to change template status', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'archived', comment: 'Archiving for testing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.status).toBe('archived');
    });

    it('should allow manager to change template status', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'draft' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.status).toBe('draft');
    });

    it('should deny technician access to change status', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'archived' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/templates/:id/forms', () => {
    it('should get forms created from template', async () => {
      // Create a form using the template
      const form = new Form({
        formId: 'TEST-002',
        worksite: new mongoose.Types.ObjectId(),
        technician: technicianUserId,
        templateUsed: templateId,
        status: 'draft',
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Test Location',
        },
        formData: {},
        metadata: {
          createdBy: new mongoose.Types.ObjectId(technicianUserId),
          syncStatus: 'synced',
          version: 1,
        },
      });
      await form.save();

      const response = await request(app)
        .get(`/api/templates/${templateId}/forms`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(1);
      expect(response.body.data.forms[0].templateUsed).toBe(templateId);
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/templates/${fakeId}/forms`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/templates/meta/categories', () => {
    it('should get template categories with counts', async () => {
      const response = await request(app)
        .get('/api/templates/meta/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for all routes', async () => {
      await request(app).get('/api/templates').expect(401);
      await request(app).get(`/api/templates/${templateId}`).expect(401);
      await request(app).post('/api/templates').send({}).expect(401);
      await request(app).put(`/api/templates/${templateId}`).send({}).expect(401);
      await request(app).delete(`/api/templates/${templateId}`).expect(401);
      await request(app).post(`/api/templates/${templateId}/clone`).send({}).expect(401);
      await request(app).patch(`/api/templates/${templateId}/status`).send({}).expect(401);
      await request(app).get(`/api/templates/${templateId}/forms`).expect(401);
      await request(app).get('/api/templates/meta/categories').expect(401);
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid-token';
      await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });
});
