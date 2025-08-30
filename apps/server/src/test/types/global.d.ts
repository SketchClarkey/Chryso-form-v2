// Global type declarations for test environment

import 'vitest';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'test' | 'development' | 'production';
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      MONGODB_URI: string;
      CLIENT_URL: string;
      BCRYPT_ROUNDS: string;
    }
  }
}

// Extend Vitest globals if needed
declare module 'vitest' {
  interface TestContext {
    // Add any custom test context properties here
  }
}

// Mock types for common test utilities
declare global {
  var mongoServer: any; // For MongoDB Memory Server in tests
  var mongoose: typeof import('mongoose');
}

export {};