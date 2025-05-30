require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/Zengest',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key',
  jwtExpire: process.env.JWT_EXPIRE || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};