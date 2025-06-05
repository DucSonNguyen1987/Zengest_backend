

const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: `Validation échouée: ${firstError.msg}`,
      field: firstError.param,
      value: firstError.value,
      errors: errors.array()
    });
  }
  next();
};

// Validation création commande - ASSOUPLIE
const validateCreateOrder = [
  // FloorPlanId OPTIONNEL - sera géré dans le contrôleur
  body('floorPlanId')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Format floorPlanId invalide');
      }
      return true;
    })
    .withMessage('FloorPlanId doit être un ObjectId valide'),

  // TableNumber/TableId flexible
  body('tableNumber')
    .optional()
    .isString()
    .trim()
    .withMessage('TableNumber doit être une chaîne'),

  body('tableId')
    .optional()
    .isString()
    .trim()
    .withMessage('TableId doit être une chaîne'),

  // Customer flexible - soit name, soit firstName/lastName
  body('customer')
    .isObject()
    .withMessage('Informations client requises'),

  body('customer.name')
    .if(body('customer.firstName').not().exists())
    .notEmpty()
    .withMessage('Nom client requis si firstName non fourni'),

  body('customer.firstName')
    .if(body('customer.name').not().exists())
    .notEmpty()
    .withMessage('Prénom requis si name non fourni'),

  body('customer.email')
    .optional()
    .isEmail()
    .withMessage('Email invalide'),

  body('customer.phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Téléphone invalide'),

  // Items - validation basique
  body('items')
    .isArray({ min: 1 })
    .withMessage('Au moins un article requis'),

  body('items.*.menuItem')
    .isMongoId()
    .withMessage('ID menu invalide'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantité entre 1 et 20'),

  body('items.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prix doit être positif'),

  // AssignedServer optionnel
  body('assignedServer')
    .optional()
    .isMongoId()
    .withMessage('ID serveur invalide'),

  // Status optionnel avec valeur par défaut
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'])
    .withMessage('Statut invalide'),

  // Priority optionnel
  body('priority')
    .optional()
    .isIn(['normal', 'urgent', 'low'])
    .withMessage('Priorité invalide'),

  handleValidationErrors
];

// Validation mise à jour commande - TRÈS PERMISSIVE
const validateUpdateOrder = [
  param('id')
    .isMongoId()
    .withMessage('ID commande invalide'),

  // Tous les champs optionnels pour update
  body('customer')
    .optional()
    .isObject(),

  body('items')
    .optional()
    .isArray(),

  body('assignedServer')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true; // Permettre null/vide
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('ID serveur invalide'),

  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled']),

  body('priority')
    .optional()
    .isIn(['normal', 'urgent', 'low']),

  handleValidationErrors
];

// Validation changement statut - SIMPLE
const validateOrderStatus = [
  param('id')
    .isMongoId()
    .withMessage('ID commande invalide'),

  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'])
    .withMessage('Statut invalide'),

  body('reason')
    .optional()
    .isString()
    .trim()
    .withMessage('Raison doit être une chaîne'),

  handleValidationErrors
];

// Validation ajout d'article - BASIQUE
const validateAddItem = [
  param('id')
    .isMongoId()
    .withMessage('ID commande invalide'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Articles requis'),

  body('items.*.menuItem')
    .isMongoId()
    .withMessage('ID menu invalide'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantité entre 1 et 20'),

  handleValidationErrors
];

// Validation paiement - PERMISSIVE
const validatePayment = [
  param('id')
    .isMongoId()
    .withMessage('ID commande invalide'),

  body('method')
    .isIn(['cash', 'card', 'online', 'mixed'])
    .withMessage('Méthode paiement invalide'),

  body('reference')
    .optional()
    .isString()
    .trim(),

  body('tip')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Pourboire doit être positif'),

  handleValidationErrors
];

// Validation filtres - TRÈS PERMISSIVE
const validateOrderFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page doit être >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite entre 1 et 100'),

  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled']),

  query('assignedServer')
    .optional()
    .custom((value) => {
      if (!value) return true; // Permettre vide
      return mongoose.Types.ObjectId.isValid(value);
    }),

  query('tableNumber')
    .optional()
    .isString()
    .trim(),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Date début invalide'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Date fin invalide'),

  handleValidationErrors
];

// Validation transition de statut - LOGIQUE MÉTIER
const validateStatusTransition = async (req, res, next) => {
  try {
    const { status } = req.body;
    const Order = require('../models/Order');
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Transitions autorisées (logique souple)
    const allowedTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['served', 'cancelled'],
      'served': ['paid'],
      'paid': [], // État final
      'cancelled': [] // État final
    };

    const currentStatus = order.status;
    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(status)) {
      console.warn(`Transition ${currentStatus} -> ${status} non recommandée mais autorisée`);
      // Ne pas bloquer, juste avertir
    }

    next();
  } catch (error) {
    console.error('Erreur validation transition:', error);
    // Ne pas bloquer en cas d'erreur de validation
    next();
  }
};

module.exports = {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderStatus,
  validateAddItem,
  validatePayment,
  validateOrderFilters,
  validateStatusTransition,
  handleValidationErrors
};