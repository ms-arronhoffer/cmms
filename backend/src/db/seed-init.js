/**
 * Safe seed initialization script
 * Designed for use in Docker containers with proper error handling and logging
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import Equipment from '../models/Equipment.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import ReportRecipient from '../models/ReportRecipient.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/auth.js';

dotenv.config();

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmms';
  logger.info(`Attempting MongoDB connection to: ${mongoUri}`);
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      retryWrites: true,
    });
    logger.info('✓ MongoDB connected successfully');
    return true;
  } catch (err) {
    logger.error(`✗ Failed to connect to MongoDB: ${err.message}`);
    return false;
  }
}

async function seed() {
  try {
    const connected = await connectDB();
    if (!connected) {
      logger.error('Cannot proceed with seeding - database connection failed');
      process.exit(1);
    }

    logger.info('Starting database seed...');

    // Clear existing data
    logger.info('Clearing existing data...');
    await Promise.all([
      Equipment.deleteMany({}),
      MaintenanceTask.deleteMany({}),
      MaintenanceSchedule.deleteMany({}),
      ReportRecipient.deleteMany({}),
      User.deleteMany({}),
    ]);
    logger.info('✓ Data cleared');

    // Create users with explicit isActive flag
    logger.info('Creating users...');
    const adminPassword = await hashPassword('Admin123!');
    const admin = await User.create({
      username: 'admin',
      passwordHash: adminPassword,
      displayName: 'System Administrator',
      email: 'admin@cmms.local',
      role: 'Admin',
      isActive: true, // Explicitly set
    });
    logger.info(`✓ Admin user created: ${admin._id}`);

    const managerPassword = await hashPassword('Manager123!');
    const manager = await User.create({
      username: 'manager',
      passwordHash: managerPassword,
      displayName: 'Property Manager',
      email: 'manager@cmms.local',
      role: 'Manager',
      isActive: true, // Explicitly set
    });
    logger.info(`✓ Manager user created: ${manager._id}`);

    // Create equipment
    logger.info('Creating equipment...');
    const equipment = await Equipment.insertMany([
      {
        assetId: 'HVAC-001',
        assetName: 'Main Lobby HVAC Unit',
        modelNumber: 'RTU-5500',
        serialNumber: 'SN-10001',
        physicalLocation: 'Main Building - Roof',
        installationDate: new Date('2021-03-10'),
        internalOwner: 'Facilities Team',
        serviceProviderName: 'CoolAir Services',
        primaryContactPerson: 'Jane Contractor',
        contactPhone: '555-100-2000',
        contactEmail: 'jane@coolair.example',
        vendorAccountNumber: 'CA-9981',
        estimatedCost: 450,
      },
      {
        assetId: 'PUMP-014',
        assetName: 'Boiler Feed Pump',
        modelNumber: 'BFP-200',
        serialNumber: 'SN-20014',
        physicalLocation: 'Boiler Room',
        installationDate: new Date('2020-09-15'),
        internalOwner: 'Facilities Team',
        serviceProviderName: 'Metro Mechanical',
        primaryContactPerson: 'Luis Rivera',
        contactPhone: '555-222-3000',
        contactEmail: 'luis@metromech.example',
        estimatedCost: 220,
      },
    ]);
    logger.info(`✓ ${equipment.length} equipment created`);

    // Create tasks
    logger.info('Creating maintenance tasks...');
    const tasks = await MaintenanceTask.insertMany([
      {
        maintenanceType: 'Preventative',
        frequencyInterval: 'Monthly',
        taskDescription: 'Replace HVAC filters and inspect belts',
        priorityLevel: 'High',
        estimatedDowntimeHours: 2,
      },
      {
        maintenanceType: 'Preventative',
        frequencyInterval: 'Quarterly',
        taskDescription: 'Inspect boiler feed pump seals and lubrication',
        priorityLevel: 'Medium',
        estimatedDowntimeHours: 3,
      },
    ]);
    logger.info(`✓ ${tasks.length} tasks created`);

    // Create schedules
    logger.info('Creating maintenance schedules...');
    const schedules = await MaintenanceSchedule.insertMany([
      {
        equipmentId: equipment[0]._id,
        maintenanceTaskId: tasks[0]._id,
        lastServiceDate: new Date('2026-03-01'),
        nextDueDate: new Date('2026-04-01'),
        status: 'Upcoming',
        estimatedCost: 450,
        assignedTo: 'Maintenance Team A',
      },
      {
        equipmentId: equipment[1]._id,
        maintenanceTaskId: tasks[1]._id,
        lastServiceDate: new Date('2025-12-15'),
        nextDueDate: new Date('2026-03-20'),
        status: 'Overdue',
        estimatedCost: 220,
        assignedTo: 'Maintenance Team B',
      },
    ]);
    logger.info(`✓ ${schedules.length} schedules created`);

    // Create report recipients
    logger.info('Creating report recipients...');
    const recipients = await ReportRecipient.insertMany([
      {
        email: 'ops@cmms.local',
        name: 'Operations Distribution',
        createdBy: admin._id,
        isActive: true,
      },
      {
        email: 'facilities@cmms.local',
        name: 'Facilities Distribution',
        createdBy: admin._id,
        isActive: true,
      },
    ]);
    logger.info(`✓ ${recipients.length} recipients created`);

    // Success summary
    logger.info('═══════════════════════════════════════');
    logger.info('Seed completed successfully!');
    logger.info('═══════════════════════════════════════');
    logger.info('Admin login: admin / Admin123!');
    logger.info('Manager login: manager / Manager123!');
    logger.info('═══════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    logger.error(`Seed error: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
}

seed();
