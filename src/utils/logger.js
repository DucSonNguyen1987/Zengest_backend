// src/utils/logger.js - FICHIER MANQUANT À CRÉER
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration des formats
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Ajouter la stack trace pour les erreurs
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Ajouter les métadonnées
    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Configuration des transports
const transports = [
  // Console (développement)
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  }),

  // Fichier pour toutes les logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: logFormat
  }),

  // Fichier pour les erreurs uniquement
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat
  }),

  // Fichier pour les accès/sécurité
  new DailyRotateFile({
    filename: path.join(logsDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'warn',
    format: logFormat
  })
];

// Créer le logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
  
  // Gestion des exceptions non capturées
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  
  // Gestion des rejections de promesses
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ]
});

// Logger spécialisé pour la sécurité
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d' // Garder plus longtemps pour la sécurité
    })
  ]
});

// Logger spécialisé pour les accès HTTP
const accessLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '14d'
    })
  ]
});

// Méthodes de convenance pour la sécurité
logger.security = (message, meta = {}) => {
  securityLogger.warn(message, { type: 'security', ...meta });
};

logger.access = (message, meta = {}) => {
  accessLogger.info(message, { type: 'access', ...meta });
};

// Middleware Morgan personnalisé
logger.morganStream = {
  write: (message) => {
    accessLogger.info(message.trim());
  }
};

// Format Morgan pour les logs d'accès
logger.morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Méthode pour logger les erreurs avec contexte
logger.errorWithContext = (error, context = {}) => {
  logger.error(error.message || error, {
    stack: error.stack,
    ...context
  });
};

// Méthode pour les logs de performance
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation} completed in ${duration}ms`, {
    type: 'performance',
    operation,
    duration,
    ...meta
  });
};

// Export du logger principal et des utilitaires
module.exports = logger;