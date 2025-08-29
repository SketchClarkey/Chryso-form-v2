import { Schema, model, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  organizationId: string;
  name: string;
  description?: string;
  category: 'system' | 'notification' | 'workflow' | 'custom';
  type:
    | 'welcome'
    | 'form_notification'
    | 'password_reset'
    | 'form_reminder'
    | 'approval_request'
    | 'approval_response'
    | 'system_alert'
    | 'digest'
    | 'custom';

  subject: string;
  htmlContent: string;
  textContent?: string;

  variables: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
    required: boolean;
    defaultValue?: any;
    example?: any;
  }>;

  settings: {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    priority: 'low' | 'normal' | 'high';
    trackOpens: boolean;
    trackClicks: boolean;
  };

  triggers: Array<{
    event: string;
    conditions?: Record<string, any>;
    delay?: number; // minutes
    enabled: boolean;
  }>;

  localization: {
    defaultLanguage: string;
    translations: Array<{
      language: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
    }>;
  };

  isActive: boolean;
  isSystem: boolean; // System templates can't be deleted
  version: number;

  usage: {
    sentCount: number;
    lastSent?: Date;
    openRate?: number;
    clickRate?: number;
  };

  createdAt: Date;
  updatedAt: Date;
  createdBy: Schema.Types.ObjectId;
  updatedBy: Schema.Types.ObjectId;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    organizationId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['system', 'notification', 'workflow', 'custom'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'welcome',
        'form_notification',
        'password_reset',
        'form_reminder',
        'approval_request',
        'approval_response',
        'system_alert',
        'digest',
        'custom',
      ],
      required: true,
    },

    subject: { type: String, required: true },
    htmlContent: { type: String, required: true },
    textContent: { type: String },

    variables: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        type: {
          type: String,
          enum: ['string', 'number', 'date', 'boolean', 'array', 'object'],
          default: 'string',
        },
        required: { type: Boolean, default: false },
        defaultValue: Schema.Types.Mixed,
        example: Schema.Types.Mixed,
      },
    ],

    settings: {
      fromName: { type: String },
      fromEmail: { type: String },
      replyTo: { type: String },
      priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
      trackOpens: { type: Boolean, default: true },
      trackClicks: { type: Boolean, default: true },
    },

    triggers: [
      {
        event: { type: String, required: true },
        conditions: { type: Schema.Types.Mixed },
        delay: { type: Number, default: 0 }, // minutes
        enabled: { type: Boolean, default: true },
      },
    ],

    localization: {
      defaultLanguage: { type: String, default: 'en' },
      translations: [
        {
          language: { type: String, required: true },
          subject: { type: String, required: true },
          htmlContent: { type: String, required: true },
          textContent: { type: String },
        },
      ],
    },

    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    version: { type: Number, default: 1 },

    usage: {
      sentCount: { type: Number, default: 0 },
      lastSent: { type: Date },
      openRate: { type: Number, default: 0, min: 0, max: 100 },
      clickRate: { type: Number, default: 0, min: 0, max: 100 },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'emailTemplates',
  }
);

// Indexes
emailTemplateSchema.index({ organizationId: 1, category: 1 });
emailTemplateSchema.index({ organizationId: 1, isActive: 1 });
emailTemplateSchema.index({ createdAt: 1 });
emailTemplateSchema.index({ 'usage.sentCount': -1 });

// Ensure unique template types per organization (for system templates - this also serves as organizationId + type index)
emailTemplateSchema.index(
  { organizationId: 1, type: 1 },
  { unique: true, partialFilterExpression: { isSystem: true } }
);

// Pre-save middleware
emailTemplateSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Methods
emailTemplateSchema.methods.incrementUsage = function () {
  this.usage.sentCount += 1;
  this.usage.lastSent = new Date();
  return this.save();
};

emailTemplateSchema.methods.updateEngagementStats = function (opens: number, clicks: number) {
  if (this.usage.sentCount > 0) {
    this.usage.openRate = (opens / this.usage.sentCount) * 100;
    this.usage.clickRate = (clicks / this.usage.sentCount) * 100;
  }
  return this.save();
};

// Statics
emailTemplateSchema.statics.getSystemTemplates = function (organizationId: string) {
  return this.find({ organizationId, isSystem: true, isActive: true });
};

emailTemplateSchema.statics.getByType = function (organizationId: string, type: string) {
  return this.findOne({ organizationId, type, isActive: true });
};

export const EmailTemplate = model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);
