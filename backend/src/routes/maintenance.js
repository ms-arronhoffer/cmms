import express from 'express';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { maintenanceScheduleSchema, validate } from '../utils/validators.js';

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
    const schedule = await MaintenanceSchedule.create(payload);
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
    const schedule = await MaintenanceSchedule.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .populate('equipmentId')
      .populate('maintenanceTaskId');

    if (!schedule) {
      const error = new Error('Maintenance schedule not found');
      error.status = 404;
      throw error;
    }

    res.json(schedule);
  }),
);

export default router;
