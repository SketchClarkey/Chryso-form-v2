import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDataSource {
  id: string;
  type: 'form' | 'template' | 'worksite' | 'user';
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';
    path: string; // dot notation path to the field in the data
  }>;
  filters?: Array<{
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'starts_with'
      | 'ends_with'
      | 'greater_than'
      | 'less_than'
      | 'between'
      | 'in'
      | 'not_in';
    value: any;
    logic?: 'and' | 'or';
  }>;
}

export interface IVisualization {
  id: string;
  type: 'table' | 'chart' | 'metric' | 'text' | 'image';
  title?: string;
  description?: string;
  dataSource: string; // references IDataSource.id
  config: {
    // Table config
    columns?: Array<{
      field: string;
      header: string;
      width?: number;
      sortable?: boolean;
      filterable?: boolean;
      format?: string; // date format, number format, etc.
    }>;

    // Chart config
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';
    xAxis?: string;
    yAxis?: string | string[];
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    groupBy?: string;

    // Metric config
    field?: string;
    calculation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    format?: string;
    prefix?: string;
    suffix?: string;

    // Text config
    content?: string; // markdown or HTML

    // Image config
    url?: string;
    alt?: string;
  };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styling?: {
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    padding?: number;
    margin?: number;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
  };
}

export interface IReport extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  category: 'operational' | 'analytical' | 'compliance' | 'financial' | 'custom';

  // Report Structure
  dataSources: IDataSource[];
  visualizations: IVisualization[];
  layout: {
    width: number;
    height: number;
    backgroundColor?: string;
    margins?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };

  // Report Settings
  settings: {
    isPublic: boolean;
    allowExport: boolean;
    exportFormats: Array<'pdf' | 'excel' | 'csv' | 'image'>;
    autoRefresh: boolean;
    refreshInterval?: number; // minutes
    cacheTimeout?: number; // minutes
  };

  // Scheduling
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    cronExpression?: string; // Custom cron expression
    time?: string; // HH:mm format
    dayOfWeek?: number; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
    timezone?: string; // Timezone for scheduling
    recipients: Array<{
      email: string;
      name?: string;
    }>;
    exportFormat?: 'pdf' | 'excel' | 'csv'; // Export format for scheduled reports
    subject?: string;
    message?: string;
    lastRun?: Date;
    nextRun?: Date;
  };

  // Metadata
  version: number;
  status: 'draft' | 'published' | 'archived';
  tags: string[];

  // Usage Statistics
  usage: {
    totalViews: number;
    totalExports: number;
    lastViewed?: Date;
    lastExported?: Date;
    averageViewTime?: number; // seconds
  };

  // Permissions and Ownership
  createdBy: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;
  organization?: Types.ObjectId;
  permissions: {
    canView: string[]; // user roles
    canEdit: string[]; // user roles
    canExport: string[]; // user roles
  };

  // Collaboration
  collaborators: Array<{
    user: Types.ObjectId;
    role: 'viewer' | 'editor' | 'owner';
    addedAt: Date;
  }>;

  // Versioning
  versionHistory: Array<{
    version: number;
    changes: string;
    modifiedBy: Types.ObjectId;
    timestamp: Date;
    snapshot?: any; // serialized report configuration
  }>;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  generateData(dateRange?: { start: Date; end: Date }): Promise<any>;
  exportReport(format: 'pdf' | 'excel' | 'csv'): Promise<Buffer>;
  scheduleDelivery(): Promise<void>;
  clone(newName: string, userId: Types.ObjectId): Promise<IReport>;
}

const dataSourceSchema = new Schema<IDataSource>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['form', 'template', 'worksite', 'user'],
      required: true,
    },
    name: { type: String, required: true },
    fields: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'boolean', 'array', 'object'],
          required: true,
        },
        path: { type: String, required: true },
      },
    ],
    filters: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: [
            'equals',
            'not_equals',
            'contains',
            'starts_with',
            'ends_with',
            'greater_than',
            'less_than',
            'between',
            'in',
            'not_in',
          ],
          required: true,
        },
        value: Schema.Types.Mixed,
        logic: {
          type: String,
          enum: ['and', 'or'],
          default: 'and',
        },
      },
    ],
  },
  { _id: false }
);

const visualizationSchema = new Schema<IVisualization>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['table', 'chart', 'metric', 'text', 'image'],
      required: true,
    },
    title: String,
    description: String,
    dataSource: { type: String, required: true },
    config: {
      // Table config
      columns: [
        {
          field: { type: String, required: true },
          header: { type: String, required: true },
          width: Number,
          sortable: { type: Boolean, default: true },
          filterable: { type: Boolean, default: true },
          format: String,
        },
      ],

      // Chart config
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter'],
      },
      xAxis: String,
      yAxis: [String],
      aggregation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max'],
      },
      groupBy: String,

      // Metric config
      field: String,
      calculation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max'],
      },
      format: String,
      prefix: String,
      suffix: String,

      // Text config
      content: String,

      // Image config
      url: String,
      alt: String,
    },
    layout: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    styling: {
      backgroundColor: String,
      borderColor: String,
      borderRadius: Number,
      padding: Number,
      margin: Number,
      fontSize: Number,
      fontWeight: String,
      color: String,
    },
  },
  { _id: false }
);

const reportSchema = new Schema<IReport>(
  {
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
      maxlength: [200, 'Report name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Report description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: ['operational', 'analytical', 'compliance', 'financial', 'custom'],
      required: true,
      default: 'custom',
    },

    dataSources: [dataSourceSchema],
    visualizations: [visualizationSchema],

    layout: {
      width: { type: Number, default: 1200 },
      height: { type: Number, default: 800 },
      backgroundColor: { type: String, default: '#ffffff' },
      margins: {
        top: { type: Number, default: 20 },
        right: { type: Number, default: 20 },
        bottom: { type: Number, default: 20 },
        left: { type: Number, default: 20 },
      },
    },

    settings: {
      isPublic: { type: Boolean, default: false },
      allowExport: { type: Boolean, default: true },
      exportFormats: [
        {
          type: String,
          enum: ['pdf', 'excel', 'csv', 'image'],
        },
      ],
      autoRefresh: { type: Boolean, default: false },
      refreshInterval: { type: Number, default: 15 },
      cacheTimeout: { type: Number, default: 5 },
    },

    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      },
      cronExpression: String, // Custom cron expression
      time: String,
      dayOfWeek: { type: Number, min: 0, max: 6 },
      dayOfMonth: { type: Number, min: 1, max: 31 },
      timezone: { type: String, default: 'UTC' }, // Timezone for scheduling
      recipients: [
        {
          email: { type: String, required: true },
          name: String,
        },
      ],
      exportFormat: {
        type: String,
        enum: ['pdf', 'excel', 'csv'],
        default: 'pdf',
      }, // Export format for scheduled reports
      subject: String,
      message: String,
      lastRun: Date,
      nextRun: Date,
    },

    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
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
      totalViews: { type: Number, default: 0 },
      totalExports: { type: Number, default: 0 },
      lastViewed: Date,
      lastExported: Date,
      averageViewTime: Number,
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
      canEdit: [
        {
          type: String,
          enum: ['admin', 'manager'],
        },
      ],
      canExport: [
        {
          type: String,
          enum: ['admin', 'manager', 'technician'],
        },
      ],
    },

    collaborators: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['viewer', 'editor', 'owner'],
          default: 'viewer',
        },
        addedAt: { type: Date, default: Date.now },
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
        snapshot: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes for performance
reportSchema.index({ name: 'text', description: 'text', tags: 'text' });
reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ 'permissions.canView': 1 });
reportSchema.index({ 'usage.lastViewed': -1 });
reportSchema.index({ version: -1 });

// Virtual for checking if report is scheduled
reportSchema.virtual('isScheduled').get(function () {
  return this.schedule?.enabled && this.schedule.frequency;
});

// Pre-save middleware for versioning
reportSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
    this.lastModifiedBy = this.lastModifiedBy || this.createdBy;
  }
  next();
});

// Methods
reportSchema.methods.generateData = async function (dateRange?: { start: Date; end: Date }) {
  // Implementation would query the database based on data sources
  // and return formatted data for visualizations
  const data: any = {};

  for (const dataSource of this.dataSources) {
    // Query logic based on dataSource.type and filters
    switch (dataSource.type) {
      case 'form':
        // Query Form collection
        break;
      case 'template':
        // Query Template collection
        break;
      case 'worksite':
        // Query Worksite collection
        break;
      case 'user':
        // Query User collection
        break;
    }

    data[dataSource.id] = []; // Placeholder for actual data
  }

  return data;
};

reportSchema.methods.exportReport = async function (
  format: 'pdf' | 'excel' | 'csv'
): Promise<Buffer> {
  // Implementation would generate report in specified format
  // This would integrate with libraries like puppeteer (PDF), xlsx (Excel), etc.
  throw new Error('Export functionality not implemented yet');
};

reportSchema.methods.scheduleDelivery = async function (): Promise<void> {
  // Implementation would schedule report delivery
  // This would integrate with a job queue system
  throw new Error('Schedule delivery not implemented yet');
};

reportSchema.methods.clone = async function (
  newName: string,
  userId: Types.ObjectId
): Promise<IReport> {
  const cloneData = {
    name: newName,
    description: this.description,
    category: this.category,
    dataSources: this.dataSources,
    visualizations: this.visualizations,
    layout: this.layout,
    settings: this.settings,
    status: 'draft',
    tags: this.tags,
    createdBy: userId,
    permissions: this.permissions,
    version: 1,
  };

  const Report = mongoose.model<IReport>('Report');
  const clone = new Report(cloneData);
  await clone.save();

  return clone;
};

export const Report = mongoose.model<IReport>('Report', reportSchema);
