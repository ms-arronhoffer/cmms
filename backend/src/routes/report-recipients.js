import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import ReportRecipient from '../models/ReportRecipient.js';
import { reportRecipientSchema } from '../utils/validators.js';

const router = express.Router();

/**
 * GET /api/report-recipients
 * List all active report recipients
 * Admin only
 */
router.get('/', protect, authorize('Admin'), async (req, res, next) => {
  try {
    const recipients = await ReportRecipient.find({ isActive: true })
      .select('_id email name createdAt')
      .sort({ createdAt: -1 });

    res.json(recipients);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/report-recipients/:id
 * Get a single recipient
 * Admin only
 */
router.get('/:id', protect, authorize('Admin'), async (req, res, next) => {
  try {
    const recipient = await ReportRecipient.findById(req.params.id);

    if (!recipient) {
      return res.status(404).json({ message: 'Report recipient not found' });
    }

    res.json(recipient);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/report-recipients
 * Create a new report recipient
 * Admin only
 */
router.post('/', protect, authorize('Admin'), async (req, res, next) => {
  try {
    const { error, value } = reportRecipientSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if email already exists
    const existing = await ReportRecipient.findOne({ email: value.email });
    if (existing) {
      return res.status(409).json({ message: 'This email is already in the recipient list' });
    }

    const recipient = new ReportRecipient({
      email: value.email,
      name: value.name || value.email.split('@')[0],
      createdBy: req.user.userId,
      isActive: true,
    });

    await recipient.save();
    res.status(201).json(recipient);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/report-recipients/:id
 * Update a report recipient
 * Admin only
 */
router.put('/:id', protect, authorize('Admin'), async (req, res, next) => {
  try {
    const { error, value } = reportRecipientSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const recipient = await ReportRecipient.findById(req.params.id);

    if (!recipient) {
      return res.status(404).json({ message: 'Report recipient not found' });
    }

    // Check if new email already exists (but not for same recipient)
    if (value.email !== recipient.email) {
      const existing = await ReportRecipient.findOne({ email: value.email });
      if (existing) {
        return res.status(409).json({ message: 'This email is already in the recipient list' });
      }
    }

    recipient.email = value.email;
    recipient.name = value.name || value.email.split('@')[0];

    await recipient.save();
    res.json(recipient);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/report-recipients/:id
 * Soft delete a report recipient (mark inactive)
 * Admin only
 */
router.delete('/:id', protect, authorize('Admin'), async (req, res, next) => {
  try {
    const recipient = await ReportRecipient.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!recipient) {
      return res.status(404).json({ message: 'Report recipient not found' });
    }

    res.json({ message: 'Recipient removed', recipient });
  } catch (err) {
    next(err);
  }
});

export default router;
