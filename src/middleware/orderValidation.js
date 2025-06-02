const Joi = require('joi');
const { ORDER_STATUS } = require('../utils/constants');

// Schéma de validation pour un item de commande
const orderItemSchema = Joi.object({
  menuItem: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'ID d\'item de menu invalide',
      'any.required': 'L\'item de menu est requis'
    }),
  
  selectedVariant: Joi.object({
    size: Joi.string()
      .required()
      .max(50)
      .messages({
        'string.max': 'La taille ne peut dépasser 50 caractères',
        'any.required': 'La taille est requise'
      }),
    price: Joi.number()
      .required()
      .min(0)
      .precision(2)
      .messages({
        'number.min': 'Le prix ne peut être négatif',
        'any.required': 'Le prix est requis'
      })
  }).required(),
  
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .required()
    .messages({
      'number.integer': 'La quantité doit être un entier',
      'number.min': 'La quantité doit être d\'au moins 1',
      'number.max': 'La quantité ne peut dépasser 50',
      'any.required': 'La quantité est requise'
    }),
  
  notes: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Les notes ne peuvent dépasser 200 caractères'
    }),
  
  modifications: Joi.array()
    .items(Joi.string().max(100))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 modifications par item'
    })
});

// Validation pour créer une commande
const validateCreateOrder = (req, res, next) => {
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
      }),
    
    items: Joi.array()
      .items(orderItemSchema)
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'Au moins un item est requis',
        'array.max': 'Maximum 50 items par commande',
        'any.required': 'Les items sont requis'
      }),
    
    customer: Joi.object({
      name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
          'string.min': 'Le nom doit contenir au moins 2 caractères',
          'string.max': 'Le nom ne peut dépasser 100 caractères'
        }),
      
      phone: Joi.string()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(10)
        .max(20)
        .optional()
        .messages({
          'string.pattern.base': 'Numéro de téléphone invalide',
          'string.min': 'Le numéro doit contenir au moins 10 caractères',
          'string.max': 'Le numéro ne peut dépasser 20 caractères'
        }),
      
      email: Joi.string()
        .email()
        .optional()
        .messages({
          'string.email': 'Email invalide'
        }),
      
      numberOfGuests: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .required()
        .messages({
          'number.integer': 'Le nombre de convives doit être un entier',
          'number.min': 'Au moins 1 convive requis',
          'number.max': 'Maximum 50 convives',
          'any.required': 'Le nombre de convives est requis'
        })
    }).required(),
    
    notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Les notes ne peuvent dépasser 500 caractères'
      }),
    
    service: Joi.object({
      estimatedTime: Joi.number()
        .integer()
        .min(5)
        .max(300)
        .optional()
        .messages({
          'number.integer': 'Le temps estimé doit être un entier',
          'number.min': 'Minimum 5 minutes',
          'number.max': 'Maximum 300 minutes (5h)'
        }),
      
      priority: Joi.string()
        .valid('low', 'normal', 'high', 'urgent')
        .default('normal')
        .optional()
    }).optional(),
    
    pricing: Joi.object({
      tax: Joi.object({
        rate: Joi.number().min(0).max(100).default(20)
      }).optional(),
      
      service: Joi.object({
        rate: Joi.number().min(0).max(100).default(0)
      }).optional(),
      
      discount: Joi.object({
        type: Joi.string().valid('percentage', 'amount').default('percentage'),
        value: Joi.number().min(0).default(0),
        reason: Joi.string().max(200).optional()
      }).optional()
    }).optional(),
    
    metadata: Joi.object({
      source: Joi.string()
        .valid('tablet', 'pos', 'mobile', 'web', 'phone')
        .default('tablet'),
      language: Joi.string()
        .valid('fr', 'en', 'es', 'de')
        .default('fr')
    }).optional(),
    
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

// Validation pour mettre à jour une commande
const validateUpdateOrder = (req, res, next) => {
  const schema = Joi.object({
    items: Joi.array()
      .items(orderItemSchema)
      .min(1)
      .max(50)
      .optional()
      .messages({
        'array.min': 'Au moins un item est requis',
        'array.max': 'Maximum 50 items par commande'
      }),
    
    customer: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional(),
      email: Joi.string().email().optional(),
      numberOfGuests: Joi.number().integer().min(1).max(50).optional()
    }).optional(),
    
    notes: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    
    service: Joi.object({
      assignedServer: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
          'string.pattern.base': 'ID de serveur invalide'
        }),
      estimatedTime: Joi.number().integer().min(5).max(300).optional(),
      priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
    }).optional(),
    
    pricing: Joi.object({
      tax: Joi.object({
        rate: Joi.number().min(0).max(100)
      }).optional(),
      service: Joi.object({
        rate: Joi.number().min(0).max(100)
      }).optional(),
      discount: Joi.object({
        type: Joi.string().valid('percentage', 'amount'),
        value: Joi.number().min(0),
        reason: Joi.string().max(200).optional()
      }).optional()
    }).optional()
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

// Validation pour changer le statut d'une commande
const validateOrderStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(...Object.values(ORDER_STATUS))
      .required()
      .messages({
        'any.only': `Statut invalide. Valeurs acceptées: ${Object.values(ORDER_STATUS).join(', ')}`,
        'any.required': 'Le statut est requis'
      }),
    
    reason: Joi.string()
      .max(200)
      .optional()
      .messages({
        'string.max': 'La raison ne peut dépasser 200 caractères'
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

// Validation pour ajouter un item à une commande existante
const validateAddItem = (req, res, next) => {
  const schema = Joi.object({
    items: Joi.array()
      .items(orderItemSchema)
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': 'Au moins un item est requis',
        'array.max': 'Maximum 10 items à ajouter en une fois',
        'any.required': 'Les items sont requis'
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

// Validation pour le paiement
const validatePayment = (req, res, next) => {
  const schema = Joi.object({
    method: Joi.string()
      .valid('cash', 'card', 'mobile', 'voucher', 'split')
      .required()
      .messages({
        'any.only': 'Méthode de paiement invalide',
        'any.required': 'La méthode de paiement est requise'
      }),
    
    reference: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'La référence ne peut dépasser 100 caractères'
      }),
    
    splits: Joi.array()
      .items(Joi.object({
        method: Joi.string().valid('cash', 'card', 'mobile', 'voucher').required(),
        amount: Joi.number().min(0.01).precision(2).required(),
        reference: Joi.string().max(100).optional()
      }))
      .when('method', {
        is: 'split',
        then: Joi.required().min(2).max(5),
        otherwise: Joi.forbidden()
      })
      .messages({
        'array.min': 'Au moins 2 méthodes requises pour un paiement fractionné',
        'array.max': 'Maximum 5 méthodes pour un paiement fractionné'
      }),
    
    tip: Joi.number()
      .min(0)
      .precision(2)
      .optional()
      .messages({
        'number.min': 'Le pourboire ne peut être négatif'
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
const validateOrderFilters = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(...Object.values(ORDER_STATUS))
      .optional(),
    
    tableNumber: Joi.string()
      .max(10)
      .optional(),
    
    assignedServer: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'ID de serveur invalide'
      }),
    
    priority: Joi.string()
      .valid('low', 'normal', 'high', 'urgent')
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
    
    minAmount: Joi.number()
      .min(0)
      .precision(2)
      .optional(),
    
    maxAmount: Joi.number()
      .min(0)
      .precision(2)
      .min(Joi.ref('minAmount'))
      .optional()
      .messages({
        'number.min': 'Le montant maximum doit être supérieur au minimum'
      }),
    
    customerPhone: Joi.string()
      .pattern(/^[0-9+\-\s()]+$/)
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
      .valid('orderNumber', 'status', 'total', 'ordered', 'priority')
      .default('ordered')
      .optional(),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
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

// Middleware pour valider la cohérence des transitions de statut
const validateStatusTransition = async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;
    const orderId = req.params.id;
    
    const Order = require('../models/Order');
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    const currentStatus = order.status;
    
    // Définir les transitions valides
    const validTransitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED, ORDER_STATUS.PREPARING], // Retour possible
      [ORDER_STATUS.SERVED]: [ORDER_STATUS.PAID],
      [ORDER_STATUS.PAID]: [], // État final
      [ORDER_STATUS.CANCELLED]: [] // État final
    };
    
    // Vérifier si la transition est valide
    if (!validTransitions[currentStatus].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Transition invalide de "${currentStatus}" vers "${newStatus}"`,
        validTransitions: validTransitions[currentStatus]
      });
    }
    
    // Ajouter l'ordre actuel à la requête pour utilisation dans le contrôleur
    req.currentOrder = order;
    next();
    
  } catch (error) {
    console.error('Erreur lors de la validation de transition:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la validation'
    });
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
  orderItemSchema
};