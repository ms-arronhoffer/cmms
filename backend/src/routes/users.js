import express from 'express';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { userSchema } from '../utils/validators.js';

const router = express.Router();

/**
 * GET /api/users
 * List all users
 * Admin only
 */
router.get(
  '/',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json(users);
  })
);

/**
 * GET /api/users/:id
 * Get a single user by ID
 * Admin only, or self
 */
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    // Users can view their own profile, admins can view anyone
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'Admin') {
      const error = new Error('Not authorized to view this user');
      error.status = 403;
      throw error;
    }

    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    res.json(user);
  })
);

/**
 * POST /api/users
 * Create a new user
 * Admin only
 */
router.post(
  '/',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      const err = new Error(error.details[0].message);
      err.status = 400;
      throw err;
    }

    const existingUser = await User.findOne({
      username: value.username.toLowerCase(),
    });

    if (existingUser) {
      const err = new Error('Username already exists');
      err.status = 409;
      throw err;
    }

    const existingEmail = await User.findOne({
      email: value.email.toLowerCase(),
    });

    if (existingEmail) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }

    const passwordHash = await hashPassword(value.password);

    const user = await User.create({
      username: value.username.toLowerCase(),
      passwordHash,
      email: value.email.toLowerCase(),
      role: value.role || 'Technician',
      isActive: true,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  })
);

/**
 * PUT /api/users/:id
 * Update a user
 * Admin only
 */
router.put(
  '/:id',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // Allow updates to: email, role, isActive
    if (req.body.email) {
      const emailLower = req.body.email.toLowerCase();
      const existingEmail = await User.findOne({
        email: emailLower,
        _id: { $ne: req.params.id },
      });

      if (existingEmail) {
        const err = new Error('Email already in use');
        err.status = 409;
        throw err;
      }

      user.email = emailLower;
    }

    if (req.body.role) {
      const validRoles = ['Admin', 'Manager', 'Technician'];
      if (!validRoles.includes(req.body.role)) {
        const err = new Error('Invalid role');
        err.status = 400;
        throw err;
      }
      user.role = req.body.role;
    }

    if (typeof req.body.isActive === 'boolean') {
      user.isActive = req.body.isActive;
    }

    // Allow password reset only if provided
    if (req.body.password) {
      if (req.body.password.length < 8) {
        const err = new Error('Password must be at least 8 characters');
        err.status = 400;
        throw err;
      }
      user.passwordHash = await hashPassword(req.body.password);
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  })
);

/**
 * DELETE /api/users/:id
 * Soft delete a user (mark inactive)
 * Admin only
 */
router.delete(
  '/:id',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    res.json({
      message: 'User has been deactivated',
      user,
    });
  })
);

/**
 * PUT /api/users/:id/reset-password
 * Admin reset user password (generates temporary password)
 * Admin only
 */
router.put(
  '/:id/reset-password',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12).toUpperCase();
    user.passwordHash = await hashPassword(tempPassword);

    await user.save();

    res.json({
      message: 'Password reset. User should change password on next login.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        temporaryPassword: tempPassword,
      },
    });
  })
);

export default router;
