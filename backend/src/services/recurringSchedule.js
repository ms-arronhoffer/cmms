/**
 * Recurring Schedule Generation Service
 *
 * Business rules:
 * - Monthly:   Same day of month, next occurrence. Adjusted to next business day.
 * - Quarterly: Q1 start (Jan/Feb/Mar) +91 days, Q2 (Apr/May/Jun) +92 days,
 *              Q3 (Jul/Aug/Sep) +92 days, Q4 (Oct/Nov/Dec) +92 days.
 *              Result adjusted to next business day.
 * - Yearly:    Same month/day one year later. Adjusted to next business day.
 *
 * Look-ahead: generate occurrences through 14 months from today.
 */

import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import logger from '../utils/logger.js';

const LOOK_AHEAD_MONTHS = 14;

/**
 * Returns true if the given date falls on a weekend (Saturday or Sunday).
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Returns the next business day on or after the given date.
 * If the date is already a weekday it is returned unchanged.
 */
export function nextBusinessDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Compute the ideal (calendar) next occurrence date from a given base date
 * according to the recurrence type, then snap to the next business day.
 *
 * @param {Date}   baseDate       - The date the interval is measured from.
 * @param {string} recurrenceType - 'Monthly' | 'Quarterly' | 'Yearly'
 * @returns {Date} Next scheduled business day.
 */
export function computeNextOccurrence(baseDate, recurrenceType) {
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  let ideal;

  if (recurrenceType === 'Monthly') {
    // Same day-of-month next month
    ideal = new Date(base);
    ideal.setMonth(ideal.getMonth() + 1);
  } else if (recurrenceType === 'Quarterly') {
    // Quarter offsets based on start month (0-indexed)
    const month = base.getMonth(); // 0-11
    let offsetDays;
    if (month <= 2) {
      // Jan (0), Feb (1), Mar (2) → Q1 → +91 days
      offsetDays = 91;
    } else {
      // Apr-Jun, Jul-Sep, Oct-Dec → +92 days
      offsetDays = 92;
    }
    ideal = new Date(base);
    ideal.setDate(ideal.getDate() + offsetDays);
  } else if (recurrenceType === 'Yearly') {
    // Same day one year later
    ideal = new Date(base);
    ideal.setFullYear(ideal.getFullYear() + 1);
  } else {
    throw new Error(`Unknown recurrenceType: ${recurrenceType}`);
  }

  return nextBusinessDay(ideal);
}

/**
 * Given a root/parent schedule, generate all future occurrences up to
 * LOOK_AHEAD_MONTHS months from today that don't already exist in the DB.
 *
 * @param {Object} rootSchedule - Mongoose document (or plain object) of the root schedule.
 * @returns {number} Count of new occurrences created.
 */
export async function generateFutureOccurrences(rootSchedule) {
  const {
    _id: rootId,
    equipmentId,
    maintenanceTaskId,
    recurrenceType,
    recurrenceStartDate,
    estimatedCost,
    assignedTo,
  } = rootSchedule;

  if (!recurrenceType || recurrenceType === 'None') return 0;

  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + LOOK_AHEAD_MONTHS);

  // Find the latest existing occurrence in this series to know where to continue from
  const latest = await MaintenanceSchedule.findOne({
    $or: [{ _id: rootId }, { parentScheduleId: rootId }],
  }).sort({ nextDueDate: -1 });

  let fromDate = latest ? new Date(latest.nextDueDate) : new Date(recurrenceStartDate || rootSchedule.nextDueDate);
  fromDate.setHours(0, 0, 0, 0);

  // Determine the highest existing occurrenceIndex in the series
  const maxIndexDoc = await MaintenanceSchedule.findOne({
    $or: [{ _id: rootId }, { parentScheduleId: rootId }],
  }).sort({ occurrenceIndex: -1 });
  let nextIndex = (maxIndexDoc?.occurrenceIndex ?? 0) + 1;

  const toCreate = [];

  // Walk forward, computing the next occurrence until we pass the horizon
  let cursor = fromDate;
  while (true) {
    const next = computeNextOccurrence(cursor, recurrenceType);
    if (next > horizon) break;

    // Check if an occurrence on this exact date already exists in the series
    const exists = await MaintenanceSchedule.exists({
      $or: [{ _id: rootId }, { parentScheduleId: rootId }],
      nextDueDate: next,
    });

    if (!exists) {
      toCreate.push({
        equipmentId,
        maintenanceTaskId,
        nextDueDate: next,
        status: 'Upcoming',
        estimatedCost: estimatedCost || 0,
        assignedTo: assignedTo || '',
        recurrenceType,
        recurrenceStartDate: recurrenceStartDate || rootSchedule.nextDueDate,
        parentScheduleId: rootId,
        isRecurringRoot: false,
        occurrenceIndex: nextIndex++,
      });
    }

    cursor = next;
  }

  if (toCreate.length > 0) {
    await MaintenanceSchedule.insertMany(toCreate);
    logger.info(`[recurringSchedule] Created ${toCreate.length} occurrences for series ${rootId} (${recurrenceType})`);
  }

  return toCreate.length;
}

/**
 * Scan all recurring root schedules and fill in any missing future occurrences
 * up to the look-ahead horizon.  Called by the daily cron job.
 */
export async function generateAllFutureOccurrences() {
  const roots = await MaintenanceSchedule.find({
    isRecurringRoot: true,
    recurrenceType: { $ne: 'None' },
  });

  let total = 0;
  for (const root of roots) {
    try {
      const created = await generateFutureOccurrences(root);
      total += created;
    } catch (err) {
      logger.error(`[recurringSchedule] Failed to generate occurrences for ${root._id}: ${err.message}`);
    }
  }

  logger.info(`[recurringSchedule] Daily run complete. ${total} new occurrences created across ${roots.length} series.`);
  return total;
}
