import { Schema, model, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  organizationId: string;

  // Event Information
  eventType:
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'access'
    | 'export'
    | 'import'
    | 'admin'
    | 'system';
  action: string; // Specific action taken (e.g., 'form_created', 'user_login', 'data_exported')
  category:
    | 'authentication'
    | 'data'
    | 'user_management'
    | 'system'
    | 'security'
    | 'compliance'
    | 'integration';

  // Actor Information
  userId?: Schema.Types.ObjectId;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  sessionId?: string;

  // Target Information
  resourceType?: string; // 'form', 'user', 'template', 'report', etc.
  resourceId?: string;
  resourceName?: string;

  // Request Context
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  httpMethod?: string;

  // Event Details
  description: string;
  details?: Record<string, any>; // Flexible details object
  oldValues?: Record<string, any>; // Previous values for updates
  newValues?: Record<string, any>; // New values for updates

  // Classification
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';

  // Compliance
  complianceFlags?: string[]; // GDPR, HIPAA, SOX, etc.
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';

  // Status and Outcome
  status: 'success' | 'failure' | 'warning' | 'pending';
  errorMessage?: string;
  duration?: number; // Request duration in milliseconds

  // Metadata
  tags?: string[];
  correlationId?: string; // Link related events
  parentEventId?: Schema.Types.ObjectId;

  timestamp: Date;
  createdAt: Date;
}

interface IAuditLogModel extends Model<IAuditLog> {
  getByUser(organizationId: string, userId: string, startDate?: Date, endDate?: Date): any;
  getByResource(organizationId: string, resourceType: string, resourceId: string): any;
  getSecurityEvents(organizationId: string, startDate?: Date, endDate?: Date): any;
  getComplianceReport(
    organizationId: string,
    complianceType?: string,
    startDate?: Date,
    endDate?: Date
  ): any;
  getAnomalousActivity(organizationId: string, hours?: number): any;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: String, required: true },

    // Event Information
    eventType: {
      type: String,
      enum: [
        'create',
        'read',
        'update',
        'delete',
        'login',
        'logout',
        'access',
        'export',
        'import',
        'admin',
        'system',
      ],
      required: true,
    },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'authentication',
        'data',
        'user_management',
        'system',
        'security',
        'compliance',
        'integration',
      ],
      required: true,
    },

    // Actor Information
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String },
    userName: { type: String },
    userRole: { type: String },
    sessionId: { type: String },

    // Target Information
    resourceType: { type: String },
    resourceId: { type: String },
    resourceName: { type: String },

    // Request Context
    ipAddress: { type: String },
    userAgent: { type: String },
    endpoint: { type: String },
    httpMethod: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },

    // Event Details
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },

    // Classification
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      default: 'none',
    },

    // Compliance
    complianceFlags: [{ type: String }],
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal',
    },

    // Status and Outcome
    status: {
      type: String,
      enum: ['success', 'failure', 'warning', 'pending'],
      default: 'success',
    },
    errorMessage: { type: String },
    duration: { type: Number }, // milliseconds

    // Metadata
    tags: [{ type: String }],
    correlationId: { type: String },
    parentEventId: { type: Schema.Types.ObjectId, ref: 'AuditLog' },

    timestamp: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'auditLogs',
    timeseries: {
      timeField: 'timestamp',
      metaField: 'organizationId',
      granularity: 'hours',
    },
  }
);

// Compound indexes for efficient querying
auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, eventType: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, category: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1 });
auditLogSchema.index({ correlationId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index for automatic cleanup (if data retention policies are enabled)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year default

// Static methods
auditLogSchema.statics.getByUser = function (
  organizationId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { organizationId, userId };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  return this.find(query).sort({ timestamp: -1 });
};

auditLogSchema.statics.getByResource = function (
  organizationId: string,
  resourceType: string,
  resourceId: string
) {
  return this.find({ organizationId, resourceType, resourceId }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getSecurityEvents = function (
  organizationId: string,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = {
    organizationId,
    $or: [
      { category: 'security' },
      { severity: { $in: ['high', 'critical'] } },
      { eventType: { $in: ['login', 'logout', 'access'] } },
      { status: 'failure' },
    ],
  };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query).sort({ timestamp: -1 });
};

auditLogSchema.statics.getComplianceReport = function (
  organizationId: string,
  complianceType?: string,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { organizationId };

  if (complianceType) {
    query.complianceFlags = complianceType;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query).sort({ timestamp: -1 });
};

auditLogSchema.statics.getAnomalousActivity = function (
  organizationId: string,
  hours: number = 24
) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        organizationId,
        timestamp: { $gte: startTime },
        $or: [
          { severity: { $in: ['high', 'critical'] } },
          { status: 'failure' },
          { riskLevel: { $in: ['high', 'critical'] } },
        ],
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          ipAddress: '$ipAddress',
          action: '$action',
        },
        count: { $sum: 1 },
        events: { $push: '$$ROOT' },
      },
    },
    {
      $match: { count: { $gte: 5 } }, // Flag if 5+ suspicious events
    },
    { $sort: { count: -1 } },
  ]);
};

// Instance methods
auditLogSchema.methods.addCorrelatedEvent = function (eventData: Partial<IAuditLog>) {
  return new (this.constructor as any)({
    ...eventData,
    organizationId: this.organizationId,
    correlationId: this.correlationId || this._id.toString(),
    parentEventId: this._id,
  });
};

auditLogSchema.methods.maskSensitiveData = function () {
  const masked = this.toObject();

  // Mask sensitive fields
  if (masked.details) {
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'ssn', 'creditCard'];
    sensitiveFields.forEach(field => {
      if (masked.details[field]) {
        masked.details[field] = '***MASKED***';
      }
    });
  }

  if (masked.oldValues) {
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    sensitiveFields.forEach(field => {
      if (masked.oldValues[field]) {
        masked.oldValues[field] = '***MASKED***';
      }
    });
  }

  if (masked.newValues) {
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    sensitiveFields.forEach(field => {
      if (masked.newValues[field]) {
        masked.newValues[field] = '***MASKED***';
      }
    });
  }

  return masked;
};

export const AuditLog = model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);
