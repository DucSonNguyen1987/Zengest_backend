const Joi = require('joi');
const { USER_ROLES } = require('../utils/constants');

// Validation pour l'inscription
const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Le prénom doit contenir au moins 2 caractères',
        'string.max': 'Le prénom ne peut dépasser 50 caractères',
        'any.required': 'Le prénom est requis'
      }),
    
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut dépasser 50 caractères',
        'any.required': 'Le nom est requis'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email invalide',
        'any.required': 'L\'email est requis'
      }),
    
    password: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
        'any.required': 'Le mot de passe est requis'
      }),
    
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .default(USER_ROLES.GUEST),
    
    phone: Joi.string()
      .pattern(/^[0-9+\-\s()]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Numéro de téléphone invalide'
      }),
    
    restaurantId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'ID de restaurant invalide'
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

// Validation pour la connexion
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email invalide',
        'any.required': 'L\'email est requis'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Le mot de passe est requis'
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

// Validation pour la mise à jour de profil
const validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    preferences: Joi.object({
      language: Joi.string().valid('fr', 'en', 'es', 'de').optional(),
      timezone: Joi.string().optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
        sms: Joi.boolean().optional()
      }).optional()
    }).optional()
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

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile
};