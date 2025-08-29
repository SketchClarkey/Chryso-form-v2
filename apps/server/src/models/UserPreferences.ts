import { Schema, model, Document } from 'mongoose';

export interface IUserPreferences extends Document {
  userId: Schema.Types.ObjectId;
  
  appearance: {
    theme: 'light' | 'dark' | 'system';
    colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'orange';
    density: 'comfortable' | 'compact' | 'standard';
    sidebarCollapsed: boolean;
    language: string;
  };

  dashboard: {
    layout: 'grid' | 'list';
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      settings: Record<string, any>;
      visible: boolean;
    }>;
    refreshInterval: number; // seconds, 0 = manual
  };

  notifications: {
    email: {
      formSubmissions: boolean;
      formAssignments: boolean;
      systemAlerts: boolean;
      weeklyDigest: boolean;
      instantNotifications: boolean;
      dailySummary: boolean;
    };
    browser: {
      enabled: boolean;
      formSubmissions: boolean;
      formAssignments: boolean;
      systemAlerts: boolean;
      mentions: boolean;
    };
    mobile: {
      pushNotifications: boolean;
      formSubmissions: boolean;
      formAssignments: boolean;
      systemAlerts: boolean;
      quietHours: {
        enabled: boolean;
        start: string; // HH:MM
        end: string;   // HH:MM
      };
    };
  };

  workPreferences: {
    timezone: string;
    workingHours: {
      enabled: boolean;
      schedule: {
        monday: { enabled: boolean; start: string; end: string };
        tuesday: { enabled: boolean; start: string; end: string };
        wednesday: { enabled: boolean; start: string; end: string };
        thursday: { enabled: boolean; start: string; end: string };
        friday: { enabled: boolean; start: string; end: string };
        saturday: { enabled: boolean; start: string; end: string };
        sunday: { enabled: boolean; start: string; end: string };
      };
    };
    autoAssignForms: boolean;
    defaultFormView: 'grid' | 'list' | 'kanban';
  };

  dataDisplay: {
    dateFormat: string;
    timeFormat: '12h' | '24h';
    numberFormat: 'US' | 'EU' | 'UK';
    currency: string;
    itemsPerPage: number;
    defaultSortOrder: 'asc' | 'desc';
    showTutorials: boolean;
  };

  privacy: {
    profileVisibility: 'public' | 'organization' | 'private';
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
    shareActivityStatus: boolean;
  };

  shortcuts: Array<{
    id: string;
    name: string;
    keys: string[];
    action: string;
    enabled: boolean;
  }>;

  pinnedItems: {
    forms: string[];
    reports: string[];
    dashboards: string[];
    searches: string[];
  };

  recentActivity: Array<{
    type: 'form' | 'report' | 'dashboard' | 'search';
    itemId: string;
    itemName: string;
    action: string;
    timestamp: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const userPreferencesSchema = new Schema<IUserPreferences>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  appearance: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    colorScheme: { type: String, enum: ['default', 'blue', 'green', 'purple', 'orange'], default: 'default' },
    density: { type: String, enum: ['comfortable', 'compact', 'standard'], default: 'standard' },
    sidebarCollapsed: { type: Boolean, default: false },
    language: { type: String, default: 'en' }
  },

  dashboard: {
    layout: { type: String, enum: ['grid', 'list'], default: 'grid' },
    widgets: [{
      id: { type: String, required: true },
      type: { type: String, required: true },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        w: { type: Number, required: true },
        h: { type: Number, required: true }
      },
      settings: { type: Schema.Types.Mixed, default: {} },
      visible: { type: Boolean, default: true }
    }],
    refreshInterval: { type: Number, default: 300 } // 5 minutes
  },

  notifications: {
    email: {
      formSubmissions: { type: Boolean, default: true },
      formAssignments: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      instantNotifications: { type: Boolean, default: false },
      dailySummary: { type: Boolean, default: true }
    },
    browser: {
      enabled: { type: Boolean, default: true },
      formSubmissions: { type: Boolean, default: true },
      formAssignments: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    },
    mobile: {
      pushNotifications: { type: Boolean, default: true },
      formSubmissions: { type: Boolean, default: true },
      formAssignments: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: false },
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' },
        end: { type: String, default: '08:00' }
      }
    }
  },

  workPreferences: {
    timezone: { type: String, default: 'UTC' },
    workingHours: {
      enabled: { type: Boolean, default: false },
      schedule: {
        monday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
        tuesday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
        wednesday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
        thursday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
        friday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
        saturday: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
        sunday: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } }
      }
    },
    autoAssignForms: { type: Boolean, default: false },
    defaultFormView: { type: String, enum: ['grid', 'list', 'kanban'], default: 'list' }
  },

  dataDisplay: {
    dateFormat: { type: String, default: 'MM/dd/yyyy' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
    numberFormat: { type: String, enum: ['US', 'EU', 'UK'], default: 'US' },
    currency: { type: String, default: 'USD' },
    itemsPerPage: { type: Number, default: 25, min: 10, max: 100 },
    defaultSortOrder: { type: String, enum: ['asc', 'desc'], default: 'desc' },
    showTutorials: { type: Boolean, default: true }
  },

  privacy: {
    profileVisibility: { type: String, enum: ['public', 'organization', 'private'], default: 'organization' },
    showOnlineStatus: { type: Boolean, default: true },
    allowDirectMessages: { type: Boolean, default: true },
    shareActivityStatus: { type: Boolean, default: true }
  },

  shortcuts: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    keys: { type: [String], required: true },
    action: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  }],

  pinnedItems: {
    forms: { type: [String], default: [] },
    reports: { type: [String], default: [] },
    dashboards: { type: [String], default: [] },
    searches: { type: [String], default: [] }
  },

  recentActivity: [{
    type: { type: String, enum: ['form', 'report', 'dashboard', 'search'], required: true },
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'userPreferences'
});

// Indexes (userId index is created by unique: true)
userPreferencesSchema.index({ createdAt: 1 });
userPreferencesSchema.index({ updatedAt: 1 });

// Limit recent activity to 50 items
userPreferencesSchema.pre('save', function(next) {
  if (this.recentActivity && this.recentActivity.length > 50) {
    this.recentActivity = this.recentActivity.slice(0, 50);
  }
  next();
});

export const UserPreferences = model<IUserPreferences>('UserPreferences', userPreferencesSchema);