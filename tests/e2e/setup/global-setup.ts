import { chromium, FullConfig } from '@playwright/test';
import mongoose from 'mongoose';

async function globalSetup(config: FullConfig) {
  // Connect to test database
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chryso-forms-e2e';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to test database');
    
    // Clean up test database
    await mongoose.connection.db.dropDatabase();
    console.log('Test database cleaned');
    
    // Seed basic test data
    await seedTestData();
    console.log('Test data seeded');
    
    await mongoose.disconnect();
    console.log('Disconnected from test database');
    
  } catch (error) {
    console.warn('Database setup failed:', error);
    // Don't fail the tests if database isn't available
  }
}

async function seedTestData() {
  // Create User collection with test users
  const User = mongoose.model('User', new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    emailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    worksites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worksite' }],
    metadata: {
      createdBy: mongoose.Schema.Types.ObjectId,
      lastModifiedBy: mongoose.Schema.Types.ObjectId,
    }
  }));

  // Create Worksite collection
  const Worksite = mongoose.model('Worksite', new mongoose.Schema({
    name: String,
    customerName: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    contacts: [{
      name: String,
      email: String,
      phone: String,
      isPrimary: { type: Boolean, default: false }
    }],
    equipment: [],
    isActive: { type: Boolean, default: true },
    metadata: {
      createdBy: mongoose.Schema.Types.ObjectId,
    }
  }));

  // Create test worksite
  const testWorksite = new Worksite({
    name: 'E2E Test Site',
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
      email: 'contact@testsite.com',
      phone: '61123456789',
      isPrimary: true
    }],
    metadata: {
      createdBy: new mongoose.Types.ObjectId()
    }
  });

  await testWorksite.save();

  // Create test users with hashed passwords
  const bcrypt = await import('bcryptjs');
  const saltRounds = 10;

  const testUsers = [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', saltRounds),
      role: 'admin',
      worksites: [testWorksite._id],
      metadata: {
        createdBy: new mongoose.Types.ObjectId()
      }
    },
    {
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@example.com',
      password: await bcrypt.hash('manager123', saltRounds),
      role: 'manager',
      worksites: [testWorksite._id],
      metadata: {
        createdBy: new mongoose.Types.ObjectId()
      }
    },
    {
      firstName: 'Tech',
      lastName: 'User',
      email: 'tech@example.com',
      password: await bcrypt.hash('tech123', saltRounds),
      role: 'technician',
      worksites: [testWorksite._id],
      metadata: {
        createdBy: new mongoose.Types.ObjectId()
      }
    }
  ];

  await User.insertMany(testUsers);
}

export default globalSetup;