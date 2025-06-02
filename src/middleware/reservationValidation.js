const Joi = require('joi');

// Validation pour créer une réservation
const validateCreateReservation = (req, res, next) => {
  const schema = Joi.object({
    customer: Joi.object({
      name: Joi.string()
        .required()
        .trim()
        .min(2)
        .max(100)
        .messages({
          'string.empty': 'Le nom du client est requis',
          'string.min': 'Le nom doit contenir au moins 2 caractères',
          'string.max': 'Le nom ne peut dépasser 100 caractères',
          'any.required': 'Le nom du client est requis'
        }),
      
      email: Joi.string()
        .required()
        .email()
        .lowercase()
        .messages({
          'string.email': 'Email invalide',
          'any.required': 'L\'email du client est requis'
        }),
      
      phone: Joi.string()
        .required()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(10)
        .max(20)
        .messages({
          'string.pattern.base': 'Numéro de téléphone invalide',
          'string.min': 'Le numéro doit contenir au moins 10 caractères',
          'string.max': 'Le numéro ne peut dépasser 20 caractères',
          'any.required': 'Le téléphone du client est requis'
        }),
      
      specialRequests: Joi.string()
        .max(300)
        .optional()
        .allow('')
        .messages({
          'string.max': 'Les demandes spéciales ne peuvent dépasser 300 caractères'
        })
    }).required(),
    
    dateTime: Joi.date()
      .required()
      .min('now')
      .messages({
        'date.min': 'La date de réservation doit être dans le futur',
        'any.required': 'La date et heure sont requises'
      }),
    
    duration: Joi.number()
      .integer()
      .min(30)
      .max(360)
      .default(120)
      .optional()
      .messages({
        'number.integer': 'La durée doit être un entier',
        'number.min': 'Durée minimum : 30 minutes',
        'number.max': 'Durée maximum : 6 heures'
      }),
    
    numberOfGuests: Joi.number()
      .integer()
      .required()
      .min(1)
      .max(50)
      .messages({
        'number.integer': 'Le nombre de convives doit être un entier',
        'number.min': 'Au moins 1 convive requis',
        'number.max': 'Maximum 50 convives',
        'any.required': 'Le nombre de convives est requis'
      }),
    
    preferences: Joi.object({
      seatingArea: Joi.string()
        .valid('indoor', 'outdoor', 'terrace', 'private', 'bar', 'no_preference')
        .default('no_preference')
        .optional(),
      
      tableType: Joi.string()
        .valid('round', 'square', 'rectangle', 'oval', 'no_preference')
        .default('no_preference')
        .optional(),
      
      accessibility: Joi.boolean()
        .default(false)
        .optional(),
      
      quiet: Joi.boolean()
        .default(false)
        .optional()
    }).optional(),
    
    internalNotes: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Les notes internes ne peuvent dépasser 500 caractères'
      }),
    
    restaurantId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'ID de restaurant invalide'
      })
  });
  
  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      field: error.details[0].path.join('.')
    });
  }
  
  req.body = value;
  next();
};

// Validation pour mettre à jour une réservation
const validateUpdateReservation = (req, res, next) => {
  const schema = Joi.object({
    customer: Joi.object({
      name: Joi.string().trim().min(2).max(100).optional(),
      email: Joi.string().email().lowercase().optional(),
      phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional(),
      specialRequests: Joi.string().max(300).optional().allow('')
    }).optional(),
    
    dateTime: Joi.date()
      .min('now')
      .optional()
      .messages({
        'date.min': 'La nouvelle date doit être dans le futur'
      }),
    
    duration: Joi.number()
      .integer()
      .min(30)
      .max(360)
      .optional(),
    
    numberOfGuests: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .optional(),
    
    preferences: Joi.object({
      seatingArea: Joi.string()
        .valid('indoor', 'outdoor', 'terrace', 'private', 'bar', 'no_preference')
        .optional(),
      tableType: Joi.string()
        .valid('round', 'square', 'rectangle', 'oval', 'no_preference')
        .optional(),
      accessibility: Joi.boolean().optional(),
      quiet: Joi.boolean().optional()
    }).optional(),
    
    internalNotes: Joi.string()
      .max(500)
      .optional()
      .allow('')
  });
  
  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      field: error.details[0].path.join('.')
    });
  }
  
  req.body = value;
  next();
};

// Validation pour changer le statut d'une réservation
const validateReservationStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')
      .required()
      .messages({
        'any.only': 'Statut invalide. Valeurs acceptées: pending, confirmed, seated, completed, cancelled, no_show',
        'any.required': 'Le statut est requis'
      }),
    
    reason: Joi.string()
      .max(200)
      .optional()
      .messages({
        'string.max': 'La raison ne peut dépasser 200 caractères'
      }),
    
    internalNotes: Joi.string()
      .max(500)
      .optional()
      .allow('')
  });
  
  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  
  req.body = value;
  next();
};

// Validation pour assigner une table
const validateTableAssignment = (req, res, next) => {
  const schema = Joi.object({
    floorPlanId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'ID de plan de salle invalide',
        'any.required': 'L\'ID du plan de salle est requis'
      }),
    
    tableId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'ID de table invalide',
        'any.required': 'L\'ID de la table est requis'
      })
  });
  
  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  
  req.body = value;
  next();
};

// Validation pour les filtres de recherche
const validateReservationFilters = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')
      .optional(),
    
    date: Joi.date()
      .iso()
      .optional(),
    
    dateFrom: Joi.date()
      .iso()
      .optional(),
    
    dateTo: Joi.date()
      .iso()
      .min(Joi.ref('dateFrom'))
      .optional()
      .messages({
        'date.min': 'La date de fin doit être postérieure à la date de début'
      }),
    
    customerName: Joi.string()
      .min(2)
      .optional(),
    
    customerEmail: Joi.string()
      .email()
      .optional(),
    
    customerPhone: Joi.string()
      .pattern(/^[0-9+\-\s()]+$/)
      .optional(),
    
    tableNumber: Joi.string()
      .max(10)
      .optional(),
    
    numberOfGuests: Joi.number()
      .integer()
      .min(1)
      .optional(),
    
    seatingArea: Joi.string()
      .valid('indoor', 'outdoor', 'terrace', 'private', 'bar')
      .optional(),
    
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional(),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional(),
    
    sortBy: Joi.string()
      .valid('dateTime', 'customer.name', 'status', 'numberOfGuests', 'createdAt')
      .default('dateTime')
      .optional(),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('asc')
      .optional(),
    
    restaurantId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'ID de restaurant invalide'
      })
  });
  
  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      field: error.details[0].path.join('.')
    });
  }
  
  req.query = value;
  next();
};

// Middleware pour valider les heures d'ouverture du restaurant
const validateRestaurantHours = async (req, res, next) => {
  try {
    const { dateTime } = req.body;
    if (!dateTime) return next();
    
    // Récupérer le restaurant
    const Restaurant = require('../models/Restaurant');
    const restaurantId = req.body.restaurantId || req.user.restaurantId;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    const reservationDate = new Date(dateTime);
    const dayOfWeek = reservationDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const daySchedule = restaurant.hours[dayOfWeek];
    
    if (!daySchedule || daySchedule.closed) {
      return res.status(400).json({
        success: false,
        message: `Le restaurant est fermé le ${dayOfWeek === 'monday' ? 'lundi' : 
                   dayOfWeek === 'tuesday' ? 'mardi' :
                   dayOfWeek === 'wednesday' ? 'mercredi' :
                   dayOfWeek === 'thursday' ? 'jeudi' :
                   dayOfWeek === 'friday' ? 'vendredi' :
                   dayOfWeek === 'saturday' ? 'samedi' : 'dimanche'}`
      });
    }
    
    const reservationTime = reservationDate.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (reservationTime < daySchedule.open || reservationTime > daySchedule.close) {
      return res.status(400).json({
        success: false,
        message: `Réservation impossible. Horaires d'ouverture: ${daySchedule.open} - ${daySchedule.close}`
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Erreur validation horaires restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation des horaires'
    });
  }
};

// Middleware pour vérifier les conflits de réservation
const validateReservationConflicts = async (req, res, next) => {
  try {
    const { dateTime, duration = 120, numberOfGuests } = req.body;
    if (!dateTime) return next();
    
    const Reservation = require('../models/Reservation');
    const restaurantId = req.body.restaurantId || req.user.restaurantId;
    const excludeId = req.params.id || null;
    
    // Vérifier les conflits généraux
    const conflicts = await Reservation.findConflicts(
      restaurantId, 
      dateTime, 
      duration, 
      excludeId
    );
    
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c => ({
        reservationNumber: c.reservationNumber,
        customerName: c.customer.name,
        dateTime: c.dateTime,
        duration: c.duration,
        guests: c.numberOfGuests
      }));
      
      return res.status(409).json({
        success: false,
        message: `Conflit détecté avec ${conflicts.length} réservation(s) existante(s)`,
        conflicts: conflictDetails
      });
    }
    
    // Vérifier la capacité du restaurant (optionnel)
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (restaurant && restaurant.capacity && restaurant.capacity.seatingCapacity) {
      // Calculer la charge à cette heure
      const startTime = new Date(dateTime);
      const endTime = new Date(startTime.getTime() + (duration * 60000));
      
      const overlappingReservations = await Reservation.find({
        restaurantId,
        status: { $in: ['confirmed', 'seated'] },
        isActive: true,
        $or: [
          {
            dateTime: { $lte: startTime },
            $expr: {
              $gte: [
                { $add: ['$dateTime', { $multiply: ['$duration', 60000] }] },
                startTime
              ]
            }
          },
          {
            dateTime: { $gte: startTime, $lt: endTime }
          }
        ],
        ...(excludeId && { _id: { $ne: excludeId } })
      });
      
      const totalGuests = overlappingReservations.reduce((sum, r) => sum + r.numberOfGuests, 0) + numberOfGuests;
      
      if (totalGuests > restaurant.capacity.seatingCapacity) {
        return res.status(409).json({
          success: false,
          message: `Capacité insuffisante. Maximum: ${restaurant.capacity.seatingCapacity}, Demandé: ${totalGuests}`
        });
      }
    }
    
    next();
    
  } catch (error) {
    console.error('Erreur validation conflits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation des conflits'
    });
  }
};

// Middleware pour valider les transitions de statut
const validateStatusTransition = async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;
    if (!newStatus) return next();
    
    const Reservation = require('../models/Reservation');
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    const currentStatus = reservation.status;
    
    // Définir les transitions valides
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['seated', 'cancelled', 'no_show'],
      seated: ['completed', 'cancelled'],
      completed: [], // État final
      cancelled: [], // État final
      no_show: [] // État final
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Transition invalide de "${currentStatus}" vers "${newStatus}"`,
        validTransitions: validTransitions[currentStatus]
      });
    }
    
    // Vérifications spéciales
    if (newStatus === 'seated' && !reservation.assignedTable.tableId) {
      return res.status(400).json({
        success: false,
        message: 'Une table doit être assignée avant d\'installer les clients'
      });
    }
    
    req.currentReservation = reservation;
    next();
    
  } catch (error) {
    console.error('Erreur validation transition statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation de transition'
    });
  }
};

module.exports = {
  validateCreateReservation,
  validateUpdateReservation,
  validateReservationStatus,
  validateTableAssignment,
  validateReservationFilters,
  validateRestaurantHours,
  validateReservationConflicts,
  validateStatusTransition
};