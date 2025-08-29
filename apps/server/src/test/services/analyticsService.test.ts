import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { AnalyticsService, AnalyticsQuery } from '../../services/analyticsService.js';
import { Form } from '../../models/Form.js';
import { User } from '../../models/User.js';
import { Worksite } from '../../models/Worksite.js';

let analyticsService: AnalyticsService;
let testUser: any;
let testWorksite: any;

describe('AnalyticsService', () => {
  beforeEach(async () => {
    // Clear collections before each test
    await Form.deleteMany({});
    await User.deleteMany({});
    await Worksite.deleteMany({});

    analyticsService = AnalyticsService.getInstance();

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

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AnalyticsService.getInstance();
      const instance2 = AnalyticsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateAnalytics', () => {
    beforeEach(async () => {
      // Create test forms with different dates and statuses
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dayBefore = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      await Form.create([
        {
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'completed',
          customerInfo: {
            customerName: 'Customer 1',
            plantLocation: 'Location 1',
          },
          metadata: {
            createdBy: testUser._id,
          },
          createdAt: now,
          completedAt: now,
        },
        {
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'draft',
          customerInfo: {
            customerName: 'Customer 2',
            plantLocation: 'Location 2',
          },
          metadata: {
            createdBy: testUser._id,
          },
          createdAt: yesterday,
        },
        {
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'completed',
          customerInfo: {
            customerName: 'Customer 3',
            plantLocation: 'Location 3',
          },
          metadata: {
            createdBy: testUser._id,
          },
          createdAt: dayBefore,
          completedAt: dayBefore,
        },
      ]);
    });

    it('should generate analytics with basic query', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          end: new Date(),
        },
        granularity: 'day',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('distributions');
      expect(result).toHaveProperty('comparisons');

      expect(result.metrics.totalForms).toBeDefined();
      expect(result.metrics.completedForms).toBeDefined();
      expect(result.metrics.completionRate).toBeDefined();
      expect(result.metrics.avgCompletionTime).toBeDefined();
      expect(result.metrics.activeUsers).toBeDefined();
    });

    it('should calculate correct metrics', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.metrics.totalForms.current).toBe(3);
      expect(result.metrics.completedForms.current).toBe(2);
      expect(result.metrics.completionRate.current).toBeCloseTo(66.67, 1); // 2/3 * 100
      expect(result.metrics.activeUsers.current).toBe(1);
    });

    it('should apply worksite filters', async () => {
      // Create another worksite and form
      const anotherWorksite = await Worksite.create({
        name: 'Another Worksite',
        customerName: 'Another Customer',
        address: {
          street: '456 Another St',
          city: 'Another City',
          state: 'Another State',
          zipCode: '67890',
          country: 'Another Country',
        },
        contacts: [
          {
            name: 'Jane Doe',
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

      await Form.create({
        worksite: anotherWorksite._id,
        technician: testUser._id,
        status: 'completed',
        customerInfo: {
          customerName: 'Another Customer',
          plantLocation: 'Another Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      });

      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
        filters: {
          worksites: [testWorksite._id.toString()],
        },
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      // Should only count forms from the filtered worksite (3 forms)
      expect(result.metrics.totalForms.current).toBe(3);
    });

    it('should apply status filters', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
        filters: {
          status: ['completed'],
        },
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      // Should only count completed forms
      expect(result.metrics.totalForms.current).toBe(2);
    });

    it('should apply technician filters', async () => {
      // Create another technician and form
      const anotherTech = await User.create({
        email: `tech2-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Another',
        lastName: 'Tech',
        role: 'technician',
      });

      await Form.create({
        worksite: testWorksite._id,
        technician: anotherTech._id,
        status: 'completed',
        customerInfo: {
          customerName: 'Tech2 Customer',
          plantLocation: 'Tech2 Location',
        },
        metadata: {
          createdBy: anotherTech._id,
        },
      });

      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
        filters: {
          technicians: [testUser._id.toString()],
        },
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      // Should only count forms from the filtered technician (3 forms)
      expect(result.metrics.totalForms.current).toBe(3);
    });
  });

  describe('trend calculations', () => {
    beforeEach(async () => {
      // Create forms across different days
      const dates = [
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        new Date(), // today
      ];

      for (let i = 0; i < dates.length; i++) {
        await Form.create({
          worksite: testWorksite._id,
          technician: testUser._id,
          status: i % 2 === 0 ? 'completed' : 'draft',
          customerInfo: {
            customerName: `Customer ${i}`,
            plantLocation: `Location ${i}`,
          },
          metadata: {
            createdBy: testUser._id,
          },
          createdAt: dates[i],
        });
      }
    });

    it('should calculate daily trends', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.trends.formCreation).toHaveLength(4); // 4 days
      expect(result.trends.formCompletion).toHaveLength(4);
      expect(result.trends.userActivity).toHaveLength(4);

      // Each day should have exactly 1 form
      expect(result.trends.formCreation.every(trend => trend.value <= 1)).toBe(true);
    });

    it('should calculate weekly trends', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          end: new Date(),
        },
        granularity: 'week',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.trends.formCreation).toHaveLength(2); // 2 weeks
    });

    it('should calculate monthly trends', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
          end: new Date(),
        },
        granularity: 'month',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.trends.formCreation.length).toBeGreaterThan(0);
    });
  });

  describe('distribution calculations', () => {
    beforeEach(async () => {
      // Create forms with different statuses
      const statuses = ['draft', 'completed', 'approved', 'rejected'];

      for (let i = 0; i < statuses.length; i++) {
        await Form.create({
          worksite: testWorksite._id,
          technician: testUser._id,
          status: statuses[i] as any,
          customerInfo: {
            customerName: `Customer ${i}`,
            plantLocation: `Location ${i}`,
          },
          metadata: {
            createdBy: testUser._id,
          },
        });
      }
    });

    it('should calculate status distribution', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.distributions.statusDistribution).toBeDefined();
      expect(result.distributions.statusDistribution.length).toBe(4);

      // Each status should have 25% (1 out of 4)
      expect(result.distributions.statusDistribution.every(dist => dist.percentage === 25)).toBe(
        true
      );
    });

    it('should calculate worksite distribution', async () => {
      // Create another worksite and form
      const anotherWorksite = await Worksite.create({
        name: 'Another Worksite',
        customerName: 'Another Customer',
        address: {
          street: '456 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        contacts: [
          {
            name: 'Jane Doe',
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

      await Form.create({
        worksite: anotherWorksite._id,
        technician: testUser._id,
        status: 'completed',
        customerInfo: {
          customerName: 'Another Customer',
          plantLocation: 'Another Location',
        },
        metadata: {
          createdBy: testUser._id,
        },
      });

      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.distributions.worksiteDistribution).toBeDefined();
      expect(result.distributions.worksiteDistribution.length).toBe(2);

      // Test worksite should have 80% (4 out of 5), another should have 20%
      const testWorksiteDist = result.distributions.worksiteDistribution.find(
        d => d.label === 'Test Worksite'
      );
      expect(testWorksiteDist?.percentage).toBe(80);
    });
  });

  describe('comparison calculations', () => {
    beforeEach(async () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Create forms for current period
      await Form.create([
        {
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'completed',
          customerInfo: { customerName: 'Current 1', plantLocation: 'Location 1' },
          metadata: { createdBy: testUser._id },
          createdAt: now,
        },
        {
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'completed',
          customerInfo: { customerName: 'Current 2', plantLocation: 'Location 2' },
          metadata: { createdBy: testUser._id },
          createdAt: now,
        },
      ]);

      // Create forms for previous period
      await Form.create([
        {
          worksite: testWorksite._id,
          technician: testUser._id,
          status: 'completed',
          customerInfo: { customerName: 'Previous 1', plantLocation: 'Location 1' },
          metadata: { createdBy: testUser._id },
          createdAt: lastWeek,
        },
      ]);
    });

    it('should calculate period comparisons', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          end: new Date(),
        },
        granularity: 'day',
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');

      expect(result.comparisons.periodComparison).toBeDefined();
      expect(Array.isArray(result.comparisons.periodComparison)).toBe(true);

      const totalFormsComparison = result.comparisons.periodComparison.find(
        c => c.category === 'Total Forms'
      );
      expect(totalFormsComparison).toBeDefined();
      expect(totalFormsComparison?.current).toBe(2); // Current period has 2 forms
    });
  });

  describe('error handling', () => {
    it('should handle invalid date ranges', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(), // End date before start date
          end: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        granularity: 'day',
      };

      await expect(analyticsService.generateAnalytics(query, 'admin')).resolves.toBeDefined();
    });

    it('should handle empty filter arrays', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
        filters: {
          worksites: [],
          technicians: [],
          status: [],
        },
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');
      expect(result).toBeDefined();
    });

    it('should handle non-existent filter values', async () => {
      const query: AnalyticsQuery = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        granularity: 'day',
        filters: {
          worksites: [new mongoose.Types.ObjectId().toString()],
          technicians: [new mongoose.Types.ObjectId().toString()],
        },
      };

      const result = await analyticsService.generateAnalytics(query, 'admin');
      expect(result.metrics.totalForms.current).toBe(0);
    });
  });
});
