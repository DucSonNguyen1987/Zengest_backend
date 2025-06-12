const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const logger = require('../utils/logger');

// Configuration Redis (optionnelle)
let redisClient = null;
let redisStore = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD
    });

    redisClient.on('error', (err) => {
      logger.warn('Erreur Redis pour rate limiting:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecté pour le rate limiting');
    });

    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'rl:zengest:'
    });
  } catch (error) {
    logger.warn('Impossible de connecter Redis pour le rate limiting:', error);
  }
}

/**
 * Configuration par défaut des limiteurs
 */
const defaultConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit dépassé pour ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  },
  keyGenerator: (req) => {
    // Utiliser l'ID utilisateur si authentifié, sinon l'IP
    return req.user?.id || req.ip;
  },
  store: redisStore
};

/**
 * Rate limiter pour les requêtes publiques générales
 */
const publicLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette adresse IP, réessayez dans 15 minutes.',
  keyGenerator: (req) => req.ip // Toujours utiliser l'IP pour les requêtes publiques
});

/**
 * Rate limiter pour les utilisateurs authentifiés
 */
const authenticatedLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requêtes par fenêtre pour les utilisateurs connectés
  message: 'Trop de requêtes. Veuillez patienter avant de continuer.',
  skip: (req) => {
    // Pas de limite pour les admins
    return req.user?.role === 'admin';
  }
});

/**
 * Rate limiter strict pour l'authentification
 */
const authLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Seulement 5 tentatives de connexion
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  keyGenerator: (req) => {
    // Combiner IP et email pour plus de sécurité
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
  skipSuccessfulRequests: true // Ne pas compter les connexions réussies
});

/**
 * Rate limiter pour les réservations publiques
 */
const publicReservationLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // Maximum 3 réservations par heure par IP
  message: 'Limite de réservations atteinte. Vous pouvez faire maximum 3 réservations par heure.',
  keyGenerator: (req) => req.ip
});

/**
 * Rate limiter pour les messages de contact
 */
const publicContactLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // Maximum 5 messages par heure
  message: 'Limite de messages de contact atteinte. Veuillez patienter avant d\'envoyer un nouveau message.',
  keyGenerator: (req) => req.ip
});

/**
 * Rate limiter pour la création de contenu
 */
const creationLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: (req) => {
    // Limites différentes selon le rôle
    switch (req.user?.role) {
      case 'admin':
      case 'owner':
        return 100; // Pratiquement pas de limite
      case 'manager':
        return 50;
      case 'staff':
        return 20;
      default:
        return 5;
    }
  },
  message: 'Limite de création atteinte pour votre rôle.',
  keyGenerator: (req) => req.user?.id || req.ip
});

/**
 * Rate limiter pour les uploads de fichiers
 */
const uploadLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 uploads par heure
  message: 'Limite d\'upload atteinte. Veuillez patienter avant d\'uploader de nouveaux fichiers.'
});

/**
 * Rate limiter pour les opérations sensibles
 */
const sensitiveLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 opérations sensibles par heure
  message: 'Limite d\'opérations sensibles atteinte.',
  skip: (req) => {
    // Moins de restriction pour les admins et owners
    return ['admin', 'owner'].includes(req.user?.role);
  }
});

/**
 * Rate limiter pour l'API de recherche
 */
const searchLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 recherches par minute
  message: 'Trop de recherches. Veuillez ralentir.'
});

/**
 * Rate limiter pour les webhooks
 */
const webhookLimiter = rateLimit({
  ...defaultConfig,
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 webhooks par minute
  keyGenerator: (req) => {
    // Utiliser un header spécifique ou l'IP
    return req.get('X-Webhook-Source') || req.ip;
  }
});

/**
 * Rate limiter adaptatif basé sur la charge du serveur
 */
const adaptiveLimiter = (baseMax = 100) => {
  return rateLimit({
    ...defaultConfig,
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      // Réduire les limites si la charge système est élevée
      const loadAverage = require('os').loadavg()[0];
      const cpuCount = require('os').cpus().length;
      const loadPercentage = (loadAverage / cpuCount) * 100;
      
      if (loadPercentage > 80) {
        return Math.floor(baseMax * 0.5); // Réduire de 50%
      } else if (loadPercentage > 60) {
        return Math.floor(baseMax * 0.7); // Réduire de 30%
      }
      
      return baseMax;
    }
  });
};

/**
 * Middleware pour bypasser le rate limiting en développement
 */
const developmentBypass = (limiter) => {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_RATE_LIMIT === 'true') {
    return (req, res, next) => {
      // Ajouter des headers pour simulation
      res.set('X-RateLimit-Limit', '999999');
      res.set('X-RateLimit-Remaining', '999999');
      res.set('X-RateLimit-Reset', new Date(Date.now() + 15 * 60 * 1000));
      next();
    };
  }
  return limiter;
};

/**
 * Middleware pour logging des rate limits
 */
const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Logger les informations de rate limit
    if (req.rateLimit) {
      logger.debug('Rate limit info', {
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.originalUrl,
        limit: req.rateLimit.limit,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(req.rateLimit.resetTime)
      });
      
      // Alerter si on approche de la limite
      if (req.rateLimit.remaining < req.rateLimit.limit * 0.1) {
        logger.warn('Rate limit proche de la limite', {
          ip: req.ip,
          userId: req.user?.id,
          remaining: req.rateLimit.remaining,
          limit: req.rateLimit.limit
        });
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Rate limiter personnalisé par endpoint
 */
const createCustomLimiter = (options) => {
  return rateLimit({
    ...defaultConfig,
    ...options,
    handler: options.handler || defaultConfig.handler
  });
};

/**
 * Middleware pour la gestion des IP de confiance
 */
const trustedIPsBypass = (trustedIPs = []) => {
  const trustedSet = new Set([
    ...trustedIPs,
    '127.0.0.1',
    '::1',
    ...(process.env.TRUSTED_IPS?.split(',') || [])
  ]);

  return (req, res, next) => {
    if (trustedSet.has(req.ip)) {
      // Bypass pour les IPs de confiance
      return next();
    }
    next();
  };
};

/**
 * Obtenir les statistiques de rate limiting
 */
const getRateLimitStats = async () => {
  if (!redisClient) {
    return { error: 'Redis non configuré' };
  }

  try {
    const keys = await redisClient.keys('rl:zengest:*');
    const stats = {
      totalKeys: keys.length,
      endpoints: {},
      topIPs: {}
    };

    // Analyser les clés pour obtenir des statistiques
    for (const key of keys.slice(0, 100)) { // Limiter pour les performances
      const parts = key.split(':');
      if (parts.length >= 4) {
        const endpoint = parts[3];
        const ip = parts[4];
        
        if (!stats.endpoints[endpoint]) {
          stats.endpoints[endpoint] = 0;
        }
        stats.endpoints[endpoint]++;
        
        if (!stats.topIPs[ip]) {
          stats.topIPs[ip] = 0;
        }
        stats.topIPs[ip]++;
      }
    }

    return stats;
  } catch (error) {
    logger.error('Erreur lors de la récupération des stats de rate limiting:', error);
    return { error: error.message };
  }
};

/**
 * Nettoyer les anciennes entrées de rate limiting
 */
const cleanupRateLimitData = async () => {
  if (!redisClient) {
    return;
  }

  try {
    const keys = await redisClient.keys('rl:zengest:*');
    let deletedCount = 0;

    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl <= 0) {
        await redisClient.del(key);
        deletedCount++;
      }
    }

    logger.info(`Nettoyage rate limiting: ${deletedCount} entrées supprimées`);
    return deletedCount;
  } catch (error) {
    logger.error('Erreur lors du nettoyage des données de rate limiting:', error);
    return 0;
  }
};

// Programmer le nettoyage automatique
if (redisClient) {
  setInterval(cleanupRateLimitData, 60 * 60 * 1000); // Toutes les heures
}

module.exports = {
  // Limiteurs prédéfinis
  public: developmentBypass(publicLimiter),
  authenticated: developmentBypass(authenticatedLimiter),
  auth: developmentBypass(authLimiter),
  publicReservation: developmentBypass(publicReservationLimiter),
  publicContact: developmentBypass(publicContactLimiter),
  creation: developmentBypass(creationLimiter),
  upload: developmentBypass(uploadLimiter),
  sensitive: developmentBypass(sensitiveLimiter),
  search: developmentBypass(searchLimiter),
  webhook: developmentBypass(webhookLimiter),
  adaptive: (max) => developmentBypass(adaptiveLimiter(max)),

  // Utilitaires
  createCustomLimiter,
  trustedIPsBypass,
  rateLimitLogger,
  getRateLimitStats,
  cleanupRateLimitData,

  // Configuration
  defaultConfig
};