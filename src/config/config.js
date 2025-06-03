require('dotenv').config();

module.exports = {
  // Configuration serveur
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configuration base de données
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zengest',
  
  // Configuration JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRES_IN || '24h',
  
  // Configuration Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Configuration Email
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  reminderHoursBefore: parseInt(process.env.REMINDER_HOURS_BEFORE) || 24,
  
  // Configuration uploads
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
  
  // Configuration sécurité
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  
  // Configuration logs
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Configuration cron jobs
  enableCronJobs: process.env.ENABLE_CRON_JOBS === 'true'
};