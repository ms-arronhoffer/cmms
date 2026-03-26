import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import Equipment from '../models/Equipment.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import ReportRecipient from '../models/ReportRecipient.js';
import { generateHTMLReport, generateCSVReport } from '../utils/reportGenerator.js';
import { sendEmailReport } from '../utils/mailer.js';

const router = express.Router();

function parseDateInput(value, endOfDay = false) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

/**
 * GET /api/reports/upcoming
 * Get upcoming maintenance for the next 30 days
 * Auth required
 */
router.get('/upcoming', protect, async (req, res, next) => {
  try {
    const { fromDate, toDate, includePastDue } = req.query;
    const includePastDueFlag = includePastDue === 'true' || includePastDue === true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultToDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    defaultToDate.setHours(23, 59, 59, 999);

    const parsedFromDate = parseDateInput(fromDate, false);
    const parsedToDate = parseDateInput(toDate, true);

    if (fromDate && !parsedFromDate) {
      return res.status(400).json({ message: 'Invalid fromDate. Expected YYYY-MM-DD.' });
    }

    if (toDate && !parsedToDate) {
      return res.status(400).json({ message: 'Invalid toDate. Expected YYYY-MM-DD.' });
    }

    const effectiveToDate = parsedToDate || defaultToDate;
    const effectiveFromDate = includePastDueFlag ? null : parsedFromDate || today;

    const nextDueDateQuery = { $lte: effectiveToDate };
    if (effectiveFromDate) {
      nextDueDateQuery.$gte = effectiveFromDate;
    }

    const schedules = await MaintenanceSchedule.find({
      nextDueDate: nextDueDateQuery,
    })
      .populate('equipmentId', 'assetId assetName physicalLocation')
      .populate('maintenanceTaskId', 'taskDescription frequencyInterval priorityLevel')
      .sort({ nextDueDate: 1 });

    res.json({
      generatedDate: new Date().toISOString(),
      fromDate: effectiveFromDate ? effectiveFromDate.toISOString() : null,
      toDate: effectiveToDate.toISOString(),
      includePastDue: includePastDueFlag,
      scheduleCount: schedules.length,
      schedules,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/generate
 * Generate a report in HTML or CSV format
 * Body: { format: 'html' | 'csv', includePastDue: boolean }
 * Auth required
 */
router.post('/generate', protect, async (req, res, next) => {
  try {
    const { format = 'html', includePastDue = true, fromDate, toDate } = req.body;

    if (!['html', 'csv'].includes(format)) {
      return res.status(400).json({ message: 'Format must be html or csv' });
    }

    const parsedFromDate = parseDateInput(fromDate, false);
    const parsedToDate = parseDateInput(toDate, true);

    if (fromDate && !parsedFromDate) {
      return res.status(400).json({ message: 'Invalid fromDate. Expected YYYY-MM-DD.' });
    }

    if (toDate && !parsedToDate) {
      return res.status(400).json({ message: 'Invalid toDate. Expected YYYY-MM-DD.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultToDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    defaultToDate.setHours(23, 59, 59, 999);

    const effectiveToDate = parsedToDate || defaultToDate;
    const effectiveFromDate = includePastDue ? null : parsedFromDate || today;

    const query = {
      nextDueDate: { $lte: effectiveToDate },
    };

    if (effectiveFromDate) {
      query.nextDueDate.$gte = effectiveFromDate;
    }

    const schedules = await MaintenanceSchedule.find(query)
      .populate('equipmentId', 'assetId assetName physicalLocation serviceProviderName')
      .populate('maintenanceTaskId', 'taskDescription frequencyInterval priorityLevel')
      .sort({ nextDueDate: 1 });

    const reportData = {
      generatedDate: new Date(),
      generatedBy: req.user.userId,
      fromDate: effectiveFromDate,
      toDate: effectiveToDate,
      scheduleCount: schedules.length,
      overdueCount: schedules.filter((s) => s.status === 'Overdue').length,
      schedules,
    };

    let reportContent;
    let contentType;
    let filename;

    if (format === 'html') {
      reportContent = generateHTMLReport(reportData);
      contentType = 'text/html';
      filename = `maintenance-report-${today.toISOString().split('T')[0]}.html`;
    } else {
      reportContent = generateCSVReport(reportData);
      contentType = 'text/csv';
      filename = `maintenance-report-${today.toISOString().split('T')[0]}.csv`;
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(reportContent);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/send
 * Send report to recipients via email
 * Body: { recipientIds?: string[], includeAllRecipients: boolean }
 * Admin or Manager only
 */
router.post('/send', protect, authorize('Admin', 'Manager'), async (req, res, next) => {
  try {
    const { recipientIds = [], includeAllRecipients = true } = req.body;

    let recipients;
    if (includeAllRecipients) {
      recipients = await ReportRecipient.find({ isActive: true });
    } else if (recipientIds.length > 0) {
      recipients = await ReportRecipient.find({ _id: { $in: recipientIds }, isActive: true });
    } else {
      return res.status(400).json({ message: 'No recipients specified' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No active recipients found' });
    }

    // Generate report data
    const today = new Date();
    const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const schedules = await MaintenanceSchedule.find({
      nextDueDate: { $lte: thirtyDaysOut },
    })
      .populate('equipmentId', 'assetId assetName physicalLocation serviceProviderName')
      .populate('maintenanceTaskId', 'taskDescription frequencyInterval priorityLevel')
      .sort({ nextDueDate: 1 });

    const reportData = {
      generatedDate: new Date(),
      generatedBy: req.user.userId,
      reportPeriodDays: 30,
      scheduleCount: schedules.length,
      overdueCount: schedules.filter((s) => s.status === 'Overdue').length,
      schedules,
    };

    // Generate HTML report
    const htmlContent = generateHTMLReport(reportData);

    // Send to each recipient
    const results = [];
    for (const recipient of recipients) {
      try {
        await sendEmailReport(recipient.email, htmlContent, reportData);
        results.push({ email: recipient.email, status: 'sent' });
      } catch (err) {
        results.push({ email: recipient.email, status: 'failed', error: err.message });
      }
    }

    const successCount = results.filter((r) => r.status === 'sent').length;

    res.json({
      message: `Report sent to ${successCount} of ${recipients.length} recipients`,
      totalRecipients: recipients.length,
      successCount,
      results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
