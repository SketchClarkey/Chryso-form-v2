import { describe, it, expect, beforeEach } from 'vitest';
import { Form, IForm } from '../../models/Form.js';
import { User } from '../../models/User.js';
import { Worksite } from '../../models/Worksite.js';

let testUser: any;
let testWorksite: any;

describe('Form Model', () => {
  beforeEach(async () => {
    // Clear collections and create test data
    await Form.deleteMany({});
    await User.deleteMany({});
    await Worksite.deleteMany({});

    // Create test user and worksite
    testUser = await User.create({
      email: `technician-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Technician',
      role: 'technician',
    });

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
        createdBy: testUser._id,
        serviceHistory: {
          totalForms: 0,
        },
      },
    });
  });

  describe('Form Creation', () => {
    it('should create a form with required fields', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);

      expect(form.worksite.toString()).toBe(testWorksite._id.toString());
      expect(form.technician.toString()).toBe(testUser._id.toString());
      expect(form.customerInfo.customerName).toBe('Test Customer');
      expect(form.customerInfo.plantLocation).toBe('Plant Location');
      expect(form.status).toBe('draft');
      expect(form.metadata.version).toBe(1);
      expect(form.metadata.syncStatus).toBe('synced');
      expect(form.metadata.offlineCreated).toBe(false);
      expect(form.metadata.autoSaveEnabled).toBe(true);
      expect(form.formId).toBeTruthy();
      expect(form.formId).toMatch(/^GCP-\d{6}-[A-Z0-9]{4}$/);
    });

    it('should fail validation for missing required fields', async () => {
      const incompleteData = {
        worksite: testWorksite._id,
        // Missing technician and customerInfo
      };

      await expect(Form.create(incompleteData)).rejects.toThrow();
    });

    it('should fail validation for missing customer name', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          // Missing customerName
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow(/Customer name is required/);
    });

    it('should fail validation for missing plant location', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          // Missing plantLocation
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow(/Plant location is required/);
    });

    it('should validate status enum values', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        status: 'invalid-status' as any,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow();
    });
  });

  describe('Form ID Generation', () => {
    it('should auto-generate formId if not provided', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);
      expect(form.formId).toBeTruthy();
      expect(form.formId).toMatch(/^GCP-\d{6}-[A-Z0-9]{4}$/);
    });

    it('should use provided formId if given', async () => {
      const customFormId = 'CUSTOM-FORM-001';
      const formData = {
        formId: customFormId,
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);
      expect(form.formId).toBe(customFormId);
    });

    it('should generate unique formId', () => {
      const form = new Form({
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      });

      const formId1 = form.generateFormId();
      const formId2 = form.generateFormId();

      expect(formId1).toMatch(/^GCP-\d{6}-[A-Z0-9]{4}$/);
      expect(formId2).toMatch(/^GCP-\d{6}-[A-Z0-9]{4}$/);
      expect(formId1).not.toBe(formId2);
    });
  });

  describe('Dispenser Systems', () => {
    it('should validate dispenser system required fields', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        dispenserSystems: [
          {
            // Missing required fields
            equipmentCondition: 'good',
            pumpCondition: 'good',
            pulseMeterCondition: 'good',
            dispenserCondition: 'good',
          },
        ],
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow();
    });

    it('should validate dispenser system condition enums', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        dispenserSystems: [
          {
            tankNumber: 'TANK-001',
            chemicalProduct: 'Test Chemical',
            tankSize: 100,
            equipmentCondition: 'invalid-condition' as any,
            pumpCondition: 'good',
            pulseMeterCondition: 'good',
            dispenserCondition: 'good',
          },
        ],
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow();
    });

    it('should create form with valid dispenser systems', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        dispenserSystems: [
          {
            tankNumber: 'TANK-001',
            chemicalProduct: 'Test Chemical',
            tankSize: 100,
            equipmentCondition: 'excellent',
            pumpCondition: 'good',
            pulseMeterCondition: 'fair',
            dispenserCondition: 'poor',
            pumpModel: 'Pump Model X',
            pulseMeterType: 'Digital',
            dispenserType: 'Automatic',
          },
        ],
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);
      expect(form.dispenserSystems).toHaveLength(1);
      expect(form.dispenserSystems[0].tankNumber).toBe('TANK-001');
      expect(form.dispenserSystems[0].chemicalProduct).toBe('Test Chemical');
      expect(form.dispenserSystems[0].tankSize).toBe(100);
    });
  });

  describe('Calibration Data', () => {
    it('should validate calibration data required fields', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        calibrationData: [
          {
            productName: 'Test Product',
            // Missing other required fields
          },
        ],
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow();
    });

    it('should validate positive values for calibration data', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        calibrationData: [
          {
            productName: 'Test Product',
            doseRate: -5, // Invalid negative value
            cementContent: 100,
            batchTotal: 1000,
            actualMeasurement: 95,
            resultPercentage: 95,
            graduatedMeasureId: 'GM-001',
          },
        ],
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow(/must be positive/);
    });

    it('should create form with valid calibration data', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        calibrationData: [
          {
            productName: 'Test Product',
            doseRate: 5.5,
            cementContent: 100,
            batchTotal: 1000,
            actualMeasurement: 95.2,
            resultPercentage: 95.2,
            graduatedMeasureId: 'GM-001',
          },
        ],
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);
      expect(form.calibrationData).toHaveLength(1);
      expect(form.calibrationData[0].productName).toBe('Test Product');
      expect(form.calibrationData[0].doseRate).toBe(5.5);
      expect(form.calibrationData[0].resultPercentage).toBe(95.2);
    });
  });

  describe('Service Checklist', () => {
    it('should initialize service checklist with default values', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);
      expect(form.serviceChecklist.workAreaCleaned).toBe(false);
      expect(form.serviceChecklist.siteTablesReplaced).toBe(false);
      expect(form.serviceChecklist.systemCheckedForLeaks).toBe(false);
      expect(form.serviceChecklist.pulseMetersLabeled).toBe(false);
      expect(form.serviceChecklist.pumpsLabeled).toBe(false);
      expect(form.serviceChecklist.tanksLabeled).toBe(false);
      expect(form.serviceChecklist.dispensersLabeled).toBe(false);
      expect(form.serviceChecklist.calibrationPointsReturned).toBe(false);
    });
  });

  describe('Digital Signatures', () => {
    it('should create form with digital signatures', async () => {
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        signatures: {
          customer: {
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...',
            signedBy: 'John Customer',
            ipAddress: '192.168.1.100',
          },
          servicePerson: {
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgB...',
            signedBy: 'Tech Person',
            ipAddress: '192.168.1.101',
          },
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      const form = await Form.create(formData);
      expect(form.signatures.customer?.signedBy).toBe('John Customer');
      expect(form.signatures.customer?.ipAddress).toBe('192.168.1.100');
      expect(form.signatures.servicePerson?.signedBy).toBe('Tech Person');
      expect(form.signatures.customer?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Virtual Properties', () => {
    describe('completionPercentage', () => {
      it('should calculate 0% for minimal form', async () => {
        const form = await Form.create({
          worksite: testWorksite._id,
          technician: testUser._id,
          customerInfo: {
            customerName: 'Test Customer',
            plantLocation: 'Plant Location',
          },
          metadata: {
            createdBy: testUser._id,
          },
        });

        expect(form.completionPercentage).toBe(40); // 2/5 required sections completed
      });

      it('should calculate 100% for complete form', async () => {
        const form = await Form.create({
          worksite: testWorksite._id,
          technician: testUser._id,
          customerInfo: {
            customerName: 'Test Customer',
            plantLocation: 'Plant Location',
          },
          serviceType: {
            service: true,
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
          serviceChecklist: {
            workAreaCleaned: true,
            siteTablesReplaced: true,
            systemCheckedForLeaks: true,
            pulseMetersLabeled: true,
            pumpsLabeled: true,
            tanksLabeled: true,
            dispensersLabeled: true,
            calibrationPointsReturned: true,
          },
          metadata: {
            createdBy: testUser._id,
          },
        });

        expect(form.completionPercentage).toBe(80); // 4/5 sections completed (all except checklist)
      });
    });
  });

  describe('Instance Methods', () => {
    let testForm: IForm;

    beforeEach(async () => {
      testForm = await Form.create({
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      });
    });

    describe('canBeEditedBy', () => {
      it('should allow admin to edit any form', () => {
        expect(testForm.canBeEditedBy('admin123', 'admin')).toBe(true);
      });

      it('should allow manager to edit forms unless approved/archived', () => {
        expect(testForm.canBeEditedBy('manager123', 'manager')).toBe(true);

        testForm.status = 'approved';
        expect(testForm.canBeEditedBy('manager123', 'manager')).toBe(false);

        testForm.status = 'archived';
        expect(testForm.canBeEditedBy('manager123', 'manager')).toBe(false);
      });

      it('should allow technician to edit their own forms', () => {
        expect(testForm.canBeEditedBy(testUser._id.toString(), 'technician')).toBe(true);
        expect(testForm.canBeEditedBy('other-tech-id', 'technician')).toBe(false);
      });

      it('should not allow editing of approved forms', () => {
        testForm.status = 'approved';
        expect(testForm.canBeEditedBy(testUser._id.toString(), 'technician')).toBe(false);
      });

      it('should not allow editing of archived forms', () => {
        testForm.status = 'archived';
        expect(testForm.canBeEditedBy(testUser._id.toString(), 'technician')).toBe(false);
      });
    });

    describe('getStatusHistory', () => {
      it('should return basic status history for draft form', () => {
        const history = testForm.getStatusHistory();
        expect(history).toHaveLength(1);
        expect(history[0].status).toBe('draft');
        expect(history[0].timestamp).toEqual(testForm.createdAt);
        expect(history[0].userId?.toString()).toBe(testUser._id.toString());
      });

      it('should include submission in status history', async () => {
        const submissionDate = new Date();
        testForm.submittedAt = submissionDate;
        await testForm.save();

        const history = testForm.getStatusHistory();
        expect(history).toHaveLength(2);
        expect(history[1].status).toBe('completed');
        expect(history[1].timestamp).toEqual(submissionDate);
        expect(history[1].userId?.toString()).toBe(testUser._id.toString());
      });

      it('should include approval in status history', async () => {
        const approver = await User.create({
          email: 'approver@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Approver',
          role: 'manager',
        });

        const approvalDate = new Date();
        testForm.approvedAt = approvalDate;
        testForm.approvedBy = approver._id;
        await testForm.save();

        const history = testForm.getStatusHistory();
        expect(history).toHaveLength(2);
        expect(history[1].status).toBe('approved');
        expect(history[1].timestamp).toEqual(approvalDate);
        expect(history[1].userId?.toString()).toBe(approver._id.toString());
      });

      it('should include rejection in status history', async () => {
        const rejector = await User.create({
          email: 'rejector@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Rejector',
          role: 'manager',
        });

        const rejectionDate = new Date();
        testForm.rejectedAt = rejectionDate;
        testForm.rejectedBy = rejector._id;
        await testForm.save();

        const history = testForm.getStatusHistory();
        expect(history).toHaveLength(2);
        expect(history[1].status).toBe('rejected');
        expect(history[1].timestamp).toEqual(rejectionDate);
        expect(history[1].userId?.toString()).toBe(rejector._id.toString());
      });
    });
  });

  describe('Text Validation', () => {
    it('should enforce maxlength on maintenance procedures', async () => {
      const longText = 'x'.repeat(2001);
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        maintenanceDetails: {
          maintenanceProcedures: longText,
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow(/cannot exceed 2000 characters/);
    });

    it('should enforce maxlength on notes', async () => {
      const longNotes = 'x'.repeat(1001);
      const formData = {
        worksite: testWorksite._id,
        technician: testUser._id,
        customerInfo: {
          customerName: 'Test Customer',
          plantLocation: 'Plant Location',
        },
        additionalInfo: {
          notes: longNotes,
        },
        metadata: {
          createdBy: testUser._id,
        },
      };

      await expect(Form.create(formData)).rejects.toThrow(/cannot exceed 1000 characters/);
    });
  });
});
