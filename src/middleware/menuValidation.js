const Joi = require('joi');

// Schéma de validation pour une variante de prix
const priceVariantSchema = Joi.object({
  size: Joi.string()
    .required()
    .max(50)
    .messages({
      'string.empty': 'La taille/format est requis',
      'string.max': 'La taille ne peut dépasser 50 caractères',
      'any.required': 'La taille/format est requis'
    }),
  
  price: Joi.number()
    .required()
    .min(0)
    .precision(2)
    .messages({
      'number.base': 'Le prix doit être un nombre',
      'number.min': 'Le prix ne peut être négatif',
      'any.required': 'Le prix est requis'
    }),
  
  isDefault: Joi.boolean().default(false)
});

// Schéma de validation pour un ingrédient
const ingredientSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'string.empty': 'Le nom de l\'ingrédient est requis',
      'string.max': 'Le nom ne peut dépasser 100 caractères',
      'any.required': 'Le nom de l\'ingrédient est requis'
    }),
  
  isAllergen: Joi.boolean().default(false),
  
  allergenType: Joi.string()
    .valid('gluten', 'dairy', 'nuts', 'eggs', 'fish', 'shellfish', 'soy', 'sesame', 'other')
    .when('isAllergen', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Type d\'allergène invalide',
      'any.required': 'Le type d\'allergène est requis si l\'ingrédient est un allergène'
    })
});

// Validation pour créer un item de menu
const validateCreateMenuItem = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .required()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'Le nom de l\'item est requis',
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut dépasser 100 caractères',
        'any.required': 'Le nom de l\'item est requis'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La description ne peut dépasser 500 caractères'
      }),
    
    shortDescription: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'La description courte ne peut dépasser 100 caractères'
      }),
    
    category: Joi.string()
      .required()
      .valid(
        'appetizers', 'salads', 'mains', 'sides', 'desserts', 'cheeses',
        'wines_red', 'wines_white', 'wines_rose', 'wines_sparkling',
        'cocktails', 'mocktails', 'beers', 'hot_drinks', 'cold_drinks',
        'spirits', 'digestifs', 'aperitifs'
      )
      .messages({
        'any.only': 'Catégorie invalide',
        'any.required': 'La catégorie est requise'
      }),
    
    subcategory: Joi.string()
      .trim()
      .max(50)
      .optional()
      .messages({
        'string.max': 'La sous-catégorie ne peut dépasser 50 caractères'
      }),
    
    priceVariants: Joi.array()
      .items(priceVariantSchema)
      .min(1)
      .required()
      .custom((value, helpers) => {
        // Vérifier qu'il n'y a qu'une seule variante par défaut
        const defaultVariants = value.filter(v => v.isDefault);
        if (defaultVariants.length > 1) {
          return helpers.error('custom.multipleDefaults');
        }
        
        // Si aucune variante par défaut, définir la première comme défaut
        if (defaultVariants.length === 0 && value.length > 0) {
          value[0].isDefault = true;
        }
        
        return value;
      })
      .messages({
        'array.min': 'Au moins une variante de prix est requise',
        'any.required': 'Les variantes de prix sont requises',
        'custom.multipleDefaults': 'Une seule variante peut être définie par défaut'
      }),
    
    ingredients: Joi.array()
      .items(ingredientSchema)
      .optional(),
    
    dietary: Joi.object({
      isVegetarian: Joi.boolean().default(false),
      isVegan: Joi.boolean().default(false),
      isGlutenFree: Joi.boolean().default(false),
      isOrganic: Joi.boolean().default(false),
      isSpicy: Joi.boolean().default(false),
      spicyLevel: Joi.number()
        .integer()
        .min(0)
        .max(5)
        .default(0)
        .messages({
          'number.integer': 'Le niveau d\'épice doit être un entier',
          'number.min': 'Le niveau d\'épice doit être entre 0 et 5',
          'number.max': 'Le niveau d\'épice doit être entre 0 et 5'
        })
    }).optional(),
    
    nutrition: Joi.object({
      calories: Joi.number().min(0).optional(),
      protein: Joi.number().min(0).optional(),
      carbs: Joi.number().min(0).optional(),
      fat: Joi.number().min(0).optional(),
      alcohol: Joi.number().min(0).max(100).optional()
    }).optional(),
    
    images: Joi.array()
      .items(Joi.string().uri())
      .optional()
      .messages({
        'string.uri': 'Les URLs d\'images doivent être valides'
      }),
    
    tags: Joi.array()
      .items(Joi.string().max(50))
      .optional()
      .messages({
        'string.max': 'Les tags ne peuvent dépasser 50 caractères'
      }),
    
    availability: Joi.object({
      isAvailable: Joi.boolean().default(true),
      availableDays: Joi.array()
        .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
        .default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      availableTimeSlots: Joi.object({
        breakfast: Joi.boolean().default(false),
        lunch: Joi.boolean().default(true),
        dinner: Joi.boolean().default(true),
        brunch: Joi.boolean().default(false),
        allDay: Joi.boolean().default(true)
      }).optional(),
      seasonalStart: Joi.date().optional(),
      seasonalEnd: Joi.date().optional()
    }).optional(),
    
    inventory: Joi.object({
      hasInventory: Joi.boolean().default(false),
      currentStock: Joi.number().integer().min(0).default(0),
      lowStockThreshold: Joi.number().integer().min(0).default(5),
      isOutOfStock: Joi.boolean().default(false)
    }).optional(),
    
    displayOrder: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.integer': 'L\'ordre d\'affichage doit être un entier',
        'number.min': 'L\'ordre d\'affichage doit être positif'
      }),
    
    isActive: Joi.boolean().default(true),
    
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
  
  // Remplacer le body avec les valeurs validées et nettoyées
  req.body = value;
  next();
};

// Validation pour mettre à jour un item de menu
const validateUpdateMenuItem = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut dépasser 100 caractères'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La description ne peut dépasser 500 caractères'
      }),
    
    shortDescription: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'La description courte ne peut dépasser 100 caractères'
      }),
    
    category: Joi.string()
      .valid(
        'appetizers', 'salads', 'mains', 'sides', 'desserts', 'cheeses',
        'wines_red', 'wines_white', 'wines_rose', 'wines_sparkling',
        'cocktails', 'mocktails', 'beers', 'hot_drinks', 'cold_drinks',
        'spirits', 'digestifs', 'aperitifs'
      )
      .optional()
      .messages({
        'any.only': 'Catégorie invalide'
      }),
    
    subcategory: Joi.string()
      .trim()
      .max(50)
      .optional()
      .allow('')
      .messages({
        'string.max': 'La sous-catégorie ne peut dépasser 50 caractères'
      }),
    
    priceVariants: Joi.array()
      .items(priceVariantSchema)
      .min(1)
      .optional()
      .custom((value, helpers) => {
        if (value) {
          const defaultVariants = value.filter(v => v.isDefault);
          if (defaultVariants.length > 1) {
            return helpers.error('custom.multipleDefaults');
          }
          if (defaultVariants.length === 0 && value.length > 0) {
            value[0].isDefault = true;
          }
        }
        return value;
      })
      .messages({
        'array.min': 'Au moins une variante de prix est requise',
        'custom.multipleDefaults': 'Une seule variante peut être définie par défaut'
      }),
    
    ingredients: Joi.array()
      .items(ingredientSchema)
      .optional(),
    
    dietary: Joi.object({
      isVegetarian: Joi.boolean().optional(),
      isVegan: Joi.boolean().optional(),
      isGlutenFree: Joi.boolean().optional(),
      isOrganic: Joi.boolean().optional(),
      isSpicy: Joi.boolean().optional(),
      spicyLevel: Joi.number().integer().min(0).max(5).optional()
    }).optional(),
    
    nutrition: Joi.object({
      calories: Joi.number().min(0).optional(),
      protein: Joi.number().min(0).optional(),
      carbs: Joi.number().min(0).optional(),
      fat: Joi.number().min(0).optional(),
      alcohol: Joi.number().min(0).max(100).optional()
    }).optional(),
    
    images: Joi.array()
      .items(Joi.string().uri())
      .optional()
      .messages({
        'string.uri': 'Les URLs d\'images doivent être valides'
      }),
    
    tags: Joi.array()
      .items(Joi.string().max(50))
      .optional()
      .messages({
        'string.max': 'Les tags ne peuvent dépasser 50 caractères'
      }),
    
    availability: Joi.object({
      isAvailable: Joi.boolean().optional(),
      availableDays: Joi.array()
        .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
        .optional(),
      availableTimeSlots: Joi.object({
        breakfast: Joi.boolean().optional(),
        lunch: Joi.boolean().optional(),
        dinner: Joi.boolean().optional(),
        brunch: Joi.boolean().optional(),
        allDay: Joi.boolean().optional()
      }).optional(),
      seasonalStart: Joi.date().optional(),
      seasonalEnd: Joi.date().optional()
    }).optional(),
    
    inventory: Joi.object({
      hasInventory: Joi.boolean().optional(),
      currentStock: Joi.number().integer().min(0).optional(),
      lowStockThreshold: Joi.number().integer().min(0).optional(),
      isOutOfStock: Joi.boolean().optional()
    }).optional(),
    
    displayOrder: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.integer': 'L\'ordre d\'affichage doit être un entier',
        'number.min': 'L\'ordre d\'affichage doit être positif'
      }),
    
    isActive: Joi.boolean().optional()
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

// Validation pour les filtres de recherche
const validateSearchFilters = (req, res, next) => {
  const schema = Joi.object({
    q: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Le terme de recherche doit contenir au moins 2 caractères',
        'string.max': 'Le terme de recherche ne peut dépasser 100 caractères'
      }),
    
    category: Joi.string()
      .valid(
        'appetizers', 'salads', 'mains', 'sides', 'desserts', 'cheeses',
        'wines_red', 'wines_white', 'wines_rose', 'wines_sparkling',
        'cocktails', 'mocktails', 'beers', 'hot_drinks', 'cold_drinks',
        'spirits', 'digestifs', 'aperitifs'
      )
      .optional(),
    
    subcategory: Joi.string().max(50).optional(),
    
    isVegetarian: Joi.string().valid('true', 'false').optional(),
    isVegan: Joi.string().valid('true', 'false').optional(),
    isGlutenFree: Joi.string().valid('true', 'false').optional(),
    isOrganic: Joi.string().valid('true', 'false').optional(),
    
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    
    isAvailable: Joi.string().valid('true', 'false').default('true'),
    
    sortBy: Joi.string()
      .valid('name', 'price', 'displayOrder', 'category')
      .default('displayOrder')
      .optional(),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('asc')
      .optional(),
    
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
    
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
  
  // Validation croisée pour les prix
  if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
    return res.status(400).json({
      success: false,
      message: 'Le prix minimum ne peut être supérieur au prix maximum'
    });
  }
  
  req.query = value;
  next();
};

// Validation pour la mise à jour de disponibilité
const validateAvailabilityUpdate = (req, res, next) => {
  const schema = Joi.object({
    isAvailable: Joi.boolean().optional(),
    isOutOfStock: Joi.boolean().optional(),
    currentStock: Joi.number().integer().min(0).optional()
  }).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni'
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

// Validation pour la mise à jour des prix
const validatePriceUpdate = (req, res, next) => {
  const schema = Joi.object({
    priceVariants: Joi.array()
      .items(priceVariantSchema)
      .min(1)
      .required()
      .custom((value, helpers) => {
        const defaultVariants = value.filter(v => v.isDefault);
        if (defaultVariants.length > 1) {
          return helpers.error('custom.multipleDefaults');
        }
        if (defaultVariants.length === 0 && value.length > 0) {
          value[0].isDefault = true;
        }
        return value;
      })
      .messages({
        'array.min': 'Au moins une variante de prix est requise',
        'any.required': 'Les variantes de prix sont requises',
        'custom.multipleDefaults': 'Une seule variante peut être définie par défaut'
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

module.exports = {
  validateCreateMenuItem,
  validateUpdateMenuItem,
  validateSearchFilters,
  validateAvailabilityUpdate,
  validatePriceUpdate
};