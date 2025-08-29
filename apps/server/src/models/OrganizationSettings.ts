import { Schema, model, Document } from 'mongoose';

export interface IOrganizationSettings extends Document {
  organizationId: string;
  general: {
    companyName: string;
    companyLogo?: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    defaultLanguage: string;
    currency: string;
    fiscalYearStart: number; // Month (1-12)
    workWeek: {
      startDay: number; // 0-6 (Sunday-Saturday)
      workDays: number[]; // Array of work day numbers
      workHours: {
        start: string; // HH:MM format
        end: string; // HH:MM format
      };
    };
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country: string;
    };
    contact: {
      phone?: string;
      email: string;
      website?: string;
    };
  };

  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
      preventReuse: number; // Number of previous passwords to check
      maxAge: number; // Days before password expires (0 = never)
    };
    sessionTimeout: number; // Minutes of inactivity before logout
    mfaRequired: boolean;
    ipWhitelist: string[]; // Array of allowed IP addresses/ranges
    maxLoginAttempts: number;
    lockoutDuration: number; // Minutes to lock account after max attempts
    auditLogging: {
      enabled: boolean;
      logLevel: 'basic' | 'detailed' | 'comprehensive';
      retentionDays: number;
    };
  };

  integrations: {
    email: {
      provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | null;
      settings: {
        smtp?: {
          host: string;
          port: number;
          secure: boolean;
          auth: {
            user: string;
            pass: string;
          };
        };
        sendgrid?: {
          apiKey: string;
          fromEmail: string;
          fromName: string;
        };
        mailgun?: {
          apiKey: string;
          domain: string;
          fromEmail: string;
          fromName: string;
        };
        ses?: {
          accessKeyId: string;
          secretAccessKey: string;
          region: string;
          fromEmail: string;
          fromName: string;
        };
      };
      templates: {
        welcomeEmail: boolean;
        formNotification: boolean;
        passwordReset: boolean;
        systemAlerts: boolean;
      };
    };

    storage: {
      provider: 'local' | 's3' | 'azure' | 'gcp';
      settings: {
        local?: {
          uploadPath: string;
          maxFileSize: number; // MB
        };
        s3?: {
          accessKeyId: string;
          secretAccessKey: string;
          region: string;
          bucket: string;
        };
        azure?: {
          connectionString: string;
          containerName: string;
        };
        gcp?: {
          projectId: string;
          keyFilePath: string;
          bucketName: string;
        };
      };
    };

    notifications: {
      slack?: {
        webhookUrl: string;
        channels: {
          general: string;
          alerts: string;
          forms: string;
        };
      };
      teams?: {
        webhookUrl: string;
      };
      webhook?: {
        url: string;
        secret: string;
        events: string[];
      };
    };

    sso: {
      enabled: boolean;
      provider?: 'azure' | 'google' | 'okta' | 'saml';
      settings?: {
        azure?: {
          tenantId: string;
          clientId: string;
          clientSecret: string;
        };
        google?: {
          clientId: string;
          clientSecret: string;
        };
        okta?: {
          domain: string;
          clientId: string;
          clientSecret: string;
        };
        saml?: {
          entryPoint: string;
          issuer: string;
          cert: string;
        };
      };
    };
  };

  features: {
    modules: {
      formBuilder: boolean;
      reporting: boolean;
      analytics: boolean;
      mobileApp: boolean;
      apiAccess: boolean;
      customFields: boolean;
      workflows: boolean;
      integrations: boolean;
    };
    limits: {
      maxUsers: number;
      maxForms: number;
      storageQuota: number; // GB
      apiCallsPerMonth: number;
    };
  };

  customization: {
    theme: {
      primaryColor: string;
      secondaryColor: string;
      logoUrl?: string;
      faviconUrl?: string;
    };
    branding: {
      showPoweredBy: boolean;
      customFooter?: string;
      customHeader?: string;
    };
    customFields: Array<{
      id: string;
      name: string;
      type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
      options?: string[];
      required: boolean;
      defaultValue?: any;
    }>;
  };

  createdAt: Date;
  updatedAt: Date;
  createdBy: Schema.Types.ObjectId;
  updatedBy: Schema.Types.ObjectId;
}

const organizationSettingsSchema = new Schema<IOrganizationSettings>(
  {
    organizationId: { type: String, required: true, unique: true },

    general: {
      companyName: { type: String, required: true },
      companyLogo: { type: String },
      timezone: { type: String, required: true, default: 'UTC' },
      dateFormat: { type: String, required: true, default: 'MM/dd/yyyy' },
      timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
      defaultLanguage: { type: String, required: true, default: 'en' },
      currency: { type: String, required: true, default: 'USD' },
      fiscalYearStart: { type: Number, min: 1, max: 12, default: 1 },
      workWeek: {
        startDay: { type: Number, min: 0, max: 6, default: 1 }, // Monday
        workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon-Fri
        workHours: {
          start: { type: String, default: '09:00' },
          end: { type: String, default: '17:00' },
        },
      },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        country: { type: String, required: true, default: 'US' },
      },
      contact: {
        phone: { type: String },
        email: { type: String, required: true },
        website: { type: String },
      },
    },

    security: {
      passwordPolicy: {
        minLength: { type: Number, default: 8, min: 6 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSymbols: { type: Boolean, default: false },
        preventReuse: { type: Number, default: 3, min: 0 },
        maxAge: { type: Number, default: 0, min: 0 }, // 0 = never expires
      },
      sessionTimeout: { type: Number, default: 60, min: 5 }, // 60 minutes
      mfaRequired: { type: Boolean, default: false },
      ipWhitelist: { type: [String], default: [] },
      maxLoginAttempts: { type: Number, default: 5, min: 3 },
      lockoutDuration: { type: Number, default: 30, min: 5 }, // 30 minutes
      auditLogging: {
        enabled: { type: Boolean, default: true },
        logLevel: { type: String, enum: ['basic', 'detailed', 'comprehensive'], default: 'basic' },
        retentionDays: { type: Number, default: 90, min: 30 },
      },
    },

    integrations: {
      email: {
        provider: {
          type: String,
          enum: ['smtp', 'sendgrid', 'mailgun', 'ses', null],
          default: null,
        },
        settings: { type: Schema.Types.Mixed, default: {} },
        templates: {
          welcomeEmail: { type: Boolean, default: true },
          formNotification: { type: Boolean, default: true },
          passwordReset: { type: Boolean, default: true },
          systemAlerts: { type: Boolean, default: true },
        },
      },
      storage: {
        provider: { type: String, enum: ['local', 's3', 'azure', 'gcp'], default: 'local' },
        settings: { type: Schema.Types.Mixed, default: {} },
      },
      notifications: {
        slack: { type: Schema.Types.Mixed },
        teams: { type: Schema.Types.Mixed },
        webhook: { type: Schema.Types.Mixed },
      },
      sso: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, enum: ['azure', 'google', 'okta', 'saml'] },
        settings: { type: Schema.Types.Mixed },
      },
    },

    features: {
      modules: {
        formBuilder: { type: Boolean, default: true },
        reporting: { type: Boolean, default: true },
        analytics: { type: Boolean, default: false },
        mobileApp: { type: Boolean, default: true },
        apiAccess: { type: Boolean, default: false },
        customFields: { type: Boolean, default: true },
        workflows: { type: Boolean, default: false },
        integrations: { type: Boolean, default: false },
      },
      limits: {
        maxUsers: { type: Number, default: 50 },
        maxForms: { type: Number, default: 100 },
        storageQuota: { type: Number, default: 10 }, // 10 GB
        apiCallsPerMonth: { type: Number, default: 10000 },
      },
    },

    customization: {
      theme: {
        primaryColor: { type: String, default: '#1976d2' },
        secondaryColor: { type: String, default: '#dc004e' },
        logoUrl: { type: String },
        faviconUrl: { type: String },
      },
      branding: {
        showPoweredBy: { type: Boolean, default: true },
        customFooter: { type: String },
        customHeader: { type: String },
      },
      customFields: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          type: {
            type: String,
            enum: ['text', 'number', 'date', 'boolean', 'select', 'multiselect'],
            required: true,
          },
          options: [String],
          required: { type: Boolean, default: false },
          defaultValue: Schema.Types.Mixed,
        },
      ],
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'organizationSettings',
  }
);

// Indexes
organizationSettingsSchema.index({ organizationId: 1 });
organizationSettingsSchema.index({ createdAt: 1 });
organizationSettingsSchema.index({ updatedAt: 1 });

// Pre-save middleware to update the updatedAt field
organizationSettingsSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

export const OrganizationSettings = model<IOrganizationSettings>(
  'OrganizationSettings',
  organizationSettingsSchema
);
