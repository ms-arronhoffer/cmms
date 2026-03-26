import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    assetName: {
      type: String,
      required: true,
      trim: true,
    },
    modelNumber: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    physicalLocation: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    installationDate: {
      type: Date,
    },
    internalOwner: {
      type: String,
      trim: true,
    },
    serviceProviderName: {
      type: String,
      trim: true,
    },
    primaryContactPerson: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    vendorAccountNumber: {
      type: String,
      trim: true,
    },
    contractExpirationDate: {
      type: Date,
    },
    requiredPartsList: {
      type: [String],
      default: [],
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionNotes: {
      type: String,
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

equipmentSchema.index({ physicalLocation: 1, assetName: 1 });
equipmentSchema.index({ serviceProviderName: 1 });

const Equipment = mongoose.model('Equipment', equipmentSchema);

export default Equipment;
