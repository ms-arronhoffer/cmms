import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmms';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    logger.info('✓ MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    return mongoose.connection;
  } catch (err) {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    throw err;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (err) {
    logger.error('Error disconnecting MongoDB:', err.message);
  }
}
