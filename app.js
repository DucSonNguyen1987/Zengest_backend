const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const config = require('./src/config/config');

// Import des routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const restaurantRoutes = require('./src/routes/restaurants');
const floorPlanRoutes = require('./src/routes/floorplans');
const menuRoutes = require('./src/routes/menu');
const orderRoutes = require('./src/routes/orders');
const reservationRoutes = require('./src/routes/reservations');
const notificationRoutes = require ('./src/routes/notifications');

// Import des middlewares personnalisés
const { auth } = require('./src/middleware/auth');

const app = express();

// Trust proxy (important pour Heroku, Railway, etc.)
app.set('trust proxy', 1);

// Compression des réponses HTTP
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Configuration CORS avancée
const corsOptions = {
  origin: function (origin, callback) {
    // Liste des origines autorisées
    const allowedOrigins = [
      config.frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite
      'http://localhost:4173', // Vite preview
      'https://zengest.vercel.app',
      'https://zengest-admin.vercel.app'
    ];

    // En développement, autoriser toutes les origines localhost
    if (config.nodeEnv === 'development') {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origine non autorisée: ${origin}`);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 heures
};

app.use(cors(corsOptions));

// Middleware pour les preflight requests
app.options('*', cors(corsOptions));

// Middleware de parsing avec limites de sécurité
app.use(express.json({
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000
}));

// Middleware pour parser les cookies
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Rate limiting global avec configuration avancée
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Plus de requêtes autorisées pour les utilisateurs authentifiés
    if (req.headers.authorization) {
      return 200; // 200 requêtes pour les utilisateurs connectés
    }
    return 100; // 100 requêtes pour les anonymes
  },
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit dépassé pour IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes, veuillez réessayer plus tard.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting spécifique pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
    security: 'Activité suspecte détectée'
  },
  handler: (req, res) => {
    console.warn(`Tentatives de connexion multiples depuis IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Trop de tentatives de connexion, compte temporairement bloqué.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting pour les opérations sensibles
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 opérations sensibles par heure
  message: {
    success: false,
    message: 'Limite d\'opérations sensibles atteinte, réessayez dans 1 heure.'
  }
});

// Appliquer les limiteurs
app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/users/*/delete', sensitiveOperationsLimiter);
app.use('/api/restaurants/*/delete', sensitiveOperationsLimiter);

// Configuration du logging avec Morgan
const createLoggerMiddleware = () => {
  // Créer le dossier logs s'il n'existe pas
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Format personnalisé pour les logs
  const logFormat = config.nodeEnv === 'development'
    ? ':method :url :status :response-time ms - :res[content-length] - :remote-addr'
    : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

  if (config.nodeEnv === 'development') {
    return morgan(logFormat, {
      immediate: false,
      stream: {
        write: (message) => {
          // Colorisation en développement
          const colorCode = message.includes(' 2') ? '\x1b[32m' :
            message.includes(' 3') ? '\x1b[33m' :
              message.includes(' 4') || message.includes(' 5') ? '\x1b[31m' : '\x1b[0m';
          console.log(`${colorCode}${message.trim()}\x1b[0m`);
        }
      }
    });
  } else {
    return morgan(logFormat, {
      stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' })
    });
  }
};

app.use(createLoggerMiddleware());

// Middleware pour ajouter des headers personnalisés
app.use((req, res, next) => {
  res.set({
    'X-Powered-By': 'Zengest API v1.2.0',
    'X-API-Version': '1.2.0',
    'X-Request-ID': req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  next();
});

// Middleware pour logger les requêtes importantes en développement
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      console.log(`🔵 ${req.method} ${req.path}`, {
        body: req.body ? Object.keys(req.body) : 'empty',
        user: req.user?.email || 'anonymous',
        ip: req.ip
      });
    }
    next();
  });
}

// ================================
// ROUTES API
// ================================

// Route de santé détaillée
app.get('/api/health', (req, res) => {
  const healthStatus = {
    success: true,
    message: 'API Zengest fonctionne correctement',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.2.0',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    }
  };

  // Vérifier la connexion MongoDB (simple ping)
  const mongoose = require('mongoose');
  healthStatus.database = {
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    host: mongoose.connection.host || 'N/A',
    name: mongoose.connection.name || 'N/A'
  };

  res.json(healthStatus);
});

// Route de documentation API
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Documentation API Zengest',
    version: '1.2.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        login: 'POST /auth/login',
        register: 'POST /auth/register',
        me: 'GET /auth/me',
        logout: 'POST /auth/logout',
        changePassword: 'PUT /auth/change-password'
      },
      users: {
        list: 'GET /users',
        get: 'GET /users/:id',
        create: 'POST /users',
        update: 'PUT /users/:id',
        delete: 'DELETE /users/:id'
      },
      restaurants: {
        list: 'GET /restaurants',
        get: 'GET /restaurants/:id',
        create: 'POST /restaurants',
        update: 'PUT /restaurants/:id',
        delete: 'DELETE /restaurants/:id',
        status: 'GET /restaurants/:id/status'
      },
      floorPlans: {
        list: 'GET /floor-plans',
        get: 'GET /floor-plans/:id',
        default: 'GET /floor-plans/default',
        create: 'POST /floor-plans',
        update: 'PUT /floor-plans/:id',
        delete: 'DELETE /floor-plans/:id',
        setDefault: 'PATCH /floor-plans/:id/default',
        updateTableStatus: 'PATCH /floor-plans/:id/tables/:tableId/status',
        export: 'GET /floor-plans/:id/export'
      },
      menu: {
        list: 'GET /menu',
        search: 'GET /menu/search',
        categories: 'GET /menu/categories',
        get: 'GET /menu/:id',
        create: 'POST /menu',
        update: 'PUT /menu/:id',
        delete: 'DELETE /menu/:id',
        updateAvailability: 'PATCH /menu/:id/availability',
        updatePrice: 'PATCH /menu/:id/price',
        related: 'GET /menu/:id/related'
      },
      orders: {
        list: 'GET /orders',
        active: 'GET /orders/active',
        byTable: 'GET /orders/table/:floorPlanId/:tableId',
        get: 'GET /orders/:id',
        create: 'POST /orders',
        update: 'PUT /orders/:id',
        updateStatus: 'PATCH /orders/:id/status',
        addItems: 'POST /orders/:id/items',
        removeItem: 'DELETE /orders/:id/items/:itemId',
        payment: 'POST /orders/:id/payment',
        statistics: 'GET /orders/statistics/summary'
      },
      utilities: {
        health: 'GET /health',
        docs: 'GET /docs'
      },
      reservations: {
        list: 'GET /reservations',
        byDate: 'GET /reservations/date/:date',
        get: 'GET /reservations/:id',
        create: 'POST /reservations',
        update: 'PUT /reservations/:id',
        updateStatus: 'PATCH /reservations/:id/status',
        assignTable: 'PATCH /reservations/:id/assign-table',
        delete: 'DELETE /reservations/:id'
      },
      notifications: {
        sendConfirmation: 'POST /notifications/reservations/:id/confirmation',
        sendReminder: 'POST /notifications/reservations/:id/reminder',
        sendCancellation: 'POST /notifications/reservations/:id/cancellation',
        batchReminders: 'POST /notifications/batch/reminders',
        history: 'GET /notifications/reservations/:id/history',
        stats: 'GET /notifications/stats',
        test: 'POST /notifications/test',
        retry: 'POST /notifications/retry/:id/:type',
        schedulerStatus: 'GET /notifications/scheduler/status',
        runJob: 'POST /notifications/scheduler/run/:job'
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      expiry: '24 hours'
    },
    rateLimit: {
      global: '200 requests per 15 minutes (authenticated), 100 (anonymous)',
      auth: '5 attempts per 15 minutes',
      sensitive: '10 operations per hour'
    }
  });
});

// Routes principales de l'API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/floor-plans', floorPlanRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);

// Route racine avec informations générales
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API Zengest - Système de gestion de restaurant',
    version: '1.2.0',
    description: 'API complète pour la gestion de restaurants avec commandes, plans de salle, menus et analytics',
    features: [
      'Gestion des utilisateurs et authentification JWT',
      'Système de commandes en temps réel',
      'Plans de salle interactifs avec tables',
      'Gestion complète du menu avec variantes de prix',
      'Système de réservations avec notifications email',  
  'Notifications automatisées par email (Nodemailer)', 
  'Tâches automatisées (rappels, nettoyage)',
      'Analytics et statistiques détaillées',
      'Système de permissions par rôles',
      'Validation robuste des données',
      'Rate limiting et sécurité avancée',
    ],
    documentation: {
      health: '/api/health',
      endpoints: '/api/docs',
      repository: 'https://github.com/zengest/backend'
    },
    support: {
      email: 'support@zengest.com',
      docs: 'https://docs.zengest.com'
    }
  });
});

// Route pour servir les fichiers statiques (uploads, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// Route pour les fichiers publics
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '30d',
  etag: true
}));

// Middleware pour gérer les routes non trouvées
app.use('*', (req, res) => {
  console.warn(`Route non trouvée: ${req.method} ${req.originalUrl} depuis IP: ${req.ip}`);

  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`,
    method: req.method,
    availableEndpoints: {
      base: '/',
      health: '/api/health',
      docs: '/api/docs',
      auth: '/api/auth/*',
      users: '/api/users/*',
      restaurants: '/api/restaurants/*',
      floorPlans: '/api/floor-plans/*',
      menu: '/api/menu/*',
      orders: '/api/orders/*'
    },
    suggestion: 'Consultez /api/docs pour la documentation complète'
  });
});

// ================================
// MIDDLEWARE DE GESTION D'ERREURS
// ================================

// Middleware de gestion des erreurs global
app.use((err, req, res, next) => {
  // Log détaillé de l'erreur
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.email || 'anonymous',
    timestamp: new Date().toISOString(),
    requestId: res.get('X-Request-ID')
  };

  console.error('🚨 Erreur détectée:', errorInfo);

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données',
      errors,
      type: 'ValidationError'
    });
  }

  // Erreur de cast MongoDB (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Identifiant invalide: ${err.value}`,
      field: err.path,
      type: 'CastError'
    });
  }

  // Erreur de duplication MongoDB (clé unique)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      success: false,
      message: `${field} "${value}" existe déjà`,
      field,
      type: 'DuplicateError'
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification invalide',
      type: 'AuthenticationError'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification expiré',
      type: 'AuthenticationError'
    });
  }

  // Erreur de limite de taille
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Fichier ou données trop volumineux',
      limit: '10MB',
      type: 'SizeError'
    });
  }

  // Erreur CORS
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Accès CORS non autorisé',
      type: 'CORSError'
    });
  }

  // Erreur de connexion base de données
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    return res.status(503).json({
      success: false,
      message: 'Service temporairement indisponible - Problème de base de données',
      type: 'DatabaseError'
    });
  }

  // Gestion spéciale pour les erreurs de développement
  if (config.nodeEnv === 'development') {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Erreur serveur interne',
      type: err.name || 'ServerError',
      stack: err.stack,
      details: err,
      requestInfo: {
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
      }
    });
  }

  // Erreur générique pour la production
  res.status(err.status || 500).json({
    success: false,
    message: err.status === 500 ? 'Erreur serveur interne' : (err.message || 'Une erreur est survenue'),
    type: 'ServerError',
    requestId: res.get('X-Request-ID'),
    timestamp: new Date().toISOString()
  });
});

// Gestion des promesses rejetées non catchées
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection détectée:', reason);
  console.error('Promise:', promise);
  // Ne pas arrêter le serveur en production, mais logger l'erreur
  if (config.nodeEnv !== 'production') {
    process.exit(1);
  }
});

// Gestion des exceptions non catchées
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception détectée:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('📴 Signal SIGTERM reçu, arrêt propre du serveur...');
  // Ici vous pouvez ajouter la logique de nettoyage
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Signal SIGINT reçu, arrêt propre du serveur...');
  process.exit(0);
});

module.exports = app;