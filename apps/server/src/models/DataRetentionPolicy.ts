import mongoose, { Schema, Document } from 'mongoose';

export interface IDataRetentionPolicy extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  
  // Policy configuration
  entityType: 'form' | 'auditLog' | 'report' | 'user' | 'template' | 'dashboard' | 'all';
  retentionPeriod: {
    value: number;
    unit: 'days' | 'months' | 'years';
  };
  
  // Archive configuration
  archiveBeforeDelete: boolean;
  archiveLocation?: string;
  archiveFormat?: 'json' | 'csv' | 'compressed';
  
  // Conditions for retention
  conditions?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
    value: any;
  }[];
  
  // Legal hold settings
  legalHold?: {
    enabled: boolean;
    reason?: string;
    holdUntil?: Date;
    exemptFromDeletion: boolean;
  };
  
  // Compliance settings
  complianceRequirements?: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
    pci: boolean;
    custom?: string[];
  };
  
  // Execution settings
  executionSchedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    hour: number; // 0-23
    timezone?: string;
  };
  
  // Statistics
  stats: {
    lastExecuted?: Date;
    recordsArchived: number;
    recordsDeleted: number;
    totalSizeArchived: number; // in bytes
    errors: {
      count: number;
      lastError?: string;
      lastErrorAt?: Date;
    };
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  modifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  shouldExecute(): boolean;
}

const DataRetentionPolicySchema = new Schema<IDataRetentionPolicy>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['form', 'auditLog', 'report', 'user', 'template', 'dashboard', 'all'],
    
  },
  retentionPeriod: {
    value: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      enum: ['days', 'months', 'years']
    }
  },
  archiveBeforeDelete: {
    type: Boolean,
    default: true
  },
  archiveLocation: {
    type: String,
    trim: true
  },
  archiveFormat: {
    type: String,
    enum: ['json', 'csv', 'compressed'],
    default: 'compressed'
  },
  conditions: [{
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      required: true,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists']
    },
    value: Schema.Types.Mixed
  }],
  legalHold: {
    enabled: {
      type: Boolean,
      default: false
    },
    reason: String,
    holdUntil: Date,
    exemptFromDeletion: {
      type: Boolean,
      default: true
    }
  },
  complianceRequirements: {
    gdpr: {
      type: Boolean,
      default: false
    },
    hipaa: {
      type: Boolean,
      default: false
    },
    sox: {
      type: Boolean,
      default: false
    },
    pci: {
      type: Boolean,
      default: false
    },
    custom: [String]
  },
  executionSchedule: {
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly']
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  stats: {
    lastExecuted: Date,
    recordsArchived: {
      type: Number,
      default: 0
    },
    recordsDeleted: {
      type: Number,
      default: 0
    },
    totalSizeArchived: {
      type: Number,
      default: 0
    },
    errors: {
      count: {
        type: Number,
        default: 0
      },
      lastError: String,
      lastErrorAt: Date
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
DataRetentionPolicySchema.index({ organizationId: 1, entityType: 1 });
DataRetentionPolicySchema.index({ isActive: 1, 'executionSchedule.frequency': 1 });
DataRetentionPolicySchema.index({ 'stats.lastExecuted': 1 });

// Virtual for retention period in milliseconds
DataRetentionPolicySchema.virtual('retentionPeriodMs').get(function() {
  const { value, unit } = this.retentionPeriod;
  const multipliers = {
    days: 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000
  };
  return value * multipliers[unit];
});

// Method to get cutoff date for retention
DataRetentionPolicySchema.methods.getCutoffDate = function(): Date {
  const now = new Date();
  const retentionMs = this.retentionPeriodMs;
  return new Date(now.getTime() - retentionMs);
};


// Instance method to check if policy should execute
DataRetentionPolicySchema.methods.shouldExecute = function(this: IDataRetentionPolicy): boolean {
  if (!this.isActive) return false;
  
  const { frequency, hour, dayOfWeek, dayOfMonth } = this.executionSchedule;
  const lastExecuted = this.stats.lastExecuted;
  const now = new Date();
  const currentHour = now.getHours();
  
  // If never executed, and it's the right hour, execute
  if (!lastExecuted) {
    return currentHour === hour;
  }
  
  // Check if it's the right hour
  if (currentHour !== hour) return false;
  
  switch (frequency) {
    case 'daily':
      // Execute if last execution was more than 23 hours ago
      return (now.getTime() - lastExecuted.getTime()) > (23 * 60 * 60 * 1000);
    
    case 'weekly':
      const currentDayOfWeek = now.getDay();
      if (currentDayOfWeek !== dayOfWeek) return false;
      // Execute if last execution was more than 6 days ago
      return (now.getTime() - lastExecuted.getTime()) > (6 * 24 * 60 * 60 * 1000);
    
    case 'monthly':
      const currentDayOfMonth = now.getDate();
      if (currentDayOfMonth !== dayOfMonth) return false;
      // Execute if last execution was more than 25 days ago
      return (now.getTime() - lastExecuted.getTime()) > (25 * 24 * 60 * 60 * 1000);
    
    default:
      return false;
  }
};

// Static method to find policies ready for execution
DataRetentionPolicySchema.statics.findReadyForExecution = function() {
  return this.find({ isActive: true }).then((policies: IDataRetentionPolicy[]) => {
    return policies.filter(policy => policy.shouldExecute());
  });
};

// Pre-save middleware to update modifiedBy
DataRetentionPolicySchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

export const DataRetentionPolicy = mongoose.model<IDataRetentionPolicy>('DataRetentionPolicy', DataRetentionPolicySchema);