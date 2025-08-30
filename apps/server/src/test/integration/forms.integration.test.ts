import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { Worksite } from '../../models/Worksite.js';
import { Form } from '../../models/Form.js';
import authRoutes from '../../routes/auth.js';
import formsRoutes from '../../routes/forms.js';

let app: express.Application;

// Test data
let adminUser: any;
let managerUser: any;
let technicianUser: any;
let testWorksite: any;
let adminToken: string;
let managerToken: string;
let technicianToken: string;

// Test app setup
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/auth', authRoutes);
  testApp.use('/forms', formsRoutes);
  return testApp;
};

describe('Forms Routes Integration', () => {
  beforeEach(async () => {
    app = createTestApp();

    // Clean up collections
    await User.deleteMany({});
    await Worksite.deleteMany({});
    await Form.deleteMany({});

    // Create test users
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      role: 'admin',
      isActive: true,
    });

    managerUser = await User.create({
      firstName: 'Manager',
      lastName: 'User',
      email: `manager-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      role: 'manager',
      isActive: true,
    });

    technicianUser = await User.create({
      firstName: 'Technician',
      lastName: 'User',
      email: `technician-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      role: 'technician',
      isActive: true,
    });

    // Create test worksite
    testWorksite = await Worksite.create({
      name: 'Test Worksite',
      customerName: 'Test Customer',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country',
      },
      contacts: [
        {
          name: 'John Doe',
          position: 'Manager',
          phone: '+1234567890',
          email: 'john@test.com',
          isPrimary: true,
        },
      ],
      equipment: [],
      isActive: true,
      metadata: {
        createdBy: adminUser._id,
        serviceHistory: {
          totalForms: 0,
        },
      },
    });

    // Update manager and technician with worksite access
    managerUser.worksites = [testWorksite._id];
    technicianUser.worksites = [testWorksite._id];
    await managerUser.save();
    await technicianUser.save();

    // Generate tokens
    adminToken = jwt.sign(
      {
        userId: adminUser._id.toString(),
        id: adminUser._id.toString(),
        role: adminUser.role,
        worksiteIds: [],
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      {
        userId: managerUser._id.toString(),
        id: managerUser._id.toString(),
        role: managerUser.role,
        worksiteIds: [testWorksite._id.toString()],
        firstName: managerUser.firstName,
        lastName: managerUser.lastName,
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );

    technicianToken = jwt.sign(
      {
        userId: technicianUser._id.toString(),
        id: technicianUser._id.toString(),
        role: technicianUser.role,
        worksiteIds: [testWorksite._id.toString()],
        firstName: technicianUser.firstName,
        lastName: technicianUser.lastName,
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /forms', () => {
    beforeEach(async () => {
      // Create test forms with different statuses and assignments
      await Form.create([
        {
          worksite: testWorksite._id,
          technician: technicianUser._id,
          status: 'draft',
          customerInfo: {
            customerName: 'Customer A',
            plantLocation: 'Location A',
          },
          metadata: {
            createdBy: technicianUser._id,
          },
        },
        {
          worksite: testWorksite._id,
          technician: technicianUser._id,
          status: 'completed',
          customerInfo: {
            customerName: 'Customer B',
            plantLocation: 'Location B',
          },
          metadata: {
            createdBy: technicianUser._id,
          },
        },
        {
          worksite: testWorksite._id,
          technician: adminUser._id, // Different technician
          status: 'approved',
          customerInfo: {
            customerName: 'Customer C',
            plantLocation: 'Location C',
          },
          metadata: {
            createdBy: adminUser._id,
          },
        },
      ]);
    });

    it('should allow admin to get all forms', async () => {
      const response = await request(app)
        .get('/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    it('should allow manager to get worksite forms', async () => {
      const response = await request(app)
        .get('/forms')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(3); // All forms are from their worksite
    });

    it('should restrict technician to their own forms', async () => {
      const response = await request(app)
        .get('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(2); // Only their forms
      expect(
        response.body.data.forms.every(
          (form: any) => form.technician._id.toString() === technicianUser._id.toString()
        )
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/forms?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/forms?status=completed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(1);
      expect(response.body.data.forms[0].status).toBe('completed');
    });

    it('should support search by customer name', async () => {
      const response = await request(app)
        .get('/forms?q=Customer A')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(1);
      expect(response.body.data.forms[0].customerInfo.customerName).toBe('Customer A');
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/forms?sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(3);

      // Check that forms are sorted by creation date (newest first)
      const forms = response.body.data.forms;
      for (let i = 1; i < forms.length; i++) {
        expect(new Date(forms[i - 1].createdAt) >= new Date(forms[i].createdAt)).toBe(true);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/forms').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should populate related data', async () => {
      const response = await request(app)
        .get('/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const form = response.body.data.forms[0];
      expect(form.worksite).toBeDefined();
      expect(form.worksite.name).toBe('Test Worksite');
      expect(form.technician).toBeDefined();
      expect(form.technician.firstName).toBeDefined();
    });
  });

  describe('POST /forms', () => {
    const validFormData = {
      worksite: '',
      customerInfo: {
        customerName: 'New Customer',
        plantLocation: 'New Location',
        serviceDate: '2024-02-01',
        contactPerson: 'Jane Doe',
        contactEmail: 'jane@example.com',
        contactPhone: '+1234567890',
      },
      serviceType: {
        service: true,
        breakdown: false,
        calibration: false,
        installation: false,
        jobComplete: false,
      },
      dispenserSystems: [
        {
          tankNumber: 'TANK-001',
          chemicalProduct: 'Test Chemical',
          tankSize: 100,
          equipmentCondition: 'good',
          pumpCondition: 'good',
          pulseMeterCondition: 'good',
          dispenserCondition: 'good',
        },
      ],
      maintenanceDetails: {
        gcpTechnicianHours: 8,
        contractHours: 6,
        partsUsed: [],
        maintenanceProcedures: 'Standard maintenance procedures',
      },
      calibrationData: [],
      serviceChecklist: {
        workAreaCleaned: true,
        systemCheckedForLeaks: false,
      },
      additionalInfo: {
        notes: 'Test form creation',
      },
    };

    beforeEach(() => {
      validFormData.worksite = testWorksite._id.toString();
    });

    it('should create a new form successfully', async () => {
      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(validFormData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form).toBeDefined();
      expect(response.body.data.form.customerInfo.customerName).toBe('New Customer');
      expect(response.body.data.form.status).toBe('draft');
      expect(response.body.data.form.technician.toString()).toBe(technicianUser._id.toString());
      expect(response.body.data.form.formId).toMatch(/^GCP-\d{6}-[A-Z0-9]{4}$/);

      // Verify form is saved in database
      const savedForm = await Form.findById(response.body.data.form._id);
      expect(savedForm).toBeTruthy();
    });

    it('should auto-assign current user as technician', async () => {
      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(validFormData)
        .expect(201);

      expect(response.body.data.form.technician.toString()).toBe(technicianUser._id.toString());
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validFormData };
      delete (invalidData.customerInfo as any).customerName;

      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate worksite exists and user has access', async () => {
      const invalidData = { ...validFormData };
      invalidData.worksite = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Worksite not found');
    });

    it('should validate dispenser systems', async () => {
      const invalidData = { ...validFormData };
      invalidData.dispenserSystems[0].equipmentCondition = 'invalid' as any;

      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/forms').send(validFormData).expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should allow managers to create forms', async () => {
      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(validFormData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow admins to create forms', async () => {
      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validFormData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /forms/:id', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await Form.create({
        worksite: testWorksite._id,
        technician: technicianUser._id,
        status: 'draft',
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Test Location',
        },
        metadata: {
          createdBy: technicianUser._id,
        },
      });
    });

    it('should get form by id for authorized user', async () => {
      const response = await request(app)
        .get(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form._id).toBe(testForm._id.toString());
      expect(response.body.data.form.customerInfo.customerName).toBe('Test Customer');
    });

    it('should allow admin to view any form', async () => {
      const response = await request(app)
        .get(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form._id).toBe(testForm._id.toString());
    });

    it('should allow manager to view worksite forms', async () => {
      const response = await request(app)
        .get(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Form not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/forms/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/forms/${testForm._id}`).expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should populate related data', async () => {
      const response = await request(app)
        .get(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      const form = response.body.data.form;
      expect(form.worksite).toBeDefined();
      expect(form.worksite.name).toBe('Test Worksite');
      expect(form.technician).toBeDefined();
      expect(form.technician.firstName).toBe('Technician');
    });
  });

  describe('PUT /forms/:id', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await Form.create({
        worksite: testWorksite._id,
        technician: technicianUser._id,
        status: 'draft',
        customerInfo: {
          customerName: 'Original Customer',
          plantLocation: 'Original Location',
        },
        metadata: {
          createdBy: technicianUser._id,
        },
      });
    });

    it('should update form for authorized user', async () => {
      const updateData = {
        customerInfo: {
          customerName: 'Updated Customer',
          plantLocation: 'Updated Location',
        },
        status: 'completed',
      };

      const response = await request(app)
        .put(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form.customerInfo.customerName).toBe('Updated Customer');
      expect(response.body.data.form.status).toBe('completed');
    });

    it('should allow admin to update any form', async () => {
      const updateData = {
        customerInfo: {
          customerName: 'Admin Updated',
          plantLocation: 'Admin Location',
        },
      };

      const response = await request(app)
        .put(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form.customerInfo.customerName).toBe('Admin Updated');
    });

    it('should prevent updating approved forms', async () => {
      // Update form status to approved
      testForm.status = 'approved';
      await testForm.save();

      const updateData = {
        customerInfo: {
          customerName: 'Should Not Update',
        },
      };

      const response = await request(app)
        .put(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be edited');
    });

    it('should validate update data', async () => {
      const invalidData = {
        customerInfo: {
          customerName: '', // Invalid empty name
        },
      };

      const response = await request(app)
        .put(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerInfo: { customerName: 'Test' } })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).put(`/forms/${testForm._id}`).send({}).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /forms/:id', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await Form.create({
        worksite: testWorksite._id,
        technician: technicianUser._id,
        status: 'draft',
        customerInfo: {
          customerName: 'Delete Customer',
          plantLocation: 'Delete Location',
        },
        metadata: {
          createdBy: technicianUser._id,
        },
      });
    });

    it('should allow admin to delete forms', async () => {
      const response = await request(app)
        .delete(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify form is deleted
      const deletedForm = await Form.findById(testForm._id);
      expect(deletedForm).toBeNull();
    });

    it('should allow manager to delete draft forms', async () => {
      const response = await request(app)
        .delete(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent technician from deleting forms', async () => {
      const response = await request(app)
        .delete(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should prevent deletion of approved forms', async () => {
      testForm.status = 'approved';
      await testForm.save();

      const response = await request(app)
        .delete(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(`/forms/${testForm._id}`).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      await mongoose.connection.close();

      const response = await request(app)
        .get('/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      await mongoose.connect(mongoServer.getUri());
    });

    it('should handle malformed request body', async () => {
      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle very large request payloads gracefully', async () => {
      const largeData = {
        worksite: testWorksite._id.toString(),
        customerInfo: {
          customerName: 'x'.repeat(10000), // Very long name
          plantLocation: 'Test Location',
        },
        additionalInfo: {
          notes: 'x'.repeat(5000), // Very long notes
        },
      };

      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(largeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      // Create multiple forms for performance testing
      const forms = [];
      for (let i = 0; i < 50; i++) {
        forms.push({
          worksite: testWorksite._id,
          technician: technicianUser._id,
          status: i % 3 === 0 ? 'draft' : i % 3 === 1 ? 'completed' : 'approved',
          customerInfo: {
            customerName: `Customer ${i}`,
            plantLocation: `Location ${i}`,
          },
          metadata: {
            createdBy: technicianUser._id,
          },
        });
      }
      await Form.insertMany(forms);
    });

    it('should handle large result sets with pagination', async () => {
      const response = await request(app)
        .get('/forms?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(10);
      expect(response.body.data.total).toBe(50);
    });

    it('should perform search efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/forms?q=Customer 1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
