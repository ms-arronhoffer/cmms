import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import { connectDB } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipment.js';
import maintenanceRoutes from './routes/maintenance.js';
import taskRoutes from './routes/tasks.js';
import reportRecipientsRoutes from './routes/report-recipients.js';
import reportsRoutes from './routes/reports.js';
import usersRoutes from './routes/users.js';
import logger from './utils/logger.js';
import { initializeScheduledReports, initializeOverdueAlerts, initializeRecurringScheduleJob } from './utils/scheduler.js';

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB
await connectDB();

// ===== MIDDLEWARE =====
// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/cmms'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// ===== ROUTES =====
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/report-recipients', reportRecipientsRoutes);
app.use('/api/reports', reportsRoutes);

// ===== ERROR HANDLING =====
app.use(notFound);
app.use(errorHandler);

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  // Initialize scheduled jobs
  initializeScheduledReports();
  initializeOverdueAlerts();
  initializeRecurringScheduleJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
