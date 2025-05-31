const Joi = require('joi');

// Validation pour une table
const tableValidationSchema = Joi.object({
  number: Joi.string()
    .trim()
    .required()
    .min(1)
    .max(10)
    .messages({
      'string.empty': 'Le numéro de table est requis',
      'string.min': 'Le numéro de table doit contenir au moins 1 caractère',
      'string.max': 'Le numéro de table ne peut dépasser 10 caractères',
      'any.required': 'Le numéro de table est requis'
    }),
  
  capacity: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .required()
    .messages({
      'number.base': 'La capacité doit être un nombre',
      'number.integer': 'La capacité doit être un nombre entier',
      'number.min': 'La capacité doit être d\'au moins 1 personne',
      'number.max': 'La capacité ne peut dépasser 20 personnes',
      'any.required': 'La capacité est requise'
    }),
  
  shape: Joi.string()
    .valid('round', 'square', 'rectangle', 'oval')
    .default('round')
    .messages({
      'any.only': 'La forme doit être: round, square, rectangle ou oval'
    }),
  
  position: Joi.object({
    x: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'La position X doit être un nombre',
        'number.min': 'La position X doit être positive',
        'any.required': 'La position X est requise'
      }),
    y: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'La position Y doit être un nombre',
        'number.min': 'La position Y doit être positive',
        'any.required': 'La position Y est requise'
      })
  }).required(),
  
  rotation: Joi.number()
    .min(0)
    .max(360)
    .default(0)
    .messages({
      'number.base': 'La rotation doit être un nombre',
      'number.min': 'La rotation doit être entre 0 et 360 degrés',
      'number.max': 'La rotation doit être entre 0 et 360 degrés'
    }),
  
  dimensions: Joi.object({
    width: Joi.number()
      .min(20)
      .required()
      .messages({
        'number.base': 'La largeur doit être un nombre',
        'number.min': 'La largeur minimum est 20cm',
        'any.required': 'La largeur est requise'
      }),
    height: Joi.number()
      .min(20)
      .required()
      .messages({
        'number.base': 'La hauteur doit être un nombre',
        'number.min': 'La hauteur minimum est 20cm',
        'any.required': 'La hauteur est requise'
      })
  }).required(),
  
  status: Joi.string()
    .valid('available', 'occupied', 'reserved', 'cleaning', 'out_of_order')
    .default('available'),
  
  isActive: Joi.boolean().default(true)
});

// Validation pour un obstacle
const obstacleValidationSchema = Joi.object({
  type: Joi.string()
    .valid('wall', 'column', 'bar', 'kitchen_door', 'entrance', 'window', 'decoration', 'other')
    .required()
    .messages({
      'any.only': 'Type d\'obstacle invalide',
      'any.required': 'Le type d\'obstacle est requis'
    }),
  
  name: Joi.string()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Le nom ne peut dépasser 50 caractères'
    }),
  
  position: Joi.object({
    x: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'La position X doit être un nombre',
        'number.min': 'La position X doit être positive',
        'any.required': 'La position X est requise'
      }),
    y: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'La position Y doit être un nombre',
        'number.min': 'La position Y doit être positive',
        'any.required': 'La position Y est requise'
      })
  }).required(),
  
  dimensions: Joi.object({
    width: Joi.number()
      .min(1)
      .required()
      .messages({
        'number.base': 'La largeur doit être un nombre',
        'number.min': 'La largeur minimum est 1cm',
        'any.required': 'La largeur est requise'
      }),
    height: Joi.number()
      .min(1)
      .required()
      .messages({
        'number.base': 'La hauteur doit être un nombre',
        'number.min': 'La hauteur minimum est 1cm',
        'any.required': 'La hauteur est requise'
      })
  }).required(),
  
  rotation: Joi.number()
    .min(0)
    .max(360)
    .default(0),
  
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .default('#808080')
    .messages({
      'string.pattern.base': 'Format de couleur invalide (ex: #FF0000)'
    }),
  
  isWalkable: Joi.boolean().default(false)
});

// Validation pour créer un plan de salle
const validateCreateFloorPlan = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .required()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'Le nom du plan de salle est requis',
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut dépasser 100 caractères',
        'any.required': 'Le nom du plan de salle est requis'
      }),
    
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La description ne peut dépasser 500 caractères'
      }),
    
    restaurantId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'ID de restaurant invalide'
      }),
    
    dimensions: Joi.object({
      width: Joi.number()
        .min(100)
        .required()
        .messages({
          'number.base': 'La largeur doit être un nombre',
          'number.min': 'La largeur minimum est 100cm',
          'any.required': 'La largeur du plan est requise'
        }),
      height: Joi.number()
        .min(100)
        .required()
        .messages({
          'number.base': 'La hauteur doit être un nombre',
          'number.min': 'La hauteur minimum est 100cm',
          'any.required': 'La hauteur du plan est requise'
        }),
      unit: Joi.string()
        .valid('cm', 'm', 'px')
        .default('cm')
    }).required(),
    
    tables: Joi.array()
      .items(tableValidationSchema)
      .default([])
      .custom((value, helpers) => {
        // Vérifier l'unicité des numéros de table
        const tableNumbers = value
          .filter(table => table.isActive !== false)
          .map(table => table.number);
        
        const uniqueNumbers = [...new Set(tableNumbers)];
        if (uniqueNumbers.length !== tableNumbers.length) {
          return helpers.error('custom.duplicateTableNumbers');
        }
        return value;
      })
      .messages({
        'custom.duplicateTableNumbers': 'Les numéros de table doivent être uniques'
      }),
    
    obstacles: Joi.array()
      .items(obstacleValidationSchema)
      .default([]),
    
    settings: Joi.object({
      backgroundColor: Joi.string()
        .pattern(/^#[0-9A-F]{6}$/i)
        .default('#FFFFFF')
        .messages({
          'string.pattern.base': 'Format de couleur invalide'
        }),
      gridSize: Joi.number()
        .min(1)
        .default(10)
        .messages({
          'number.min': 'La taille de grille minimum est 1'
        }),
      showGrid: Joi.boolean().default(true),
      snapToGrid: Joi.boolean().default(true)
    }).optional(),
    
    isActive: Joi.boolean().default(true),
    isDefault: Joi.boolean().default(false)
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      field: error.details[0].path.join('.')
    });
  }
  
  next();
};

// Validation pour mettre à jour un plan de salle
const validateUpdateFloorPlan = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    
    description: Joi.string()
      .max(500)
      .optional(),
    
    dimensions: Joi.object({
      width: Joi.number().min(100),
      height: Joi.number().min(100),
      unit: Joi.string().valid('cm', 'm', 'px')
    }).optional(),
    
    tables: Joi.array()
      .items(tableValidationSchema)
      .optional()
      .custom((value, helpers) => {
        if (value) {
          const tableNumbers = value
            .filter(table => table.isActive !== false)
            .map(table => table.number);
          
          const uniqueNumbers = [...new Set(tableNumbers)];
          if (uniqueNumbers.length !== tableNumbers.length) {
            return helpers.error('custom.duplicateTableNumbers');
          }
        }
        return value;
      })
      .messages({
        'custom.duplicateTableNumbers': 'Les numéros de table doivent être uniques'
      }),
    
    obstacles: Joi.array()
      .items(obstacleValidationSchema)
      .optional(),
    
    settings: Joi.object({
      backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
      gridSize: Joi.number().min(1),
      showGrid: Joi.boolean(),
      snapToGrid: Joi.boolean()
    }).optional(),
    
    isActive: Joi.boolean().optional(),
    isDefault: Joi.boolean().optional()
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      field: error.details[0].path.join('.')
    });
  }
  
  next();
};

// Validation pour mettre à jour le statut d'une table
const validateTableStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('available', 'occupied', 'reserved', 'cleaning', 'out_of_order')
      .required()
      .messages({
        'any.only': 'Statut invalide. Valeurs acceptées: available, occupied, reserved, cleaning, out_of_order',
        'any.required': 'Le statut est requis'
      })
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  
  next();
};

// Middleware de validation des collisions entre tables
const validateTableCollisions = (req, res, next) => {
  if (!req.body.tables || req.body.tables.length === 0) {
    return next();
  }
  
  const activeTables = req.body.tables.filter(table => table.isActive !== false);
  
  for (let i = 0; i < activeTables.length; i++) {
    for (let j = i + 1; j < activeTables.length; j++) {
      const table1 = activeTables[i];
      const table2 = activeTables[j];
      
      // Calculer la distance entre les centres des tables
      const distance = Math.sqrt(
        Math.pow(table1.position.x - table2.position.x, 2) + 
        Math.pow(table1.position.y - table2.position.y, 2)
      );
      
      // Calculer la distance minimum requise (rayons + espace de sécurité)
      const radius1 = Math.max(table1.dimensions.width, table1.dimensions.height) / 2;
      const radius2 = Math.max(table2.dimensions.width, table2.dimensions.height) / 2;
      const minDistance = radius1 + radius2 + 30; // 30cm d'espace minimum
      
      if (distance < minDistance) {
        return res.status(400).json({
          success: false,
          message: `Les tables ${table1.number} et ${table2.number} sont trop proches (distance minimum: ${Math.ceil(minDistance)}cm, actuelle: ${Math.ceil(distance)}cm)`
        });
      }
    }
  }
  
  next();
};

// Middleware pour valider que les tables sont dans les limites du plan
const validateTableBounds = (req, res, next) => {
  if (!req.body.tables || !req.body.dimensions) {
    return next();
  }
  
  const { width: planWidth, height: planHeight } = req.body.dimensions;
  const activeTables = req.body.tables.filter(table => table.isActive !== false);
  
  for (const table of activeTables) {
    const tableRight = table.position.x + table.dimensions.width / 2;
    const tableBottom = table.position.y + table.dimensions.height / 2;
    const tableLeft = table.position.x - table.dimensions.width / 2;
    const tableTop = table.position.y - table.dimensions.height / 2;
    
    if (tableLeft < 0 || tableTop < 0 || tableRight > planWidth || tableBottom > planHeight) {
      return res.status(400).json({
        success: false,
        message: `La table ${table.number} dépasse les limites du plan de salle (${planWidth}x${planHeight}cm)`
      });
    }
  }
  
  next();
};

// Validation des obstacles dans les limites du plan
const validateObstacleBounds = (req, res, next) => {
  if (!req.body.obstacles || !req.body.dimensions) {
    return next();
  }
  
  const { width: planWidth, height: planHeight } = req.body.dimensions;
  
  for (const obstacle of req.body.obstacles) {
    const obstacleRight = obstacle.position.x + obstacle.dimensions.width;
    const obstacleBottom = obstacle.position.y + obstacle.dimensions.height;
    
    if (obstacle.position.x < 0 || obstacle.position.y < 0 || 
        obstacleRight > planWidth || obstacleBottom > planHeight) {
      return res.status(400).json({
        success: false,
        message: `L'obstacle "${obstacle.name || obstacle.type}" dépasse les limites du plan de salle`
      });
    }
  }
  
  next();
};

// Validation des collisions entre tables et obstacles
const validateTableObstacleCollisions = (req, res, next) => {
  if (!req.body.tables || !req.body.obstacles) {
    return next();
  }
  
  const activeTables = req.body.tables.filter(table => table.isActive !== false);
  const nonWalkableObstacles = req.body.obstacles.filter(obstacle => !obstacle.isWalkable);
  
  for (const table of activeTables) {
    for (const obstacle of nonWalkableObstacles) {
      // Vérifier si la table et l'obstacle se chevauchent
      const tableLeft = table.position.x - table.dimensions.width / 2;
      const tableRight = table.position.x + table.dimensions.width / 2;
      const tableTop = table.position.y - table.dimensions.height / 2;
      const tableBottom = table.position.y + table.dimensions.height / 2;
      
      const obstacleLeft = obstacle.position.x;
      const obstacleRight = obstacle.position.x + obstacle.dimensions.width;
      const obstacleTop = obstacle.position.y;
      const obstacleBottom = obstacle.position.y + obstacle.dimensions.height;
      
      // Vérifier le chevauchement
      const isOverlapping = !(
        tableRight <= obstacleLeft || 
        tableLeft >= obstacleRight || 
        tableBottom <= obstacleTop || 
        tableTop >= obstacleBottom
      );
      
      if (isOverlapping) {
        return res.status(400).json({
          success: false,
          message: `La table ${table.number} chevauche avec l'obstacle "${obstacle.name || obstacle.type}"`
        });
      }
    }
  }
  
  next();
};

// Middleware combiné pour toutes les validations géométriques
const validateGeometry = (req, res, next) => {
  // Exécuter toutes les validations géométriques en séquence
  validateTableBounds(req, res, (err) => {
    if (err) return next(err);
    
    validateObstacleBounds(req, res, (err) => {
      if (err) return next(err);
      
      validateTableCollisions(req, res, (err) => {
        if (err) return next(err);
        
        validateTableObstacleCollisions(req, res, next);
      });
    });
  });
};

module.exports = {
  validateCreateFloorPlan,
  validateUpdateFloorPlan,
  validateTableStatus,
  validateTableCollisions,
  validateTableBounds,
  validateObstacleBounds,
  validateTableObstacleCollisions,
  validateGeometry,
  tableValidationSchema,
  obstacleValidationSchema
};