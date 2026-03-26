import express from 'express';
import Equipment from '../models/Equipment.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { equipmentSchema, validate } from '../utils/validators.js';

const router = express.Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = { isArchived: false };

    if (req.query.location) {
      filter.physicalLocation = req.query.location;
    }

    const equipment = await Equipment.find(filter).sort({ assetName: 1 });
    res.json(equipment);
  }),
);

router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment || equipment.isArchived) {
      const error = new Error('Equipment not found');
      error.status = 404;
      throw error;
    }

    res.json(equipment);
  }),
);

router.post(
  '/',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const payload = validate(equipmentSchema, req.body);
    const equipment = await Equipment.create(payload);
    res.status(201).json(equipment);
  }),
);

router.put(
  '/:id',
  protect,
  authorize('Admin', 'Manager'),
  asyncHandler(async (req, res) => {
    const payload = validate(equipmentSchema, req.body);
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!equipment) {
      const error = new Error('Equipment not found');
      error.status = 404;
      throw error;
    }

    res.json(equipment);
  }),
);

router.delete(
  '/:id',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { isArchived: true },
      { new: true },
    );

    if (!equipment) {
      const error = new Error('Equipment not found');
      error.status = 404;
      throw error;
    }

    res.status(204).send();
  }),
);

export default router;
