const cron = require('node-cron');
const db = require('../config/database');
const { sendEmail } = require('./notificationService');

let reminderJob;

const notifyAdmins = async (reportId) => {
  try {
    const [reports] = await db.query(
            `SELECT DATE_FORMAT(r.report_date, '%Y-%m-%d') AS report_date,
              r.shift_name, r.sales_total, r.cash_collected,
              r.station_id, a.name AS agent_name, s.name AS station_name
       FROM daily_reports r
       JOIN users a ON a.id = r.agent_id
       JOIN stations s ON s.id = r.station_id
       WHERE r.id = ?`,
      [reportId]
    );
    if (!reports[0]) return;
    const [admins] = await db.query('SELECT email FROM admins');
    const report = reports[0];
    await Promise.all(admins.map(({ email }) => sendEmail(
      email,
      `Daily report submitted: ${report.station_name}`,
      `${report.agent_name} submitted the ${report.shift_name} report for ${report.report_date}.\nSales: ${report.sales_total}\nCash collected: ${report.cash_collected}`
    )));
  } catch (error) {
    console.error('Report submission email failed:', error);
  }
};

const sendDailyReminders = async () => {
  try {
    const [agents] = await db.query(
      `SELECT u.name, u.email, s.name AS station_name
       FROM users u JOIN stations s ON s.id = u.station_id
       WHERE u.role = 'agent' AND u.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM daily_reports r
           WHERE r.agent_id = u.id AND r.report_date = CURDATE()
             AND r.status IN ('submitted', 'approved')
         )`
    );
    await Promise.all(agents.map(({ name, email, station_name: stationName }) => sendEmail(
      email,
      'Reminder: submit your daily station report',
      `Hello ${name}, please submit today's daily report for ${stationName}.`
    )));
  } catch (error) {
    console.error('Daily report reminders failed:', error);
  }
};

const startReminderJob = () => {
  const schedule = process.env.REPORT_REMINDER_CRON || '0 18 * * *';
  if (reminderJob) return;
  if (!cron.validate(schedule)) {
    console.error('Invalid REPORT_REMINDER_CRON expression; daily reminders are disabled');
    return;
  }
  try {
    reminderJob = cron.schedule(schedule, sendDailyReminders, {
      timezone: process.env.REPORT_TIMEZONE || 'Africa/Kigali'
    });
    console.log('Daily report reminder job scheduled');
  } catch (error) {
    console.error('Unable to schedule daily report reminders:', error);
  }
};

module.exports = { notifyAdmins, startReminderJob };