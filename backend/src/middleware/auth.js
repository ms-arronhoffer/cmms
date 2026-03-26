import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from './errorHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.session?.token;

  if (!token) {
    const error = new Error('Not authorized');
    error.status = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-prod');
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user || !user.isActive) {
      const error = new Error('User not found or inactive');
      error.status = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch {
    const error = new Error('Invalid token');
    error.status = 401;
    throw error;
  }
});
