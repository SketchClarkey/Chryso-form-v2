import { Schema, model, Document } from 'mongoose';

export interface ICompliancePolicy extends Document {
  organizationId: string;

  // Policy Information
  name: string;
  description?: string;
  type: 'gdpr' | 'hipaa' | 'sox' | 'pci' | 'iso27001' | 'custom';
  version: string;

  // Policy Configuration
  rules: Array<{
    id: string;
    name: string;
    description: string;
    category:
      | 'data_handling'
      | 'access_control'
      | 'retention'
      | 'encryption'
      | 'audit'
      | 'notification';
    ruleType: 'mandatory' | 'recommended' | 'optional';

    // Conditions
    conditions: {
      resourceTypes?: string[]; // What resources this applies to
      dataClassifications?: string[]; // What data classifications
      userRoles?: string[]; // What user roles
      actions?: string[]; // What actions trigger this rule
    };

    // Requirements
    requirements: {
      encryption?: boolean;
      accessLogging?: boolean;
      approvalRequired?: boolean;
      retentionDays?: number;
      notificationRequired?: boolean;
      dataMinimization?: boolean;
    };

    // Enforcement
    enforcement: {
      level: 'advisory' | 'warning' | 'blocking';
      actions: string[]; // Actions to take when rule is triggered
    };

    isActive: boolean;
  }>;

  // Data Retention
  dataRetention: {
    defaultRetentionDays: number;
    classifications: {
      public: number;
      internal: number;
      confidential: number;
      restricted: number;
    };
    exceptions: Array<{
      resourceType: string;
      retentionDays: number;
      reason: string;
    }>;
    autoArchive: boolean;
    autoDelete: boolean;
  };

  // Data Subject Rights (GDPR)
  dataSubjectRights: {
    enabled: boolean;
    rightToAccess: boolean;
    rightToRectification: boolean;
    rightToErasure: boolean;
    rightToPortability: boolean;
    rightToRestrict: boolean;
    rightToObject: boolean;
    responseTimeLimit: number; // days

    // Automated handling
    autoResponses: {
      accessRequests: boolean;
      deletionRequests: boolean;
      portabilityRequests: boolean;
    };
  };

  // Breach Notification
  breachNotification: {
    enabled: boolean;
    timeLimit: number; // hours
    authorities: Array<{
      name: string;
      email: string;
      phone?: string;
      jurisdiction: string;
    }>;
    internalContacts: Array<{
      name: string;
      email: string;
      role: string;
    }>;
    templates: {
      authorityTemplate?: string;
      userTemplate?: string;
      internalTemplate?: string;
    };
  };

  // Monitoring and Alerts
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      failedLogins: number;
      dataExports: number;
      privilegedAccess: number;
      anomalousActivity: number;
    };
    alertChannels: Array<{
      type: 'email' | 'sms' | 'webhook' | 'slack';
      destination: string;
      severity: string[];
    }>;
    realTimeMonitoring: boolean;
    reportingSchedule: 'daily' | 'weekly' | 'monthly';
  };

  // Audit Requirements
  auditRequirements: {
    logLevel: 'basic' | 'detailed' | 'comprehensive';
    requiredEvents: string[];
    retentionDays: number;
    encryptLogs: boolean;
    immutableLogs: boolean;

    // Regular assessments
    internalAudits: {
      enabled: boolean;
      frequency: 'monthly' | 'quarterly' | 'annually';
      scope: string[];
    };

    externalAudits: {
      required: boolean;
      frequency: 'annually' | 'biannually';
      certifications: string[];
    };
  };

  // Status and Compliance
  isActive: boolean;
  lastAssessment?: Date;
  nextAssessment?: Date;
  complianceScore?: number; // 0-100

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: Schema.Types.ObjectId;
  updatedBy: Schema.Types.ObjectId;
}

const compliancePolicySchema = new Schema<ICompliancePolicy>(
  {
    organizationId: { type: String, required: true },

    // Policy Information
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['gdpr', 'hipaa', 'sox', 'pci', 'iso27001', 'custom'],
      required: true,
    },
    version: { type: String, required: true, default: '1.0' },

    // Policy Configuration
    rules: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        category: {
          type: String,
          enum: [
            'data_handling',
            'access_control',
            'retention',
            'encryption',
            'audit',
            'notification',
          ],
          required: true,
        },
        ruleType: {
          type: String,
          enum: ['mandatory', 'recommended', 'optional'],
          default: 'mandatory',
        },

        conditions: {
          resourceTypes: [String],
          dataClassifications: [String],
          userRoles: [String],
          actions: [String],
        },

        requirements: {
          encryption: { type: Boolean, default: false },
          accessLogging: { type: Boolean, default: true },
          approvalRequired: { type: Boolean, default: false },
          retentionDays: { type: Number },
          notificationRequired: { type: Boolean, default: false },
          dataMinimization: { type: Boolean, default: false },
        },

        enforcement: {
          level: { type: String, enum: ['advisory', 'warning', 'blocking'], default: 'warning' },
          actions: [String],
        },

        isActive: { type: Boolean, default: true },
      },
    ],

    // Data Retention
    dataRetention: {
      defaultRetentionDays: { type: Number, default: 365 },
      classifications: {
        public: { type: Number, default: 2555 }, // 7 years
        internal: { type: Number, default: 1095 }, // 3 years
        confidential: { type: Number, default: 365 }, // 1 year
        restricted: { type: Number, default: 90 }, // 3 months
      },
      exceptions: [
        {
          resourceType: { type: String, required: true },
          retentionDays: { type: Number, required: true },
          reason: { type: String, required: true },
        },
      ],
      autoArchive: { type: Boolean, default: true },
      autoDelete: { type: Boolean, default: false },
    },

    // Data Subject Rights
    dataSubjectRights: {
      enabled: { type: Boolean, default: false },
      rightToAccess: { type: Boolean, default: true },
      rightToRectification: { type: Boolean, default: true },
      rightToErasure: { type: Boolean, default: true },
      rightToPortability: { type: Boolean, default: true },
      rightToRestrict: { type: Boolean, default: true },
      rightToObject: { type: Boolean, default: true },
      responseTimeLimit: { type: Number, default: 30 }, // days

      autoResponses: {
        accessRequests: { type: Boolean, default: false },
        deletionRequests: { type: Boolean, default: false },
        portabilityRequests: { type: Boolean, default: false },
      },
    },

    // Breach Notification
    breachNotification: {
      enabled: { type: Boolean, default: false },
      timeLimit: { type: Number, default: 72 }, // hours
      authorities: [
        {
          name: { type: String, required: true },
          email: { type: String, required: true },
          phone: { type: String },
          jurisdiction: { type: String, required: true },
        },
      ],
      internalContacts: [
        {
          name: { type: String, required: true },
          email: { type: String, required: true },
          role: { type: String, required: true },
        },
      ],
      templates: {
        authorityTemplate: { type: String },
        userTemplate: { type: String },
        internalTemplate: { type: String },
      },
    },

    // Monitoring
    monitoring: {
      enabled: { type: Boolean, default: true },
      alertThresholds: {
        failedLogins: { type: Number, default: 5 },
        dataExports: { type: Number, default: 10 },
        privilegedAccess: { type: Number, default: 3 },
        anomalousActivity: { type: Number, default: 3 },
      },
      alertChannels: [
        {
          type: { type: String, enum: ['email', 'sms', 'webhook', 'slack'], required: true },
          destination: { type: String, required: true },
          severity: [{ type: String, enum: ['low', 'medium', 'high', 'critical'] }],
        },
      ],
      realTimeMonitoring: { type: Boolean, default: false },
      reportingSchedule: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
    },

    // Audit Requirements
    auditRequirements: {
      logLevel: { type: String, enum: ['basic', 'detailed', 'comprehensive'], default: 'detailed' },
      requiredEvents: [String],
      retentionDays: { type: Number, default: 2555 }, // 7 years
      encryptLogs: { type: Boolean, default: true },
      immutableLogs: { type: Boolean, default: false },

      internalAudits: {
        enabled: { type: Boolean, default: false },
        frequency: {
          type: String,
          enum: ['monthly', 'quarterly', 'annually'],
          default: 'quarterly',
        },
        scope: [String],
      },

      externalAudits: {
        required: { type: Boolean, default: false },
        frequency: { type: String, enum: ['annually', 'biannually'], default: 'annually' },
        certifications: [String],
      },
    },

    // Status
    isActive: { type: Boolean, default: true },
    lastAssessment: { type: Date },
    nextAssessment: { type: Date },
    complianceScore: { type: Number, min: 0, max: 100 },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'compliancePolicies',
  }
);

// Indexes
compliancePolicySchema.index({ organizationId: 1, isActive: 1 });

// Ensure unique policy types per organization (this also serves as the organizationId + type index)
compliancePolicySchema.index({ organizationId: 1, type: 1 }, { unique: true });

// Static methods
compliancePolicySchema.statics.getActivePolicy = function (organizationId: string, type: string) {
  return this.findOne({ organizationId, type, isActive: true });
};

compliancePolicySchema.statics.getActivePolicies = function (organizationId: string) {
  return this.find({ organizationId, isActive: true });
};

// Instance methods
compliancePolicySchema.methods.evaluateCompliance = function (auditLogs: any[]) {
  let score = 100;
  const violations: any[] = [];

  // Evaluate each rule against audit logs
  this.rules.forEach((rule: any) => {
    if (!rule.isActive) return;

    // Check for rule violations in audit logs
    const ruleViolations = auditLogs.filter(log => {
      if (
        rule.conditions.resourceTypes &&
        !rule.conditions.resourceTypes.includes(log.resourceType)
      ) {
        return false;
      }
      if (rule.conditions.actions && !rule.conditions.actions.includes(log.action)) {
        return false;
      }
      if (rule.conditions.userRoles && !rule.conditions.userRoles.includes(log.userRole)) {
        return false;
      }

      // Check if requirements were met
      if (rule.requirements.accessLogging && !log.userId) {
        return true; // Violation: action not logged properly
      }

      return false;
    });

    if (ruleViolations.length > 0) {
      const penalty = rule.ruleType === 'mandatory' ? 20 : rule.ruleType === 'recommended' ? 10 : 5;
      score -= penalty;
      violations.push({
        rule: rule.name,
        violations: ruleViolations.length,
        penalty,
      });
    }
  });

  this.complianceScore = Math.max(0, score);
  this.lastAssessment = new Date();

  return {
    score: this.complianceScore,
    violations,
    summary: `${violations.length} rule violations found`,
  };
};

compliancePolicySchema.methods.getApplicableRules = function (context: any) {
  return this.rules.filter((rule: any) => {
    if (!rule.isActive) return false;

    if (
      rule.conditions.resourceTypes &&
      context.resourceType &&
      !rule.conditions.resourceTypes.includes(context.resourceType)
    ) {
      return false;
    }

    if (
      rule.conditions.actions &&
      context.action &&
      !rule.conditions.actions.includes(context.action)
    ) {
      return false;
    }

    if (
      rule.conditions.userRoles &&
      context.userRole &&
      !rule.conditions.userRoles.includes(context.userRole)
    ) {
      return false;
    }

    return true;
  });
};

export const CompliancePolicy = model<ICompliancePolicy>(
  'CompliancePolicy',
  compliancePolicySchema
);
