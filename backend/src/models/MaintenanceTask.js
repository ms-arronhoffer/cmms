import mongoose from 'mongoose';

const maintenanceTaskSchema = new mongoose.Schema(
  {
    maintenanceType: {
      type: String,
      enum: ['Preventative', 'Corrective', 'Predictive'],
      required: true,
      index: true,
    },
    frequencyInterval: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'],
      required: true,
      index: true,
    },
    taskDescription: {
      type: String,
      required: true,
      trim: true,
    },
    standardOperatingProcedureLink: {
      type: String,
      trim: true,
    },
    priorityLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      index: true,
    },
    estimatedDowntimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

maintenanceTaskSchema.index({ maintenanceType: 1, frequencyInterval: 1 });

const MaintenanceTask = mongoose.model('MaintenanceTask', maintenanceTaskSchema);

export default MaintenanceTask;
