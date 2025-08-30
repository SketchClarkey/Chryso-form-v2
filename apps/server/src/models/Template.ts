import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
}

export interface IFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface IFormField {
  id: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'phone'
    | 'date'
    | 'datetime'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'file'
    | 'signature'
    | 'separator'
    | 'heading';
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: IFieldOption[];
  validation?: IFieldValidation;
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  layout?: {
    width: number; // 1-12 (grid columns)
    order: number;
  };
  styling?: {
    className?: string;
    style?: Record<string, any>;
  };
}

export interface IFormSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: IFormField[];
  layout?: {
    columns: number;
    order: number;
  };
}

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  category:
    | 'maintenance'
    | 'inspection'
    | 'service'
    | 'installation'
    | 'calibration'
    | 'breakdown'
    | 'custom';

  // Template Structure
  sections: IFormSection[];
  elements: any[]; // For backward compatibility with routes

  // Metadata for versioning and tracking
  metadata: {
    version: number;
    createdBy?: Types.ObjectId;
    lastModifiedBy?: Types.ObjectId;
    templateType?: string;
    customProperties?: Record<string, any>;
  };

  // Metadata
  version: number;
  status: 'draft' | 'active' | 'archived' | 'pending_approval';
  tags: string[];

  // Usage Statistics
  usage: {
    totalForms: number;
    lastUsed?: Date;
    averageCompletionTime?: number;
  };

  // Permissions and Ownership
  createdBy: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;
  organization?: Types.ObjectId;
  permissions: {
    canView: string[]; // user roles
    canUse: string[]; // user roles
    canEdit: string[]; // user roles
  };

  // Approval Workflow
  approvalWorkflow?: {
    enabled: boolean;
    approvers: Types.ObjectId[];
    currentApprover?: Types.ObjectId;
    approvalHistory: Array<{
      approver: Types.ObjectId;
      action: 'approved' | 'rejected' | 'requested_changes';
      comment?: string;
      timestamp: Date;
    }>;
  };

  // Template Settings
  settings: {
    allowDuplicates: boolean;
    requiresApproval: boolean;
    autoSave: boolean;
    saveInterval: number; // minutes
    notifications: {
      onSubmit: boolean;
      onApproval: boolean;
      assignees: Types.ObjectId[];
    };
  };

  // Versioning
  parentTemplate?: Types.ObjectId;
  childTemplates: Types.ObjectId[];
  versionHistory: Array<{
    version: number;
    changes: string;
    modifiedBy: Types.ObjectId;
    timestamp: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  createForm(data: any, userId: Types.ObjectId): Promise<any>;
  clone(newName: string, userId: Types.ObjectId): Promise<ITemplate>;
  validateStructure(): { valid: boolean; errors: string[] };
}

const fieldValidationSchema = new Schema<IFieldValidation>(
  {
    required: { type: Boolean, default: false },
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
    custom: { type: String },
  },
  { _id: false }
);

const fieldOptionSchema = new Schema<IFieldOption>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const formFieldSchema = new Schema<IFormField>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'text',
        'textarea',
        'number',
        'email',
        'phone',
        'date',
        'datetime',
        'select',
        'multiselect',
        'radio',
        'checkbox',
        'file',
        'signature',
        'separator',
        'heading',
      ],
      required: true,
    },
    label: {
      type: String,
      required: true,
      maxlength: [200, 'Field label cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Field description cannot exceed 500 characters'],
    },
    placeholder: {
      type: String,
      maxlength: [100, 'Placeholder cannot exceed 100 characters'],
    },
    defaultValue: Schema.Types.Mixed,
    options: [fieldOptionSchema],
    validation: fieldValidationSchema,
    conditional: {
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'],
      },
      value: Schema.Types.Mixed,
    },
    layout: {
      width: { type: Number, min: 1, max: 12, default: 12 },
      order: { type: Number, default: 0 },
    },
    styling: {
      className: String,
      style: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const formSectionSchema = new Schema<IFormSection>(
  {
    id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Section title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Section description cannot exceed 500 characters'],
    },
    collapsible: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    fields: [formFieldSchema],
    layout: {
      columns: { type: Number, min: 1, max: 4, default: 1 },
      order: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const templateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [200, 'Template name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Template description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: [
        'maintenance',
        'inspection',
        'service',
        'installation',
        'calibration',
        'breakdown',
        'custom',
      ],
      required: true,
    },

    sections: [formSectionSchema],
    elements: [Schema.Types.Mixed], // For backward compatibility

    // Metadata object
    metadata: {
      version: { type: Number, default: 1 },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      templateType: { type: String },
      customProperties: { type: Schema.Types.Mixed, default: {} },
    },

    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'pending_approval'],
      default: 'draft',
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
      },
    ],

    usage: {
      totalForms: { type: Number, default: 0 },
      lastUsed: Date,
      averageCompletionTime: Number,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    permissions: {
      canView: [
        {
          type: String,
          enum: ['admin', 'manager', 'technician', 'viewer'],
        },
      ],
      canUse: [
        {
          type: String,
          enum: ['admin', 'manager', 'technician'],
        },
      ],
      canEdit: [
        {
          type: String,
          enum: ['admin', 'manager'],
        },
      ],
    },

    approvalWorkflow: {
      enabled: { type: Boolean, default: false },
      approvers: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      currentApprover: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      approvalHistory: [
        {
          approver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          action: {
            type: String,
            enum: ['approved', 'rejected', 'requested_changes'],
            required: true,
          },
          comment: String,
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    settings: {
      allowDuplicates: { type: Boolean, default: true },
      requiresApproval: { type: Boolean, default: false },
      autoSave: { type: Boolean, default: true },
      saveInterval: { type: Number, default: 5 },
      notifications: {
        onSubmit: { type: Boolean, default: true },
        onApproval: { type: Boolean, default: true },
        assignees: [
          {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
      },
    },

    parentTemplate: {
      type: Schema.Types.ObjectId,
      ref: 'Template',
    },
    childTemplates: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Template',
      },
    ],
    versionHistory: [
      {
        version: { type: Number, required: true },
        changes: { type: String, required: true },
        modifiedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes for performance
templateSchema.index({ name: 'text', description: 'text', tags: 'text' });
templateSchema.index({ category: 1, status: 1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ 'permissions.canView': 1 });
templateSchema.index({ 'usage.lastUsed': -1 });
templateSchema.index({ version: -1, parentTemplate: 1 });

// Virtual for checking if template has pending approval
templateSchema.virtual('hasPendingApproval').get(function () {
  return this.status === 'pending_approval' && this.approvalWorkflow?.enabled;
});

// Virtual for getting current version string
templateSchema.virtual('versionString').get(function () {
  return `v${this.version}`;
});

// Pre-save middleware for versioning
templateSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
    this.lastModifiedBy = this.lastModifiedBy || this.createdBy;
  }
  next();
});

// Methods
templateSchema.methods.createForm = async function (data: any, userId: Types.ObjectId) {
  const Form = mongoose.model('Form');

  // Transform template structure to form data
  const formData = {
    templateUsed: this._id,
    technician: userId,
    status: 'draft',
    sections: this.sections,
    metadata: {
      createdBy: userId,
      templateUsed: this._id,
      version: 1,
    },
    ...data,
  };

  const form = new Form(formData);
  await form.save();

  // Update template usage statistics
  this.usage.totalForms += 1;
  this.usage.lastUsed = new Date();
  await this.save();

  return form;
};

templateSchema.methods.clone = async function (
  newName: string,
  userId: Types.ObjectId
): Promise<ITemplate> {
  const cloneData = {
    name: newName,
    description: this.description,
    category: this.category,
    sections: this.sections,
    status: 'draft',
    tags: this.tags,
    createdBy: userId,
    parentTemplate: this._id,
    permissions: this.permissions,
    settings: this.settings,
    version: 1,
  };

  const Template = mongoose.model<ITemplate>('Template');
  const clone = new Template(cloneData);
  await clone.save();

  // Add to parent's children
  this.childTemplates.push(clone._id);
  await this.save();

  return clone;
};

templateSchema.methods.validateStructure = function (): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if template has at least one section
  if (!this.sections || this.sections.length === 0) {
    errors.push('Template must have at least one section');
  }

  // Validate each section
  this.sections.forEach((section: IFormSection, sIndex: number) => {
    if (!section.title) {
      errors.push(`Section ${sIndex + 1} must have a title`);
    }

    if (!section.fields || section.fields.length === 0) {
      errors.push(`Section "${section.title}" must have at least one field`);
    }

    // Validate each field
    section.fields.forEach((field: IFormField, fIndex: number) => {
      if (!field.id) {
        errors.push(`Field ${fIndex + 1} in section "${section.title}" must have an ID`);
      }

      if (!field.label) {
        errors.push(`Field "${field.id}" in section "${section.title}" must have a label`);
      }

      // Validate field-specific requirements
      if (['select', 'multiselect', 'radio'].includes(field.type)) {
        if (!field.options || field.options.length === 0) {
          errors.push(`Field "${field.label}" must have options`);
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const Template = mongoose.model<ITemplate>('Template', templateSchema);
