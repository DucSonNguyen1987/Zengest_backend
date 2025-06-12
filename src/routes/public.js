const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

// Middlewares
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validation');

// Contrôleur
const publicController = require('../controllers/publicController');

// Validateurs
const validateRestaurantSlug = [
  param('restaurantSlug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug de restaurant invalide')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le slug doit contenir entre 2 et 50 caractères')
];

const validateReservation = [
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .withMessage('Le nom contient des caractères invalides'),

  body('customerEmail')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),

  body('customerPhone')
    .matches(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)
    .withMessage('Numéro de téléphone français invalide'),

  body('date')
    .isISO8601()
    .withMessage('Date invalide')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        throw new Error('La date de réservation ne peut pas être dans le passé');
      }
      
      // Limiter les réservations à 3 mois à l'avance
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3);
      
      if (date > maxDate) {
        throw new Error('Les réservations ne peuvent pas être faites plus de 3 mois à l\'avance');
      }
      
      return true;
    }),

  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure invalide (format HH:mm)'),

  body('partySize')
    .isInt({ min: 1, max: 20 })
    .withMessage('Le nombre de personnes doit être entre 1 et 20'),

  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les demandes spéciales ne peuvent pas dépasser 500 caractères')
];

const validateContactMessage = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .withMessage('Le nom contient des caractères invalides'),

  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)
    .withMessage('Numéro de téléphone français invalide'),

  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Le sujet ne peut pas dépasser 200 caractères'),

  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Le message doit contenir entre 10 et 1000 caractères')
];

const validateMenuQuery = [
  query('category')
    .optional()
    .isIn(['appetizers', 'soups', 'salads', 'mains', 'fish', 'meat', 'vegetarian', 'desserts', 'beverages', 'wines', 'cocktails'])
    .withMessage('Catégorie invalide'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La recherche doit contenir entre 2 et 100 caractères'),

  query('vegetarian')
    .optional()
    .isBoolean()
    .withMessage('vegetarian doit être un booléen'),

  query('vegan')
    .optional()
    .isBoolean()
    .withMessage('vegan doit être un booléen'),

  query('glutenFree')
    .optional()
    .isBoolean()
    .withMessage('glutenFree doit être un booléen')
];

const validateDateQuery = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date invalide')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Autoriser les dates passées pour consulter l'historique
      const minDate = new Date();
      minDate.setMonth(minDate.getMonth() - 1);
      
      if (date < minDate) {
        throw new Error('Date trop ancienne');
      }
      
      return true;
    })
];

// Routes pour les informations du restaurant
router.get('/restaurant/info', 
  rateLimiter.public,
  publicController.getRestaurantInfo
);

router.get('/restaurant/:restaurantSlug', 
  rateLimiter.public,
  validateRestaurantSlug,
  validateRequest,
  publicController.getRestaurantInfo
);

// Routes pour le menu public
router.get('/menu', 
  rateLimiter.public,
  validateMenuQuery,
  validateRequest,
  publicController.getPublicMenu
);

router.get('/menu/:restaurantSlug', 
  rateLimiter.public,
  validateRestaurantSlug,
  validateMenuQuery,
  validateRequest,
  publicController.getPublicMenu
);

// Routes pour les plats du jour publics
router.get('/daily-specials', 
  rateLimiter.public,
  validateDateQuery,
  validateRequest,
  publicController.getPublicDailySpecials
);

router.get('/daily-specials/:restaurantSlug', 
  rateLimiter.public,
  validateRestaurantSlug,
  validateDateQuery,
  validateRequest,
  publicController.getPublicDailySpecials
);

// Routes pour les réservations publiques
router.post('/reservations', 
  rateLimiter.publicReservation,
  validateReservation,
  validateRequest,
  publicController.createPublicReservation
);

router.post('/reservations/:restaurantSlug', 
  rateLimiter.publicReservation,
  validateRestaurantSlug,
  validateReservation,
  validateRequest,
  publicController.createPublicReservation
);

router.get('/reservations/availability', 
  rateLimiter.public,
  [
    query('date')
      .isISO8601()
      .withMessage('Date requise et valide')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          throw new Error('Impossible de vérifier la disponibilité pour une date passée');
        }
        
        return true;
      })
  ],
  validateRequest,
  publicController.getReservationAvailability
);

router.get('/reservations/:restaurantSlug/availability', 
  rateLimiter.public,
  validateRestaurantSlug,
  [
    query('date')
      .isISO8601()
      .withMessage('Date requise et valide')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          throw new Error('Impossible de vérifier la disponibilité pour une date passée');
        }
        
        return true;
      })
  ],
  validateRequest,
  publicController.getReservationAvailability
);

// Routes pour le contact
router.post('/contact', 
  rateLimiter.publicContact,
  validateContactMessage,
  validateRequest,
  publicController.sendContactMessage
);

router.post('/contact/:restaurantSlug', 
  rateLimiter.publicContact,
  validateRestaurantSlug,
  validateContactMessage,
  validateRequest,
  publicController.sendContactMessage
);

// Routes pour les événements
router.get('/events', 
  rateLimiter.public,
  publicController.getPublicEvents
);

router.get('/events/:restaurantSlug', 
  rateLimiter.public,
  validateRestaurantSlug,
  validateRequest,
  publicController.getPublicEvents
);

// Route de santé pour l'API publique
router.get('/health', 
  rateLimiter.public,
  (req, res) => {
    res.json({
      success: true,
      message: 'API publique opérationnelle',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0'
    });
  }
);

// Route pour obtenir les catégories disponibles
router.get('/categories', 
  rateLimiter.public,
  (req, res) => {
    const categories = [
      { value: 'appetizers', label: 'Entrées', icon: 'restaurant' },
      { value: 'soups', label: 'Soupes', icon: 'soup-kitchen' },
      { value: 'salads', label: 'Salades', icon: 'eco' },
      { value: 'mains', label: 'Plats principaux', icon: 'dinner-dining' },
      { value: 'fish', label: 'Poissons', icon: 'set-meal' },
      { value: 'meat', label: 'Viandes', icon: 'lunch-dining' },
      { value: 'vegetarian', label: 'Végétarien', icon: 'local-florist' },
      { value: 'desserts', label: 'Desserts', icon: 'cake' },
      { value: 'beverages', label: 'Boissons', icon: 'local-drink' },
      { value: 'wines', label: 'Vins', icon: 'wine-bar' },
      { value: 'cocktails', label: 'Cocktails', icon: 'local-bar' }
    ];

    res.json({
      success: true,
      data: { categories }
    });
  }
);

// Route pour obtenir les allergènes
router.get('/allergens', 
  rateLimiter.public,
  (req, res) => {
    const allergens = [
      'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja',
      'Lait', 'Fruits à coques', 'Céleri', 'Moutarde', 'Graines de sésame',
      'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques'
    ];

    res.json({
      success: true,
      data: { allergens }
    });
  }
);

// Middleware de gestion d'erreurs spécifique à l'API publique
router.use((error, req, res, next) => {
  // Log de l'erreur pour le monitoring
  console.error('Erreur API publique:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: error.message,
    stack: error.stack
  });

  // Réponse d'erreur sanitisée pour l'API publique
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: error.errors
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Identifiant invalide'
    });
  }

  // Erreur générique pour la sécurité
  res.status(500).json({
    success: false,
    message: 'Une erreur s\'est produite. Veuillez réessayer plus tard.'
  });
});

module.exports = router;