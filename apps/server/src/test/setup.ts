import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

// Set up test environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-very-long-and-secure-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-that-is-very-long-and-secure-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/chryso-forms-test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

// Global test setup
beforeAll(async () => {
  // Connect to test database only if not already connected
  if (mongoose.connection.readyState === 0) {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chryso-forms-test', {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
  }
  
  // Clear all collections before tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  // Clean up and close connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});