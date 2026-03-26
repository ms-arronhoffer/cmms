/**
 * Generate HTML report for maintenance schedules
 */
export function generateHTMLReport(reportData) {
  const {
    generatedDate,
    reportPeriodDays,
    scheduleCount,
    overdueCount,
    schedules,
  } = reportData;

  const formattedDate = new Date(generatedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const overduePercentage =
    scheduleCount > 0 ? ((overdueCount / scheduleCount) * 100).toFixed(1) : 0;

  let schedulesHtml = schedules
    .map(
      (schedule) => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 12px; text-align: left;">${schedule.equipmentId.assetName}</td>
      <td style="padding: 12px; text-align: left;">${schedule.equipmentId.assetId}</td>
      <td style="padding: 12px; text-align: left;">${schedule.maintenanceTaskId.taskDescription}</td>
      <td style="padding: 12px; text-align: center;">${schedule.maintenanceTaskId.frequencyInterval}</td>
      <td style="padding: 12px; text-align: center;">
        <span style="background-color: ${schedule.status === 'Overdue' ? '#ffcccc' : '#ccffcc'}; padding: 4px 8px; border-radius: 4px;">
          ${schedule.status}
        </span>
      </td>
      <td style="padding: 12px; text-align: right;">${new Date(schedule.nextDueDate).toLocaleDateString('en-US')}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMMS Maintenance Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1976d2;
      text-align: center;
      margin-bottom: 10px;
    }
    .report-meta {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.overdue {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .summary-card.upcoming {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .summary-card.percentage {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    .summary-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    .summary-label {
      font-size: 14px;
      opacity: 0.9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    thead {
      background-color: #f5f5f5;
      border-bottom: 2px solid #1976d2;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: bold;
      color: #333;
    }
    td {
      padding: 12px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>CMMS Maintenance Report</h1>
    <div class="report-meta">
      <p>Generated on ${formattedDate}</p>
      <p>Next 30 Days Maintenance Schedule</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <div class="summary-label">Total Scheduled</div>
        <div class="summary-value">${scheduleCount}</div>
      </div>
      <div class="summary-card overdue">
        <div class="summary-label">Overdue</div>
        <div class="summary-value">${overdueCount}</div>
      </div>
      <div class="summary-card upcoming">
        <div class="summary-label">Upcoming</div>
        <div class="summary-value">${scheduleCount - overdueCount}</div>
      </div>
      <div class="summary-card percentage">
        <div class="summary-label">On-Time %</div>
        <div class="summary-value">${100 - overduePercentage}%</div>
      </div>
    </div>

    <h2>Maintenance Schedule Details</h2>
    <table>
      <thead>
        <tr>
          <th>Equipment Name</th>
          <th>Asset ID</th>
          <th>Maintenance Task</th>
          <th>Frequency</th>
          <th>Status</th>
          <th>Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${schedulesHtml}
      </tbody>
    </table>

    <div class="footer">
      <p>This is an automated report from the CMMS Portal. For more details, please log in to the application.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate CSV report for maintenance schedules
 */
export function generateCSVReport(reportData) {
  const { generatedDate, scheduleCount, overdueCount, schedules } = reportData;

  const headers = [
    'Equipment Name',
    'Asset ID',
    'Location',
    'Service Provider',
    'Maintenance Task',
    'Frequency',
    'Priority',
    'Status',
    'Last Service Date',
    'Next Due Date',
    'Estimated Cost',
    'Assigned To',
  ];

  const rows = schedules.map((schedule) => [
    `"${schedule.equipmentId.assetName}"`,
    schedule.equipmentId.assetId,
    `"${schedule.equipmentId.physicalLocation || ''}"`,
    `"${schedule.equipmentId.serviceProviderName || ''}"`,
    `"${schedule.maintenanceTaskId.taskDescription}"`,
    schedule.maintenanceTaskId.frequencyInterval,
    schedule.maintenanceTaskId.priorityLevel,
    schedule.status,
    schedule.lastServiceDate ? new Date(schedule.lastServiceDate).toLocaleDateString('en-US') : '',
    new Date(schedule.nextDueDate).toLocaleDateString('en-US'),
    schedule.estimatedCost || 0,
    schedule.assignedTo || '',
  ]);

  // Add summary rows
  const summaryRows = [
    [],
    ['Summary Statistics'],
    ['Generated Date', new Date(generatedDate).toLocaleDateString('en-US')],
    ['Total Scheduled', scheduleCount],
    ['Overdue', overdueCount],
    ['Upcoming', scheduleCount - overdueCount],
    ['On-Time Percentage', ((100 * (scheduleCount - overdueCount)) / scheduleCount).toFixed(1) + '%'],
  ];

  const csvContent = [headers, ...rows, ...summaryRows]
    .map((row) => row.join(','))
    .join('\n');

  return csvContent;
}
