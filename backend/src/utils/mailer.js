import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Initialize Nodemailer transporter
 * Supports both SMTP and test mode
 */
function createTransporter() {
  // For development/testing, use Ethereal Email (free SMTP service)
  // In production, configure with your actual SMTP settings via environment variables
  const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASSWORD || '';
  const fromEmail = process.env.EMAIL_FROM || 'cmms-reports@example.com';

  if (!smtpUser || !smtpPass) {
    logger.warn(
      'Email environment variables not configured. Email sending will be simulated for development.'
    );
    // Return a mock transporter for development
    return {
      sendMail: async (mailOptions) => {
        logger.info(`[MOCK EMAIL] To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

const transporter = createTransporter();

/**
 * Send maintenance report via email
 * @param {string} recipientEmail - Recipient email address
 * @param {string} htmlContent - HTML report content
 * @param {object} reportData - Report metadata
 */
export async function sendEmailReport(recipientEmail, htmlContent, reportData) {
  try {
    const { scheduleCount, overdueCount } = reportData;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'CMMS Portal <cmms-reports@example.com>',
      to: recipientEmail,
      subject: `CMMS Maintenance Report - ${new Date().toLocaleDateString('en-US')}`,
      html: htmlContent,
      text: generatePlainTextReport(reportData),
      headers: {
        'X-Report-Type': 'maintenance',
        'X-Report-Date': new Date().toISOString(),
        'X-Scheduled-Items': scheduleCount.toString(),
        'X-Overdue-Items': overdueCount.toString(),
      },
    };

    const result = await transporter.sendMail(mailOptions);

    logger.info(`Email sent to ${recipientEmail} (Message ID: ${result.messageId})`);

    return result;
  } catch (err) {
    logger.error(`Failed to send email to ${recipientEmail}: ${err.message}`);
    throw err;
  }
}

/**
 * Generate plain text version of report for email fallback
 */
function generatePlainTextReport(reportData) {
  const { generatedDate, reportPeriodDays, scheduleCount, overdueCount, schedules } = reportData;

  let text = 'CMMS MAINTENANCE REPORT\n';
  text += '='.repeat(60) + '\n\n';
  text += `Generated: ${new Date(generatedDate).toLocaleDateString('en-US')}\n`;
  text += `Report Period: Next ${reportPeriodDays} days\n\n`;

  text += 'SUMMARY\n';
  text += '-'.repeat(60) + '\n';
  text += `Total Scheduled Maintenance:  ${scheduleCount}\n`;
  text += `Overdue Items:               ${overdueCount}\n`;
  text += `Upcoming Items:              ${scheduleCount - overdueCount}\n`;
  text += `On-Time Percentage:          ${((100 * (scheduleCount - overdueCount)) / scheduleCount).toFixed(1)}%\n\n`;

  text += 'MAINTENANCE SCHEDULE DETAILS\n';
  text += '-'.repeat(60) + '\n';

  schedules.forEach((schedule) => {
    text += `\nEquipment: ${schedule.equipmentId.assetName} (${schedule.equipmentId.assetId})\n`;
    text += `Location:  ${schedule.equipmentId.physicalLocation || 'N/A'}\n`;
    text += `Task:      ${schedule.maintenanceTaskId.taskDescription}\n`;
    text += `Frequency: ${schedule.maintenanceTaskId.frequencyInterval}\n`;
    text += `Priority:  ${schedule.maintenanceTaskId.priorityLevel}\n`;
    text += `Status:    ${schedule.status}\n`;
    text += `Due Date:  ${new Date(schedule.nextDueDate).toLocaleDateString('en-US')}\n`;
  });

  text += '\n' + '='.repeat(60) + '\n';
  text += "This is an automated report from the CMMS Portal.\n";
  text += 'For more details, please log in to the application.\n';

  return text;
}

/**
 * Test email configuration
 * Send a test email to verify SMTP settings
 */
export async function sendTestEmail(recipientEmail) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'CMMS Portal <cmms-reports@example.com>',
      to: recipientEmail,
      subject: 'CMMS Portal - Email Configuration Test',
      html: '<p>This is a test email from CMMS Portal. If you received this, email configuration is working correctly.</p>',
      text: 'This is a test email from CMMS Portal. If you received this, email configuration is working correctly.',
    };

    const result = await transporter.sendMail(mailOptions);

    logger.info(`Test email sent to ${recipientEmail} (Message ID: ${result.messageId})`);

    return result;
  } catch (err) {
    logger.error(`Failed to send test email to ${recipientEmail}: ${err.message}`);
    throw err;
  }
}
