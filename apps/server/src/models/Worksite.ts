import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEquipment {
  id: string;
  type: 'pump' | 'tank' | 'dispenser' | 'pulseMeter';
  model?: string;
  serialNumber?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs-repair';
  lastServiceDate?: Date;
  notes?: string;
  specifications?: {
    capacity?: number;
    flowRate?: number;
    pressure?: number;
    voltage?: number;
    [key: string]: any;
  };
}

export interface IContact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface IWorksite extends Document {
  _id: Types.ObjectId;
  name: string;
  customerName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contacts: IContact[];
  equipment: IEquipment[];
  isActive: boolean;
  metadata: {
    createdBy: Types.ObjectId;
    lastModifiedBy?: Types.ObjectId;
    defaultFormTemplate?: Types.ObjectId;
    serviceHistory: {
      totalForms: number;
      lastServiceDate?: Date;
      lastServiceType?: string;
    };
  };
  preferences: {
    autoFillEquipment: boolean;
    defaultChemicals: string[];
    notifications: {
      serviceReminders: boolean;
      equipmentAlerts: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const equipmentSchema = new Schema<IEquipment>({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['pump', 'tank', 'dispenser', 'pulseMeter'],
    required: true,
  },
  model: {
    type: String,
    trim: true,
  },
  serialNumber: {
    type: String,
    trim: true,
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'needs-repair'],
    required: true,
    default: 'good',
  },
  lastServiceDate: {
    type: Date,
  },
  notes: {
    type: String,
    maxlength: [500, 'Equipment notes cannot exceed 500 characters'],
  },
  specifications: {
    type: Map,
    of: Schema.Types.Mixed,
  },
}, {
  _id: false,
  timestamps: false,
});

const contactSchema = new Schema<IContact>({
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
    maxlength: [100, 'Contact name cannot exceed 100 characters'],
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
}, {
  _id: false,
  timestamps: false,
});

const worksiteSchema = new Schema<IWorksite>({
  name: {
    type: String,
    required: [true, 'Worksite name is required'],
    trim: true,
    maxlength: [200, 'Worksite name cannot exceed 200 characters'],
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters'],
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters'],
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
      default: 'United States',
    },
  },
  contacts: [contactSchema],
  equipment: [equipmentSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    defaultFormTemplate: {
      type: Schema.Types.ObjectId,
      ref: 'Template',
    },
    serviceHistory: {
      totalForms: {
        type: Number,
        default: 0,
      },
      lastServiceDate: {
        type: Date,
      },
      lastServiceType: {
        type: String,
      },
    },
  },
  preferences: {
    autoFillEquipment: {
      type: Boolean,
      default: true,
    },
    defaultChemicals: [{
      type: String,
      trim: true,
    }],
    notifications: {
      serviceReminders: {
        type: Boolean,
        default: true,
      },
      equipmentAlerts: {
        type: Boolean,
        default: true,
      },
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes for performance
worksiteSchema.index({ name: 'text', customerName: 'text' });
worksiteSchema.index({ 'metadata.createdBy': 1 });
worksiteSchema.index({ isActive: 1 });
worksiteSchema.index({ 'address.city': 1, 'address.state': 1 });

// Virtual for full address
worksiteSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Virtual for primary contact
worksiteSchema.virtual('primaryContact').get(function() {
  if (!this.contacts || this.contacts.length === 0) return null;
  return this.contacts.find(contact => contact.isPrimary) || this.contacts[0];
});

// Middleware to ensure only one primary contact
worksiteSchema.pre('save', function(next) {
  if (this.contacts.length > 0) {
    const primaryContacts = this.contacts.filter(contact => contact.isPrimary);
    if (primaryContacts.length === 0) {
      this.contacts[0].isPrimary = true;
    } else if (primaryContacts.length > 1) {
      this.contacts.forEach((contact, index) => {
        contact.isPrimary = index === 0;
      });
    }
  }
  next();
});

// Methods
worksiteSchema.methods.addEquipment = function(equipment: Partial<IEquipment>) {
  const newEquipment: IEquipment = {
    id: equipment.id || `${equipment.type}-${Date.now()}`,
    type: equipment.type!,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    condition: equipment.condition || 'good',
    lastServiceDate: equipment.lastServiceDate,
    notes: equipment.notes,
    specifications: equipment.specifications,
  };
  
  this.equipment.push(newEquipment);
  return this.save();
};

worksiteSchema.methods.updateEquipment = function(equipmentId: string, updates: Partial<IEquipment>) {
  const equipmentIndex = this.equipment.findIndex((eq: any) => eq.id === equipmentId);
  if (equipmentIndex === -1) {
    throw new Error('Equipment not found');
  }
  
  Object.assign(this.equipment[equipmentIndex], updates);
  return this.save();
};

worksiteSchema.methods.removeEquipment = function(equipmentId: string) {
  this.equipment = this.equipment.filter((eq: any) => eq.id !== equipmentId);
  return this.save();
};

export const Worksite = mongoose.model<IWorksite>('Worksite', worksiteSchema);