import express from 'express';
import MaintenanceTask from '../models/MaintenanceTask.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { maintenanceTaskSchema, validate } from '../utils/validators.js';

const router = express.Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const tasks = await MaintenanceTask.find({ isActive: true }).sort({ taskDescription: 1 });
    res.json(tasks);
  }),
);

router.post(
  '/',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const payload = validate(maintenanceTaskSchema, req.body);
    const task = await MaintenanceTask.create(payload);
    res.status(201).json(task);
  }),
);

router.put(
  '/:id',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const payload = validate(maintenanceTaskSchema, req.body);
    const task = await MaintenanceTask.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      const error = new Error('Maintenance task not found');
      error.status = 404;
      throw error;
    }

    res.json(task);
  }),
);

export default router;
