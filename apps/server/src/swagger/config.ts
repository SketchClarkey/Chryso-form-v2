import swaggerJsdoc from 'swagger-jsdoc';
import { Request, Response } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chryso Forms API',
      version: '2.0.0',
      description:
        'A comprehensive form digitization API with advanced features for chemical treatment forms and worksite management.',
      contact: {
        name: 'API Support',
        url: 'https://github.com/SketchClarkey/Chryso-form',
        email: 'support@chrysoforms.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.chrysoforms.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'role'],
          properties: {
            _id: {
              type: 'string',
              description: 'Unique identifier for the user',
              example: '507f1f77bcf86cd799439011',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'technician'],
              description: 'User role determining permissions',
              example: 'technician',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user account is active',
              example: true,
            },
            emailVerified: {
              type: 'boolean',
              description: 'Whether email has been verified',
              example: true,
            },
            worksites: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of worksite IDs user has access to',
              example: ['507f1f77bcf86cd799439011'],
            },
            preferences: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark'],
                  example: 'light',
                },
                language: {
                  type: 'string',
                  example: 'en',
                },
                notifications: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean', example: true },
                    push: { type: 'boolean', example: false },
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },
        Worksite: {
          type: 'object',
          required: ['name', 'customerName', 'address'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              description: 'Worksite name',
              example: 'Main Treatment Plant',
            },
            customerName: {
              type: 'string',
              description: 'Customer/client name',
              example: 'ABC Water Corp',
            },
            address: {
              type: 'object',
              required: ['street', 'city', 'state', 'zipCode', 'country'],
              properties: {
                street: { type: 'string', example: '123 Industrial Rd' },
                city: { type: 'string', example: 'Sydney' },
                state: { type: 'string', example: 'NSW' },
                zipCode: { type: 'string', example: '2000' },
                country: { type: 'string', example: 'Australia' },
              },
            },
            contacts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Contact',
              },
            },
            equipment: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Equipment',
              },
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        Contact: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              example: 'Site Manager',
            },
            position: {
              type: 'string',
              example: 'Operations Manager',
            },
            phone: {
              type: 'string',
              example: '+61412345678',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'manager@site.com',
            },
            isPrimary: {
              type: 'boolean',
              example: true,
            },
          },
        },
        Equipment: {
          type: 'object',
          required: ['id', 'type', 'condition'],
          properties: {
            id: {
              type: 'string',
              example: 'pump-001',
            },
            type: {
              type: 'string',
              enum: ['pump', 'tank', 'dispenser', 'pulseMeter'],
              example: 'pump',
            },
            model: {
              type: 'string',
              example: 'Grundfos CR 3-8',
            },
            serialNumber: {
              type: 'string',
              example: 'SN123456789',
            },
            condition: {
              type: 'string',
              enum: ['excellent', 'good', 'fair', 'poor', 'needs-repair'],
              example: 'good',
            },
            lastServiceDate: {
              type: 'string',
              format: 'date',
            },
            notes: {
              type: 'string',
              example: 'Recently serviced, running well',
            },
            specifications: {
              type: 'object',
              properties: {
                capacity: { type: 'number', example: 500 },
                flowRate: { type: 'number', example: 10.5 },
                pressure: { type: 'number', example: 3.5 },
                voltage: { type: 'number', example: 240 },
              },
            },
          },
        },
        Form: {
          type: 'object',
          required: ['title', 'templateId', 'worksiteId'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            title: {
              type: 'string',
              example: 'Weekly Chemical Treatment',
            },
            templateId: {
              type: 'string',
              example: '507f1f77bcf86cd799439012',
            },
            worksiteId: {
              type: 'string',
              example: '507f1f77bcf86cd799439013',
            },
            status: {
              type: 'string',
              enum: [
                'draft',
                'in_progress',
                'pending_review',
                'approved',
                'completed',
                'cancelled',
              ],
              example: 'draft',
            },
            data: {
              type: 'object',
              description: 'Dynamic form field data',
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  url: { type: 'string' },
                  mimeType: { type: 'string' },
                  size: { type: 'number' },
                },
              },
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Template: {
          type: 'object',
          required: ['name', 'fields'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Chemical Treatment Form',
            },
            description: {
              type: 'string',
              example: 'Standard template for chemical treatment documentation',
            },
            category: {
              type: 'string',
              example: 'chemical-treatment',
            },
            version: {
              type: 'number',
              example: 1.2,
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'archived'],
              example: 'active',
            },
            fields: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FormField',
              },
            },
            isPublic: {
              type: 'boolean',
              example: false,
            },
          },
        },
        FormField: {
          type: 'object',
          required: ['id', 'type', 'label'],
          properties: {
            id: {
              type: 'string',
              example: 'chemical-dosage',
            },
            type: {
              type: 'string',
              enum: [
                'text',
                'number',
                'email',
                'date',
                'time',
                'datetime',
                'select',
                'multiselect',
                'checkbox',
                'radio',
                'textarea',
                'file',
                'signature',
              ],
              example: 'number',
            },
            label: {
              type: 'string',
              example: 'Chemical Dosage (mg/L)',
            },
            placeholder: {
              type: 'string',
              example: 'Enter dosage amount',
            },
            required: {
              type: 'boolean',
              example: true,
            },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
            validation: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                pattern: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              examples: {
                no_token: {
                  value: {
                    success: false,
                    message: 'Access token required',
                    code: 'NO_TOKEN',
                  },
                },
                invalid_token: {
                  value: {
                    success: false,
                    message: 'Invalid or expired token',
                    code: 'INVALID_TOKEN',
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Insufficient permissions to access this resource',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                  email: 'Email is required',
                  password: 'Password must be at least 8 characters',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Worksites',
        description: 'Worksite management operations',
      },
      {
        name: 'Forms',
        description: 'Form management and submission',
      },
      {
        name: 'Templates',
        description: 'Template creation and management',
      },
      {
        name: 'Reports',
        description: 'Report generation and analytics',
      },
      {
        name: 'Analytics',
        description: 'Data analytics and insights',
      },
      {
        name: 'Settings',
        description: 'Application settings and configuration',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/swagger/paths/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);

export const swaggerSpec = specs;
