import express from 'express';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { maintenanceScheduleSchema, validate } from '../utils/validators.js';
import { generateFutureOccurrences } from '../services/recurringSchedule.js';

const router = express.Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const schedules = await MaintenanceSchedule.find(filter)
      .populate('equipmentId')
      .populate('maintenanceTaskId')
      .sort({ nextDueDate: 1 });

    res.json(schedules);
  }),
);

router.get(
  '/due-soon',
  protect,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(now.getDate() + 30);

    const schedules = await MaintenanceSchedule.find({
      nextDueDate: { $gte: now, $lte: nextMonth },
      status: { $in: ['Upcoming', 'In-Progress'] },
    })
      .populate('equipmentId')
      .populate('maintenanceTaskId')
      .sort({ nextDueDate: 1 });

    res.json(schedules);
  }),
);

router.get(
  '/overdue',
  protect,
  asyncHandler(async (req, res) => {
    const schedules = await MaintenanceSchedule.find({
      nextDueDate: { $lt: new Date() },
      status: { $ne: 'Completed' },
    })
      .populate('equipmentId')
      .populate('maintenanceTaskId')
      .sort({ nextDueDate: 1 });

    res.json(schedules);
  }),
);

router.post(
  '/',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const payload = validate(maintenanceScheduleSchema, req.body);

    const isRecurring = payload.recurrenceType && payload.recurrenceType !== 'None';

    const schedule = await MaintenanceSchedule.create({
      ...payload,
      isRecurringRoot: isRecurring,
      recurrenceStartDate: isRecurring ? (payload.recurrenceStartDate || payload.nextDueDate) : undefined,
      parentScheduleId: null,
      occurrenceIndex: 0,
    });

    // Immediately generate future occurrences up to 14-month horizon
    if (isRecurring) {
      await generateFutureOccurrences(schedule);
    }

    const populated = await schedule.populate(['equipmentId', 'maintenanceTaskId']);
    res.status(201).json(populated);
  }),
);

router.put(
  '/:id',
  protect,
  authorize('Admin', 'Manager', 'Technician'),
  asyncHandler(async (req, res) => {
    const payload = validate(maintenanceScheduleSchema, req.body);

    const existing = await MaintenanceSchedule.findById(req.params.id);
    if (!existing) {
      const error = new Error('Maintenance schedule not found');
      error.status = 404;
      throw error;
    }

    const recurrenceChanged =
      payload.recurrenceType !== existing.recurrenceType ||
      String(payload.nextDueDate) !== String(existing.nextDueDate);

    const isRecurring = payload.recurrenceType && payload.recurrenceType !== 'None';

    // If this is a root and recurrence settings changed, delete all future children
    // and regenerate from the new settings
    if (existing.isRecurringRoot && recurrenceChanged) {
      await MaintenanceSchedule.deleteMany({
        parentScheduleId: existing._id,
        status: { $in: ['Upcoming', 'Overdue'] },
      });
    }

    const schedule = await MaintenanceSchedule.findByIdAndUpdate(
      req.params.id,
      {
        ...payload,
        isRecurringRoot: isRecurring,
        recurrenceStartDate: isRecurring ? (payload.recurrenceStartDate || payload.nextDueDate) : undefined,
      },
      { new: true, runValidators: true },
    )
      .populate('equipmentId')
      .populate('maintenanceTaskId');

    // Regenerate future occurrences if recurrence is set
    if (isRecurring && (existing.isRecurringRoot || recurrenceChanged)) {
      await generateFutureOccurrences(schedule);
    }

    res.json(schedule);
  }),
);

// Delete a single occurrence (non-root) or a full series (root)
router.delete(
  '/:id',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const schedule = await MaintenanceSchedule.findById(req.params.id);
    if (!schedule) {
      const error = new Error('Maintenance schedule not found');
      error.status = 404;
      throw error;
    }

    if (schedule.isRecurringRoot) {
      // Delete entire series
      await MaintenanceSchedule.deleteMany({ parentScheduleId: schedule._id });
      await schedule.deleteOne();
      return res.json({ message: 'Recurring series and all occurrences deleted' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Schedule deleted' });
  }),
);

// Delete all future (upcoming) occurrences in a series but keep the root
router.delete(
  '/:id/future',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const root = await MaintenanceSchedule.findOne({
      $or: [{ _id: req.params.id }, { parentScheduleId: req.params.id }],
      isRecurringRoot: true,
    });

    const rootId = root?._id || req.params.id;
    const result = await MaintenanceSchedule.deleteMany({
      parentScheduleId: rootId,
      status: { $in: ['Upcoming', 'Overdue'] },
    });

    res.json({ message: `Deleted ${result.deletedCount} future occurrences` });
  }),
);

export default router;
