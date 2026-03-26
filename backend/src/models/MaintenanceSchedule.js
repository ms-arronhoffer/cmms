import mongoose from 'mongoose';

const maintenanceScheduleSchema = new mongoose.Schema(
  {
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
      index: true,
    },
    maintenanceTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceTask',
      required: true,
      index: true,
    },
    lastServiceDate: {
      type: Date,
    },
    nextDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Upcoming', 'In-Progress', 'Completed', 'Overdue'],
      default: 'Upcoming',
      index: true,
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
    assignedTo: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

maintenanceScheduleSchema.index({ nextDueDate: 1, status: 1 });
maintenanceScheduleSchema.index({ equipmentId: 1, status: 1 });

const MaintenanceSchedule = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);

export default MaintenanceSchedule;
