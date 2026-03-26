import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database.js';
import Equipment from '../models/Equipment.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import ReportRecipient from '../models/ReportRecipient.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/auth.js';

dotenv.config();

async function seed() {
  await connectDB();

  await Promise.all([
    Equipment.deleteMany({}),
    MaintenanceTask.deleteMany({}),
    MaintenanceSchedule.deleteMany({}),
    ReportRecipient.deleteMany({}),
    User.deleteMany({}),
  ]);

  const adminPassword = await hashPassword('Admin123!');
  const admin = await User.create({
    username: 'admin',
    passwordHash: adminPassword,
    displayName: 'System Administrator',
    email: 'admin@cmms.local',
    role: 'Admin',
  });

  const managerPassword = await hashPassword('Manager123!');
  await User.create({
    username: 'manager',
    passwordHash: managerPassword,
    displayName: 'Property Manager',
    email: 'manager@cmms.local',
    role: 'Manager',
  });

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

  await MaintenanceSchedule.insertMany([
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

  await ReportRecipient.insertMany([
    {
      email: 'ops@cmms.local',
      name: 'Operations Distribution',
      createdBy: admin._id,
    },
    {
      email: 'facilities@cmms.local',
      name: 'Facilities Distribution',
      createdBy: admin._id,
    },
  ]);

  console.log('Seed completed successfully');
  console.log('Admin login: admin / Admin123!');
  console.log('Manager login: manager / Manager123!');

  await disconnectDB();
}

seed()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Seed failed', error);
    await disconnectDB();
    process.exit(1);
  });
