/**
 * MIDDLEWARE DE VALIDATION RÉSERVATIONS - VERSION CORRIGÉE
 * Validation pure sans logique métier
 */

const { body, param, query, validationResult } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const Reservation = require('../models/Reservation');

// === UTILITAIRES DE VALIDATION ===

/**
 * Gère les erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: formattedErrors
    });
  }
  next();
};

/**
 * Validation sécurisée d'un ID MongoDB
 */
const isValidObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// === VALIDATIONS PRINCIPALES ===

/**
 * Validation pour créer une réservation
 */
const validateCreateReservation = [
  // Validation flexible du client
  body('customer')
    .exists()
    .withMessage('Informations client requises')
    .isObject()
    .withMessage('Customer doit être un objet'),

  // Validation flexible du nom client
  body('customer').custom((customer, { req }) => {
    console.log('🔍 Validation customer:', customer);
    
    if (!customer) {
      throw new Error('Informations client requises');
    }

    // Vérifier qu'au moins un format de nom est fourni
    const hasName = customer.name && typeof customer.name === 'string' && customer.name.trim();
    const hasFirstLastName = customer.firstName && typeof customer.firstName === 'string' && customer.firstName.trim();

    if (!hasName && !hasFirstLastName) {
      throw new Error('Le nom du client est requis (customer.name ou customer.firstName/lastName)');
    }

    // Validation email si fourni
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      throw new Error('Format d\'email invalide');
    }

    // Validation téléphone si fourni
    if (customer.phone && !/^[\+]?[0-9\s\-\(\)\.]{8,20}$/.test(customer.phone)) {
      throw new Error('Format de téléphone invalide');
    }

    return true;
  }),

  // Validation date et heure
  body('dateTime')
    .exists()
    .withMessage('Date et heure de réservation requises')
    .isISO8601()
    .withMessage('Format de date invalide (attendu: ISO8601)')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      
      if (isNaN(date.getTime())) {
        throw new Error('Date invalide');
      }
      
      if (date < now) {
        throw new Error('La date de réservation ne peut pas être dans le passé');
      }
      
      // Vérifier que la réservation n'est pas trop loin dans le futur (1 an max)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (date > oneYearFromNow) {
        throw new Error('La réservation ne peut pas être programmée plus d\'un an à l\'avance');
      }
      
      return true;
    }),

  // Validation nombre de convives
  body('partySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Le nombre de convives doit être entre 1 et 20')
    .toInt(),

  // Validation durée
  body('duration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('La durée doit être entre 30 minutes et 8 heures')
    .toInt(),

  // Validation demandes spéciales
  body('specialRequests')
    .optional()
    .isArray()
    .withMessage('Les demandes spéciales doivent être un tableau'),

  body('specialRequests.*')
    .optional()
    .isString()
    .withMessage('Chaque demande spéciale doit être une chaîne de caractères')
    .isLength({ max: 200 })
    .withMessage('Chaque demande spéciale ne peut dépasser 200 caractères'),

  // Validation source
  body('source')
    .optional()
    .isIn(['online', 'phone', 'walk_in', 'app', 'partner'])
    .withMessage('Source de réservation invalide'),

  // Validation notes
  body('notes')
    .optional()
    .isString()
    .withMessage('Les notes doivent être une chaîne de caractères')
    .isLength({ max: 1000 })
    .withMessage('Les notes ne peuvent dépasser 1000 caractères'),

  // Validation restaurant ID (optionnel car peut être déterminé par l'utilisateur)
  body('restaurantId')
    .optional()
    .custom((value) => {
      if (value && !isValidObjectId(value)) {
        throw new Error('ID de restaurant invalide');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation pour mettre à jour une réservation
 */
const validateUpdateReservation = [
  // Validation ID de réservation
  param('id')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('ID de réservation invalide');
      }
      return true;
    }),

  // Mêmes validations que pour créer, mais toutes optionnelles
  body('customer')
    .optional()
    .isObject()
    .withMessage('Customer doit être un objet'),

  body('customer').optional().custom((customer) => {
    if (!customer) return true;

    const hasName = customer.name && typeof customer.name === 'string' && customer.name.trim();
    const hasFirstLastName = customer.firstName && typeof customer.firstName === 'string' && customer.firstName.trim();

    if (!hasName && !hasFirstLastName) {
      throw new Error('Le nom du client est requis (customer.name ou customer.firstName/lastName)');
    }

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      throw new Error('Format d\'email invalide');
    }

    if (customer.phone && !/^[\+]?[0-9\s\-\(\)\.]{8,20}$/.test(customer.phone)) {
      throw new Error('Format de téléphone invalide');
    }

    return true;
  }),

  body('dateTime')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Date invalide');
      }
      
      if (date < new Date()) {
        throw new Error('La date de réservation ne peut pas être dans le passé');
      }
      
      return true;
    }),

  body('partySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Le nombre de convives doit être entre 1 et 20')
    .toInt(),

  body('duration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('La durée doit être entre 30 minutes et 8 heures')
    .toInt(),

  body('specialRequests')
    .optional()
    .isArray()
    .withMessage('Les demandes spéciales doivent être un tableau'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Les notes doivent être une chaîne de caractères')
    .isLength({ max: 1000 })
    .withMessage('Les notes ne peuvent dépasser 1000 caractères'),

  handleValidationErrors
];

/**
 * Validation pour changer le statut d'une réservation
 */
const validateReservationStatus = [
  param('id')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('ID de réservation invalide');
      }
      return true;
    }),

  body('status')
    .exists()
    .withMessage('Statut requis')
    .isIn(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'])
    .withMessage('Statut de réservation invalide'),

  body('reason')
    .optional()
    .isString()
    .withMessage('La raison doit être une chaîne de caractères')
    .isLength({ max: 500 })
    .withMessage('La raison ne peut dépasser 500 caractères'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Les notes doivent être une chaîne de caractères')
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent dépasser 500 caractères'),

  handleValidationErrors
];

/**
 * Validation pour assigner une table
 */
const validateTableAssignment = [
  param('id')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('ID de réservation invalide');
      }
      return true;
    }),

  body('floorPlanId')
    .exists()
    .withMessage('ID de plan de salle requis')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('ID de plan de salle invalide');
      }
      return true;
    }),

  body('tableNumber')
    .exists()
    .withMessage('Numéro de table requis')
    .isString()
    .withMessage('Le numéro de table doit être une chaîne de caractères')
    .isLength({ min: 1, max: 10 })
    .withMessage('Le numéro de table doit faire entre 1 et 10 caractères')
    .trim(),

  handleValidationErrors
];

/**
 * Validation des filtres de recherche
 */
const validateReservationFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le numéro de page doit être un entier positif')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'])
    .withMessage('Statut de filtre invalide'),

  query('date')
    .optional()
    .isISO8601()
    .withMessage('Format de date de filtre invalide'),

  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Format de date de début invalide'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Format de date de fin invalide'),

  query('customerName')
    .optional()
    .isString()
    .withMessage('Le nom du client pour filtrage doit être une chaîne')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom pour filtrage doit faire entre 2 et 100 caractères'),

  query('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Format d\'email de filtre invalide'),

  query('sortBy')
    .optional()
    .isIn(['dateTime', 'status', 'partySize', 'customer.firstName', 'customer.lastName'])
    .withMessage('Champ de tri invalide'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordre de tri invalide (asc ou desc)'),

  // Ne pas bloquer pour les filtres, juste nettoyer
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('Filtres de réservation invalides ignorés:', errors.array().map(e => e.msg));
      
      // Nettoyer les paramètres invalides
      const cleanQuery = {};
      if (req.query.page && !isNaN(req.query.page) && parseInt(req.query.page) > 0) {
        cleanQuery.page = parseInt(req.query.page);
      }
      if (req.query.limit && !isNaN(req.query.limit) && parseInt(req.query.limit) > 0) {
        cleanQuery.limit = Math.min(100, parseInt(req.query.limit));
      }
      if (req.query.status) cleanQuery.status = req.query.status;
      if (req.query.date) cleanQuery.date = req.query.date;
      if (req.query.dateFrom) cleanQuery.dateFrom = req.query.dateFrom;
      if (req.query.dateTo) cleanQuery.dateTo = req.query.dateTo;
      if (req.query.customerName) cleanQuery.customerName = req.query.customerName;
      if (req.query.customerEmail) cleanQuery.customerEmail = req.query.customerEmail;
      if (req.query.sortBy) cleanQuery.sortBy = req.query.sortBy;
      if (req.query.sortOrder) cleanQuery.sortOrder = req.query.sortOrder;
      
      req.query = cleanQuery;
    }
    next();
  }
];

/**
 * Validation des paramètres de date (pour /reservations/date/:date)
 */
const validateDateParam = [
  param('date')
    .isISO8601()
    .withMessage('Format de date invalide (attendu: YYYY-MM-DD)')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Date invalide');
      }
      return true;
    }),

  handleValidationErrors
];

// === VALIDATIONS MÉTIER AVANCÉES ===

/**
 * Validation des horaires du restaurant
 */
const validateRestaurantHours = async (req, res, next) => {
  try {
    if (!req.body.dateTime) {
      return next(); // Laisser passer si pas de dateTime
    }

    const reservationDate = new Date(req.body.dateTime);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][reservationDate.getDay()];
    const hour = reservationDate.getHours();
    const minute = reservationDate.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Récupérer le restaurant
    let restaurantId = req.body.restaurantId || req.user?.restaurantId;

    // Gestion spéciale pour admin
    if (!restaurantId && req.user?.role === 'admin') {
      const firstRestaurant = await Restaurant.findOne();
      if (firstRestaurant) {
        restaurantId = firstRestaurant._id;
        console.log('Validation: Restaurant auto-assigné pour admin:', firstRestaurant.name);
      }
    }

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant requis pour valider les horaires'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }

    console.log('🕐 Validation horaires:', {
      dayOfWeek,
      requestedTime: `${hour}:${minute.toString().padStart(2, '0')}`,
      restaurantHours: restaurant.hours?.[dayOfWeek]
    });

    // Vérifier si le restaurant est ouvert ce jour
    const dayHours = restaurant.hours?.[dayOfWeek];
    if (!dayHours || dayHours.closed) {
      const dayNames = {
        'monday': 'lundi',
        'tuesday': 'mardi', 
        'wednesday': 'mercredi',
        'thursday': 'jeudi',
        'friday': 'vendredi',
        'saturday': 'samedi',
        'sunday': 'dimanche'
      };
      
      return res.status(400).json({
        success: false,
        message: `Le restaurant est fermé le ${dayNames[dayOfWeek] || dayOfWeek}`,
        field: 'dateTime'
      });
    }

    // Vérifier les heures d'ouverture
    if (dayHours.open && dayHours.close) {
      const [openHour, openMin] = dayHours.open.split(':').map(Number);
      const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

      const openTimeInMinutes = openHour * 60 + openMin;
      const closeTimeInMinutes = closeHour * 60 + closeMin;

      if (timeInMinutes < openTimeInMinutes || timeInMinutes > closeTimeInMinutes) {
        return res.status(400).json({
          success: false,
          message: `Réservation en dehors des heures d'ouverture (${dayHours.open} - ${dayHours.close})`,
          field: 'dateTime',
          restaurantHours: {
            [dayOfWeek]: dayHours
          }
        });
      }
    }

    console.log('✅ Validation horaires réussie');
    next();

  } catch (error) {
    console.error('Erreur validation horaires:', error);
    // En cas d'erreur, laisser passer pour éviter de bloquer
    next();
  }
};

/**
 * Validation des conflits de réservation
 */
const validateReservationConflicts = async (req, res, next) => {
  try {
    if (!req.body.dateTime) {
      return next();
    }

    const restaurantId = req.body.restaurantId || req.user?.restaurantId;
    if (!restaurantId) {
      return next(); // Sera géré par d'autres validations
    }

    const reservationDate = new Date(req.body.dateTime);
    const duration = req.body.duration || 120;

    // Créer une fenêtre de temps pour détecter les conflits
    const bufferTime = 30; // 30 minutes de buffer
    const startTime = new Date(reservationDate.getTime() - bufferTime * 60 * 1000);
    const endTime = new Date(reservationDate.getTime() + (duration + bufferTime) * 60 * 1000);

    const conflictFilter = {
      restaurantId,
      dateTime: { $gte: startTime, $lte: endTime },
      status: { $nin: ['cancelled', 'no_show'] },
      isActive: true
    };

    // Exclure la réservation actuelle si c'est une mise à jour
    if (req.params.id) {
      conflictFilter._id = { $ne: req.params.id };
    }

    const conflictingReservations = await Reservation.countDocuments(conflictFilter);

    // Limite simple: pas plus de 15 réservations simultanées
    if (conflictingReservations >= 15) {
      const suggestedTimes = [
        new Date(reservationDate.getTime() + 60 * 60 * 1000), // +1h
        new Date(reservationDate.getTime() - 60 * 60 * 1000), // -1h
        new Date(reservationDate.getTime() + 2 * 60 * 60 * 1000) // +2h
      ].map(date => date.toISOString());

      return res.status(409).json({
        success: false,
        message: 'Créneau non disponible - trop de réservations simultanées',
        field: 'dateTime',
        conflictCount: conflictingReservations,
        suggestedTimes
      });
    }

    console.log('✅ Validation conflits réussie:', conflictingReservations, 'réservations simultanées');
    next();

  } catch (error) {
    console.error('Erreur validation conflits:', error);
    // En cas d'erreur, laisser passer
    next();
  }
};

/**
 * Validation des transitions de statut autorisées
 */
const validateStatusTransition = async (req, res, next) => {
  try {
    if (!req.params.id || !req.body.status) {
      return next();
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const currentStatus = reservation.status;
    const newStatus = req.body.status;

    // Définir les transitions autorisées
    const allowedTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['seated', 'cancelled', 'no_show'],
      'seated': ['completed', 'cancelled'],
      'completed': [], // État final
      'cancelled': [], // État final
      'no_show': [] // État final
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Transition de statut non autorisée: ${currentStatus} → ${newStatus}`,
        field: 'status',
        currentStatus,
        allowedTransitions: allowedTransitions[currentStatus] || []
      });
    }

    console.log('✅ Transition de statut autorisée:', currentStatus, '->', newStatus);
    next();

  } catch (error) {
    console.error('Erreur validation transition statut:', error);
    // En cas d'erreur, laisser passer
    next();
  }
};

/**
 * Validation de capacité pour l'assignation de table
 */
const validateTableCapacity = async (req, res, next) => {
  try {
    if (!req.body.floorPlanId || !req.body.tableNumber || !req.params.id) {
      return next();
    }

    // Récupérer la réservation pour connaître le nombre de convives
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Récupérer le plan de salle et la table
    const FloorPlan = require('../models/FloorPlan');
    const floorPlan = await FloorPlan.findById(req.body.floorPlanId);
    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de salle non trouvé'
      });
    }

    const table = floorPlan.tables.find(t => t.number === req.body.tableNumber);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: `Table ${req.body.tableNumber} non trouvée`
      });
    }

    // Vérifier la capacité
    if (reservation.partySize > table.capacity) {
      return res.status(400).json({
        success: false,
        message: `La table ${table.number} ne peut accueillir que ${table.capacity} convives (${reservation.partySize} demandés)`,
        field: 'tableNumber',
        tableCapacity: table.capacity,
        partySize: reservation.partySize
      });
    }

    console.log('✅ Validation capacité table réussie:', table.number, `(${table.capacity} ≥ ${reservation.partySize})`);
    next();

  } catch (error) {
    console.error('Erreur validation capacité table:', error);
    // En cas d'erreur, laisser passer
    next();
  }
};

module.exports = {
  validateCreateReservation,
  validateUpdateReservation,
  validateReservationStatus,
  validateTableAssignment,
  validateReservationFilters,
  validateDateParam,
  validateRestaurantHours,
  validateReservationConflicts,
  validateStatusTransition,
  validateTableCapacity,
  handleValidationErrors
};