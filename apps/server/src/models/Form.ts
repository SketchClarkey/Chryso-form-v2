import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDispenserSystem {
  tankNumber: string;
  chemicalProduct: string;
  tankSize: number;
  equipmentCondition: 'excellent' | 'good' | 'fair' | 'poor';
  pumpModel?: string;
  pumpCondition: 'excellent' | 'good' | 'fair' | 'poor';
  pulseMeterType?: string;
  pulseMeterCondition: 'excellent' | 'good' | 'fair' | 'poor';
  dispenserType?: string;
  dispenserCondition: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ICalibrationData {
  productName: string;
  doseRate: number;
  cementContent: number;
  batchTotal: number;
  actualMeasurement: number;
  resultPercentage: number;
  graduatedMeasureId: string;
}

export interface IServiceChecklist {
  workAreaCleaned: boolean;
  siteTablesReplaced: boolean;
  systemCheckedForLeaks: boolean;
  pulseMetersLabeled: boolean;
  pumpsLabeled: boolean;
  tanksLabeled: boolean;
  dispensersLabeled: boolean;
  calibrationPointsReturned: boolean;
}

export interface ISignature {
  dataUrl: string;
  timestamp: Date;
  signedBy: string;
  ipAddress?: string;
}

export interface IForm extends Document {
  _id: Types.ObjectId;
  formId: string;
  worksite: Types.ObjectId;
  technician: Types.ObjectId;
  status: 'draft' | 'in-progress' | 'completed' | 'approved' | 'rejected' | 'archived';
  
  // Customer Information
  customerInfo: {
    customerName: string;
    plantLocation: string;
    contactPhone?: string;
    contactFax?: string;
    contactPerson?: string;
    workOrderNumber?: string;
    shippingInfo?: string;
  };

  // Current Dispenser Systems
  dispenserSystems: IDispenserSystem[];

  // Service Type
  serviceType: {
    service: boolean;
    breakdown: boolean;
    calibration: boolean;
    installation: boolean;
    jobComplete: boolean;
  };

  // Maintenance and Breakdown Details
  maintenanceDetails: {
    gcpTechnicianHours?: number;
    contractHours?: number;
    partsUsed: Array<{
      partNumber: string;
      description: string;
      quantity: number;
      replaced: boolean;
    }>;
    maintenanceProcedures: string;
    breakdownDetails?: string;
  };

  // Calibration Data
  calibrationData: ICalibrationData[];

  // Service Checklist
  serviceChecklist: IServiceChecklist;

  // Additional Information
  additionalInfo: {
    notes?: string;
    attachments: Array<{
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      uploadedAt: Date;
    }>;
  };

  // Digital Signatures
  signatures: {
    customer?: ISignature;
    servicePerson?: ISignature;
  };

  // Form Metadata
  metadata: {
    createdBy: Types.ObjectId;
    lastModifiedBy?: Types.ObjectId;
    templateUsed?: Types.ObjectId;
    version: number;
    syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
    offlineCreated: boolean;
    autoSaveEnabled: boolean;
    lastAutoSave?: Date;
  };

  // Timestamps and Status
  submittedAt?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  completionPercentage: number;

  // Methods
  generateFormId(): string;
  canBeEditedBy(userId: string, userRole: string): boolean;
  getStatusHistory(): Array<{ status: string; timestamp: Date; userId?: Types.ObjectId }>;
}

const dispenserSystemSchema = new Schema<IDispenserSystem>({
  tankNumber: {
    type: String,
    required: [true, 'Tank number is required'],
    trim: true,
  },
  chemicalProduct: {
    type: String,
    required: [true, 'Chemical product is required'],
    trim: true,
  },
  tankSize: {
    type: Number,
    required: [true, 'Tank size is required'],
    min: [0, 'Tank size must be positive'],
  },
  equipmentCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true,
  },
  pumpModel: {
    type: String,
    trim: true,
  },
  pumpCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true,
  },
  pulseMeterType: {
    type: String,
    trim: true,
  },
  pulseMeterCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true,
  },
  dispenserType: {
    type: String,
    trim: true,
  },
  dispenserCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true,
  },
}, { _id: false });

const calibrationDataSchema = new Schema<ICalibrationData>({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  doseRate: {
    type: Number,
    required: [true, 'Dose rate is required'],
    min: [0, 'Dose rate must be positive'],
  },
  cementContent: {
    type: Number,
    required: [true, 'Cement content is required'],
    min: [0, 'Cement content must be positive'],
  },
  batchTotal: {
    type: Number,
    required: [true, 'Batch total is required'],
    min: [0, 'Batch total must be positive'],
  },
  actualMeasurement: {
    type: Number,
    required: [true, 'Actual measurement is required'],
    min: [0, 'Actual measurement must be positive'],
  },
  resultPercentage: {
    type: Number,
    required: [true, 'Result percentage is required'],
  },
  graduatedMeasureId: {
    type: String,
    required: [true, 'Graduated measure ID is required'],
    trim: true,
  },
}, { _id: false });

const serviceChecklistSchema = new Schema<IServiceChecklist>({
  workAreaCleaned: { type: Boolean, default: false },
  siteTablesReplaced: { type: Boolean, default: false },
  systemCheckedForLeaks: { type: Boolean, default: false },
  pulseMetersLabeled: { type: Boolean, default: false },
  pumpsLabeled: { type: Boolean, default: false },
  tanksLabeled: { type: Boolean, default: false },
  dispensersLabeled: { type: Boolean, default: false },
  calibrationPointsReturned: { type: Boolean, default: false },
}, { _id: false });

const signatureSchema = new Schema<ISignature>({
  dataUrl: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  signedBy: {
    type: String,
    required: true,
    trim: true,
  },
  ipAddress: {
    type: String,
  },
}, { _id: false });

const formSchema = new Schema<IForm>({
  formId: {
    type: String,
    unique: true,
    sparse: true,
  },
  worksite: {
    type: Schema.Types.ObjectId,
    ref: 'Worksite',
    required: [true, 'Worksite is required'],
  },
  technician: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Technician is required'],
  },
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed', 'approved', 'rejected', 'archived'],
    default: 'draft',
  },

  // Customer Information
  customerInfo: {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    plantLocation: {
      type: String,
      required: [true, 'Plant location is required'],
      trim: true,
    },
    contactPhone: String,
    contactFax: String,
    contactPerson: String,
    workOrderNumber: String,
    shippingInfo: String,
  },

  // Current Dispenser Systems
  dispenserSystems: [dispenserSystemSchema],

  // Service Type
  serviceType: {
    service: { type: Boolean, default: false },
    breakdown: { type: Boolean, default: false },
    calibration: { type: Boolean, default: false },
    installation: { type: Boolean, default: false },
    jobComplete: { type: Boolean, default: false },
  },

  // Maintenance and Breakdown Details
  maintenanceDetails: {
    gcpTechnicianHours: Number,
    contractHours: Number,
    partsUsed: [{
      partNumber: { type: String, required: true },
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0 },
      replaced: { type: Boolean, default: false },
    }],
    maintenanceProcedures: {
      type: String,
      maxlength: [2000, 'Maintenance procedures cannot exceed 2000 characters'],
    },
    breakdownDetails: {
      type: String,
      maxlength: [2000, 'Breakdown details cannot exceed 2000 characters'],
    },
  },

  // Calibration Data
  calibrationData: [calibrationDataSchema],

  // Service Checklist
  serviceChecklist: {
    type: serviceChecklistSchema,
    default: () => ({}),
  },

  // Additional Information
  additionalInfo: {
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    attachments: [{
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
  },

  // Digital Signatures
  signatures: {
    customer: signatureSchema,
    servicePerson: signatureSchema,
  },

  // Form Metadata
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
    templateUsed: {
      type: Schema.Types.ObjectId,
      ref: 'Template',
    },
    version: {
      type: Number,
      default: 1,
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'conflict', 'error'],
      default: 'synced',
    },
    offlineCreated: {
      type: Boolean,
      default: false,
    },
    autoSaveEnabled: {
      type: Boolean,
      default: true,
    },
    lastAutoSave: Date,
  },

  // Status timestamps
  submittedAt: Date,
  completedAt: Date,
  approvedAt: Date,
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: Date,
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectionReason: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes for performance
// formId index is created by unique: true
formSchema.index({ worksite: 1, status: 1 });
formSchema.index({ technician: 1, status: 1 });
formSchema.index({ createdAt: -1 });
formSchema.index({ 'customerInfo.customerName': 'text' });
formSchema.index({ 'metadata.syncStatus': 1 });

// Virtual for form completion percentage
formSchema.virtual('completionPercentage').get(function() {
  let completed = 0;
  let total = 0;

  // Customer info (required fields)
  total += 2;
  if (this.customerInfo?.customerName) completed++;
  if (this.customerInfo?.plantLocation) completed++;

  // Service type (at least one must be selected)
  total += 1;
  if (Object.values(this.serviceType || {}).some(Boolean)) completed++;

  // Dispenser systems (at least one)
  total += 1;
  if (this.dispenserSystems && this.dispenserSystems.length > 0) completed++;

  // Service checklist completion
  total += 1;
  const checklistItems = Object.values(this.serviceChecklist || {});
  if (checklistItems.length > 0 && checklistItems.every(Boolean)) completed++;

  return Math.round((completed / total) * 100);
});

// Pre-save middleware to generate formId
formSchema.pre('save', function(next) {
  if (!this.formId) {
    this.formId = this.generateFormId();
  }
  next();
});

// Methods
formSchema.methods.generateFormId = function(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  
  return `GCP-${year}${month}${day}-${random}`;
};

formSchema.methods.canBeEditedBy = function(userId: string, userRole: string): boolean {
  if (userRole === 'admin') return true;
  if (this.status === 'approved' || this.status === 'archived') return false;
  if (userRole === 'manager') return true;
  if (userRole === 'technician' && this.technician.toString() === userId) return true;
  return false;
};

formSchema.methods.getStatusHistory = function() {
  const history: Array<{ status: string; timestamp: Date; userId?: Types.ObjectId }> = [
    { status: 'draft', timestamp: this.createdAt, userId: this.metadata.createdBy }
  ];

  if (this.submittedAt) {
    history.push({ status: 'completed', timestamp: this.submittedAt, userId: this.technician });
  }

  if (this.approvedAt && this.approvedBy) {
    history.push({ status: 'approved', timestamp: this.approvedAt, userId: this.approvedBy });
  }

  if (this.rejectedAt && this.rejectedBy) {
    history.push({ status: 'rejected', timestamp: this.rejectedAt, userId: this.rejectedBy });
  }

  return history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const Form = mongoose.model<IForm>('Form', formSchema);