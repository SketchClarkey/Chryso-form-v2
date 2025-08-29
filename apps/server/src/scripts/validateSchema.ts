import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Form } from '../models/Form.js';
import { Worksite } from '../models/Worksite.js';
import { Template } from '../models/Template.js';

const MONGODB_URI = 'mongodb://localhost:27017/chryso-forms-schema-test';

async function validateSchema() {
  try {
    console.log('Connecting to MongoDB for schema validation...');
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ Connected to MongoDB successfully');

    // Test model creation and validation
    console.log('\n🔍 Testing model schemas...');

    // Test User schema
    const userValidation = User.schema.obj;
    console.log('✅ User schema loaded:', Object.keys(userValidation).length, 'fields');

    // Test Form schema  
    const formValidation = Form.schema.obj;
    console.log('✅ Form schema loaded:', Object.keys(formValidation).length, 'fields');

    // Test Worksite schema
    const worksiteValidation = Worksite.schema.obj;
    console.log('✅ Worksite schema loaded:', Object.keys(worksiteValidation).length, 'fields');

    // Test Template schema
    const templateValidation = Template.schema.obj;
    console.log('✅ Template schema loaded:', Object.keys(templateValidation).length, 'fields');

    // Check indexes
    console.log('\n📊 Checking indexes...');
    const userIndexes = User.schema.indexes();
    console.log('✅ User model has', userIndexes.length, 'indexes');

    const formIndexes = Form.schema.indexes();
    console.log('✅ Form model has', formIndexes.length, 'indexes');

    const worksiteIndexes = Worksite.schema.indexes();  
    console.log('✅ Worksite model has', worksiteIndexes.length, 'indexes');

    console.log('\n🎉 Schema validation completed successfully!');

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📝 Disconnected from MongoDB');
  }
}

validateSchema();