require('dotenv').config();
const app = require('./app');
const { startReminderJob } = require('./services/reportNotifications');
const { reportEmailConfiguration } = require('./services/notificationService');
const { cleanupExpiredPhoneRegistrations } = require('./controllers/customerRegistrationController');
const cron = require('node-cron');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  reportEmailConfiguration();
  startReminderJob();
  cron.schedule('*/15 * * * *', () => {
    cleanupExpiredPhoneRegistrations().catch((error) => {
      console.error('Expired phone registration cleanup failed:', error.code || error.message);
    });
  });
});