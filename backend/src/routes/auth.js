import express from 'express';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { comparePassword, generateToken, hashPassword } from '../utils/auth.js';
import { loginSchema, userSchema, validate } from '../utils/validators.js';

const router = express.Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = validate(loginSchema, req.body);
    const user = await User.findOne({ username: payload.username.toLowerCase() });

    if (!user || !(await comparePassword(payload.password, user.passwordHash))) {
      const error = new Error('Invalid username or password');
      error.status = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('User is inactive');
      error.status = 403;
      throw error;
    }

    const token = generateToken(user);
    req.session.token = token;

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    });
  }),
);

router.post(
  '/register',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const payload = validate(userSchema, req.body);
    const existingUser = await User.findOne({ username: payload.username.toLowerCase() });

    if (existingUser) {
      const error = new Error('Username already exists');
      error.status = 409;
      throw error;
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await User.create({
      username: payload.username.toLowerCase(),
      passwordHash,
      displayName: payload.displayName || payload.username,
      email: payload.email.toLowerCase(),
      role: payload.role,
    });

    res.status(201).json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    req.session.destroy(() => {
      res.status(204).send();
    });
  }),
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({
      id: req.user._id,
      username: req.user.username,
      displayName: req.user.displayName,
      email: req.user.email,
      role: req.user.role,
    });
  }),
);

export default router;
