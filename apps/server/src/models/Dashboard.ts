import mongoose, { Document, Schema } from 'mongoose';

export interface IDashboardWidget extends Document {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'text' | 'filter';
  title: string;
  description?: string;
  config: {
    // Metric widget config
    metric?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    format?: 'number' | 'percentage' | 'currency' | 'time';

    // Chart widget config
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
    dataSource?: string;
    xAxis?: string;
    yAxis?: string[];

    // Table widget config
    columns?: Array<{
      field: string;
      header: string;
      width?: number;
      sortable?: boolean;
      filterable?: boolean;
    }>;

    // Filter widget config
    filterType?: 'dropdown' | 'multiselect' | 'daterange' | 'search';
    filterOptions?: any[];

    // Common config
    refreshInterval?: number;
    dateRange?: {
      type: 'fixed' | 'relative';
      start?: Date;
      end?: Date;
      relativeDays?: number;
    };
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  styling?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius?: number;
    shadow?: boolean;
    padding?: number;
  };
  visibility?: {
    roles: string[];
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
}

export interface IDashboard extends Document {
  name: string;
  description?: string;
  category: 'personal' | 'team' | 'organization' | 'public';
  tags: string[];
  layout: {
    type: 'grid' | 'freeform';
    columns: number;
    gap: number;
    padding: number;
    backgroundColor?: string;
  };
  widgets: IDashboardWidget[];
  settings: {
    autoRefresh: boolean;
    refreshInterval?: number;
    theme: 'light' | 'dark' | 'auto';
    fullscreen: boolean;
    showHeader: boolean;
    showFilters: boolean;
  };
  permissions: {
    canView: string[];
    canEdit: string[];
    canShare: string[];
  };
  sharing: {
    isPublic: boolean;
    shareToken?: string;
    allowAnonymous: boolean;
    expiration?: Date;
  };
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  usage: {
    totalViews: number;
    lastViewed?: Date;
    favoriteCount: number;
    shareCount: number;
  };
  version: number;
  versionHistory?: Array<{
    version: number;
    changes: string;
    modifiedBy: mongoose.Types.ObjectId;
    timestamp: Date;
    snapshot: any;
  }>;
  isTemplate: boolean;
  templateMetadata?: {
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedSetupTime: number;
    prerequisites?: string[];
    instructions?: string;
  };
}

const DashboardWidgetSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['metric', 'chart', 'table', 'text', 'filter'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  config: {
    metric: String,
    aggregation: { type: String, enum: ['sum', 'avg', 'count', 'min', 'max'] },
    format: { type: String, enum: ['number', 'percentage', 'currency', 'time'] },
    chartType: { type: String, enum: ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter'] },
    dataSource: String,
    xAxis: String,
    yAxis: [String],
    columns: [
      {
        field: String,
        header: String,
        width: Number,
        sortable: Boolean,
        filterable: Boolean,
      },
    ],
    filterType: { type: String, enum: ['dropdown', 'multiselect', 'daterange', 'search'] },
    filterOptions: [Schema.Types.Mixed],
    refreshInterval: { type: Number, min: 5, max: 3600 },
    dateRange: {
      type: { type: String, enum: ['fixed', 'relative'] },
      start: Date,
      end: Date,
      relativeDays: Number,
    },
    filters: [
      {
        field: String,
        operator: String,
        value: Schema.Types.Mixed,
      },
    ],
  },
  layout: {
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    width: { type: Number, required: true, min: 1, max: 12 },
    height: { type: Number, required: true, min: 1, max: 20 },
    minWidth: { type: Number, min: 1 },
    minHeight: { type: Number, min: 1 },
    maxWidth: { type: Number, max: 12 },
    maxHeight: { type: Number, max: 20 },
  },
  styling: {
    backgroundColor: String,
    borderColor: String,
    textColor: String,
    borderRadius: { type: Number, min: 0, max: 50 },
    shadow: Boolean,
    padding: { type: Number, min: 0, max: 50 },
  },
  visibility: {
    roles: [{ type: String, enum: ['admin', 'manager', 'technician'] }],
    conditions: [
      {
        field: String,
        operator: String,
        value: Schema.Types.Mixed,
      },
    ],
  },
});

const DashboardSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: ['personal', 'team', 'organization', 'public'],
      required: true,
    },
    tags: [{ type: String, maxlength: 50 }],
    layout: {
      type: { type: String, enum: ['grid', 'freeform'], default: 'grid' },
      columns: { type: Number, default: 12, min: 1, max: 24 },
      gap: { type: Number, default: 16, min: 0, max: 50 },
      padding: { type: Number, default: 16, min: 0, max: 50 },
      backgroundColor: String,
    },
    widgets: [DashboardWidgetSchema],
    settings: {
      autoRefresh: { type: Boolean, default: false },
      refreshInterval: { type: Number, min: 5, max: 3600 },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      fullscreen: { type: Boolean, default: false },
      showHeader: { type: Boolean, default: true },
      showFilters: { type: Boolean, default: true },
    },
    permissions: {
      canView: [{ type: String, enum: ['admin', 'manager', 'technician'] }],
      canEdit: [{ type: String, enum: ['admin', 'manager', 'technician'] }],
      canShare: [{ type: String, enum: ['admin', 'manager', 'technician'] }],
    },
    sharing: {
      isPublic: { type: Boolean, default: false },
      shareToken: String,
      allowAnonymous: { type: Boolean, default: false },
      expiration: Date,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usage: {
      totalViews: { type: Number, default: 0 },
      lastViewed: Date,
      favoriteCount: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
    },
    version: { type: Number, default: 1 },
    versionHistory: [
      {
        version: Number,
        changes: String,
        modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        snapshot: Schema.Types.Mixed,
      },
    ],
    isTemplate: { type: Boolean, default: false },
    templateMetadata: {
      category: String,
      difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
      estimatedSetupTime: Number,
      prerequisites: [String],
      instructions: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
DashboardSchema.index({ createdBy: 1, category: 1 });
DashboardSchema.index({ 'sharing.isPublic': 1, 'sharing.shareToken': 1 });
DashboardSchema.index({ tags: 1 });
DashboardSchema.index({ 'usage.totalViews': -1 });
DashboardSchema.index({ createdAt: -1 });

// Text search index
DashboardSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
});

// Methods
DashboardSchema.methods.toSafeObject = function (userRole: string) {
  const dashboard = this.toObject();

  // Remove sensitive information based on permissions
  if (!this.permissions.canEdit.includes(userRole) && userRole !== 'admin') {
    delete dashboard.sharing.shareToken;
    delete dashboard.versionHistory;
  }

  return dashboard;
};

DashboardSchema.methods.canAccess = function (userRole: string, userId: string): boolean {
  // Public dashboards are accessible to everyone
  if (this.sharing.isPublic) return true;

  // Owner always has access
  if (this.createdBy.toString() === userId) return true;

  // Check role-based permissions
  return this.permissions.canView.includes(userRole);
};

DashboardSchema.methods.canEdit = function (userRole: string, userId: string): boolean {
  // Owner always can edit
  if (this.createdBy.toString() === userId) return true;

  // Admin can edit everything
  if (userRole === 'admin') return true;

  // Check role-based permissions
  return this.permissions.canEdit.includes(userRole);
};

DashboardSchema.methods.createVersion = function (changes: string, userId: string) {
  this.versionHistory.push({
    version: this.version,
    changes,
    modifiedBy: userId,
    timestamp: new Date(),
    snapshot: {
      widgets: this.widgets,
      layout: this.layout,
      settings: this.settings,
    },
  });

  this.version += 1;
  this.lastModifiedBy = userId;
};

DashboardSchema.methods.duplicate = async function (
  newName: string,
  userId: string
): Promise<IDashboard> {
  const Dashboard = this.constructor as mongoose.Model<IDashboard>;

  const duplicatedDashboard = new Dashboard({
    ...this.toObject(),
    _id: undefined,
    name: newName,
    createdBy: userId,
    lastModifiedBy: userId,
    usage: {
      totalViews: 0,
      favoriteCount: 0,
      shareCount: 0,
    },
    version: 1,
    versionHistory: [],
    sharing: {
      isPublic: false,
      allowAnonymous: false,
    },
    createdAt: undefined,
    updatedAt: undefined,
  });

  return duplicatedDashboard.save();
};

export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);
export const DashboardWidget = mongoose.model<IDashboardWidget>(
  'DashboardWidget',
  DashboardWidgetSchema
);
