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
    // Recurrence configuration
    recurrenceType: {
      type: String,
      enum: ['None', 'Monthly', 'Quarterly', 'Yearly'],
      default: 'None',
      index: true,
    },
    recurrenceStartDate: {
      type: Date, // The anchor date that defines the recurrence pattern
    },
    // Link recurring occurrences back to the root schedule
    parentScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceSchedule',
      default: null,
      index: true,
    },
    isRecurringRoot: {
      type: Boolean,
      default: false,
      index: true,
    },
    occurrenceIndex: {
      type: Number, // 0 = root, 1 = first child, 2 = second child, etc.
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

maintenanceScheduleSchema.index({ nextDueDate: 1, status: 1 });
maintenanceScheduleSchema.index({ equipmentId: 1, status: 1 });
maintenanceScheduleSchema.index({ parentScheduleId: 1, nextDueDate: 1 });
maintenanceScheduleSchema.index({ isRecurringRoot: 1, recurrenceType: 1 });

const MaintenanceSchedule = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);

export default MaintenanceSchedule;
