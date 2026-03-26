import cron from 'node-cron';
import logger from './logger.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import ReportRecipient from '../models/ReportRecipient.js';
import { generateHTMLReport } from './reportGenerator.js';
import { sendEmailReport } from './mailer.js';
import { generateAllFutureOccurrences } from '../services/recurringSchedule.js';

/**
 * Initialize scheduled report jobs
 * Runs weekly on Monday at 9:00 AM
 */
export function initializeScheduledReports() {
  // Run every Monday at 9:00 AM (0 9 * * 1)
  const cronJob = cron.schedule('0 9 * * 1', async () => {
    logger.info('Starting scheduled maintenance report job...');

    try {
      // Fetch upcoming maintenance
      const today = new Date();
      const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const schedules = await MaintenanceSchedule.find({
        status: { $in: ['Upcoming', 'Overdue'] },
        nextDueDate: { $lte: thirtyDaysOut },
      })
        .populate('equipmentId', 'assetId assetName physicalLocation serviceProviderName')
        .populate('maintenanceTaskId', 'taskDescription frequencyInterval priorityLevel')
        .sort({ nextDueDate: 1 });

      // Fetch active recipients
      const recipients = await ReportRecipient.find({ isActive: true }).select('email name');

      if (recipients.length === 0) {
        logger.warn('No active recipients configured. Skipping report send.');
        return;
      }

      // Generate report data
      const reportData = {
        generatedDate: new Date(),
        generatedBy: 'system-scheduler',
        reportPeriodDays: 30,
        scheduleCount: schedules.length,
        overdueCount: schedules.filter((s) => s.status === 'Overdue').length,
        schedules,
      };

      // Generate HTML report
      const htmlContent = generateHTMLReport(reportData);

      // Send to each recipient
      let successCount = 0;
      let failureCount = 0;

      for (const recipient of recipients) {
        try {
          await sendEmailReport(recipient.email, htmlContent, reportData);
          successCount++;
        } catch (err) {
          logger.error(`Failed to send report to ${recipient.email}: ${err.message}`);
          failureCount++;
        }
      }

      logger.info(
        `Scheduled report job completed. Sent to ${successCount} recipients, ${failureCount} failures.`
      );
    } catch (err) {
      logger.error(`Scheduled report job failed: ${err.message}`);
    }
  });

  logger.info('Scheduled maintenance report job initialized (runs weekly on Monday at 9:00 AM)');

  return cronJob;
}

/**
 * Initialize overdue alert job
 * Runs daily at 8:00 AM to check for overdue maintenance
 * (Optional: can be extended to send alerts to managers)
 */
export function initializeOverdueAlerts() {
  const cronJob = cron.schedule('0 8 * * *', async () => {
    logger.info('Starting overdue maintenance alert check...');

    try {
      const overdueSchedules = await MaintenanceSchedule.find({
        status: 'Overdue',
        nextDueDate: { $lt: new Date() },
      })
        .populate('equipmentId', 'assetId assetName')
        .populate('maintenanceTaskId', 'taskDescription');

      if (overdueSchedules.length > 0) {
        logger.warn(`Found ${overdueSchedules.length} overdue maintenance items`);
        // In future, send alerts to managers here
      } else {
        logger.info('No overdue maintenance items found');
      }
    } catch (err) {
      logger.error(`Overdue alert check failed: ${err.message}`);
    }
  });

  logger.info('Overdue maintenance alert job initialized (runs daily at 8:00 AM)');

  return cronJob;
}

/**
 * Initialize recurring schedule generation job
 * Runs daily at 6:00 AM — fills in all future occurrences up to 14 months ahead.
 */
export function initializeRecurringScheduleJob() {
  // Also run once immediately on startup so occurrences are ready right away
  generateAllFutureOccurrences().catch((err) =>
    logger.error(`[recurringSchedule] Startup run failed: ${err.message}`)
  );

  const cronJob = cron.schedule('0 6 * * *', async () => {
    logger.info('[recurringSchedule] Daily generation job starting...');
    try {
      await generateAllFutureOccurrences();
    } catch (err) {
      logger.error(`[recurringSchedule] Daily generation job failed: ${err.message}`);
    }
  });

  logger.info('[recurringSchedule] Daily occurrence generation job initialized (runs at 6:00 AM)');
  return cronJob;
}

/**
 * Stop a scheduled job
 */
export function stopScheduledJob(cronJob) {
  if (cronJob) {
    cronJob.stop();
    logger.info('Scheduled job stopped');
  }
}
