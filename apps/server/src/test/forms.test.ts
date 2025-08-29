import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import formRoutes from '../routes/forms.js';
import { User } from '../models/User.js';
import { Worksite } from '../models/Worksite.js';
import { Form } from '../models/Form.js';
import { authenticate } from '../middleware/auth.js';

let app: express.Application;
let testUser: any;
let testWorksite: any;
let accessToken: string;

// Test app setup
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/forms', authenticate, formRoutes);
  return testApp;
};

describe('Forms Routes', () => {
  beforeEach(async () => {
    app = createTestApp();
    
    // Clean up before each test
    await User.deleteMany({});
    await Worksite.deleteMany({});
    await Form.deleteMany({});

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    testUser = await User.create({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: hashedPassword,
      role: 'technician',
      isActive: true,
    });

    // Create test worksite
    testWorksite = await Worksite.create({
      name: 'Test Site',
      location: 'Test Location',
      address: '123 Test St',
      contactPerson: 'John Doe',
      contactPhone: '+1234567890',
      contactEmail: 'john@test.com',
      isActive: true,
      createdBy: testUser._id,
    });

    // Generate access token
    accessToken = jwt.sign(
      { 
        userId: testUser._id.toString(), 
        role: testUser.role 
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );
  });


  describe('GET /forms', () => {
    beforeEach(async () => {
      // Create test forms
      await Form.create([
        {
          formId: 'FORM-001',
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'draft',
          customerInfo: {
            customerName: 'Customer 1',
            plantLocation: 'Location 1',
            serviceDate: new Date('2024-01-15'),
          },
          serviceDetails: {
            serviceType: 'Maintenance',
            workPerformed: 'Basic maintenance',
          },
          completionPercentage: 50,
        },
        {
          formId: 'FORM-002',
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'completed',
          customerInfo: {
            customerName: 'Customer 2',
            plantLocation: 'Location 2',
            serviceDate: new Date('2024-01-16'),
          },
          serviceDetails: {
            serviceType: 'Repair',
            workPerformed: 'Equipment repair',
          },
          completionPercentage: 100,
        },
      ]);
    });

    it('should get all forms for authenticated user', async () => {
      const response = await request(app)
        .get('/forms')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it('should filter forms by status', async () => {
      const response = await request(app)
        .get('/forms?status=completed')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(1);
      expect(response.body.data.forms[0].status).toBe('completed');
    });

    it('should search forms by customer name', async () => {
      const response = await request(app)
        .get('/forms?search=Customer 1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(1);
      expect(response.body.data.forms[0].customerInfo.customerName).toBe('Customer 1');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/forms?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/forms')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /forms', () => {
    it('should create a new form', async () => {
      const formData = {
        worksite: testWorksite._id.toString(),
        customerInfo: {
          customerName: 'New Customer',
          plantLocation: 'New Location',
          serviceDate: '2024-02-01',
          contactPerson: 'Jane Doe',
          contactEmail: 'jane@example.com',
          contactPhone: '+1234567890',
          equipmentType: 'Pump',
          equipmentModel: 'Model X',
          serialNumber: 'SN12345',
        },
        serviceDetails: {
          serviceType: 'Installation',
          workPerformed: 'New equipment installation',
          gcpTechnicianHours: 8,
          contractHours: 6,
        },
        serviceChecklist: {
          workAreaCleaned: true,
          systemCheckedForLeaks: false,
        },
        additionalInfo: {
          notes: 'Test installation notes',
        },
      };

      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(formData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form.customerInfo.customerName).toBe('New Customer');
      expect(response.body.data.form.status).toBe('draft');
      expect(response.body.data.form.technician.toString()).toBe(testUser._id.toString());
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/forms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/forms')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /forms/:id', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await Form.create({
        formId: 'FORM-TEST',
        worksite: testWorksite._id,
        technician: testUser._id,
        status: 'draft',
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Test Location',
          serviceDate: new Date('2024-01-15'),
        },
        serviceDetails: {
          serviceType: 'Maintenance',
          workPerformed: 'Test maintenance',
        },
        completionPercentage: 75,
      });
    });

    it('should get form by id', async () => {
      const response = await request(app)
        .get(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form._id).toBe(testForm._id.toString());
      expect(response.body.data.form.customerInfo.customerName).toBe('Test Customer');
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Form not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/forms/${testForm._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /forms/:id', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await Form.create({
        formId: 'FORM-UPDATE',
        worksite: testWorksite._id,
        technician: testUser._id,
        status: 'draft',
        customerInfo: {
          customerName: 'Original Customer',
          plantLocation: 'Original Location',
          serviceDate: new Date('2024-01-15'),
        },
        serviceDetails: {
          serviceType: 'Maintenance',
          workPerformed: 'Original work',
        },
        completionPercentage: 25,
      });
    });

    it('should update existing form', async () => {
      const updateData = {
        customerInfo: {
          customerName: 'Updated Customer',
          plantLocation: 'Updated Location',
          serviceDate: '2024-01-20',
        },
        serviceDetails: {
          serviceType: 'Repair',
          workPerformed: 'Updated work performed',
        },
        completionPercentage: 90,
      };

      const response = await request(app)
        .put(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.form.customerInfo.customerName).toBe('Updated Customer');
      expect(response.body.data.form.serviceDetails.serviceType).toBe('Repair');
      expect(response.body.data.form.completionPercentage).toBe(90);
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerInfo: { customerName: 'Test' } })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/forms/${testForm._id}`)
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /forms/:id', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await Form.create({
        formId: 'FORM-DELETE',
        worksite: testWorksite._id,
        technician: testUser._id,
        status: 'draft',
        customerInfo: {
          customerName: 'Delete Customer',
          plantLocation: 'Delete Location',
          serviceDate: new Date('2024-01-15'),
        },
        serviceDetails: {
          serviceType: 'Maintenance',
          workPerformed: 'Delete work',
        },
        completionPercentage: 10,
      });
    });

    it('should delete form', async () => {
      const response = await request(app)
        .delete(`/forms/${testForm._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify form is deleted
      const deletedForm = await Form.findById(testForm._id);
      expect(deletedForm).toBeNull();
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/forms/${testForm._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});