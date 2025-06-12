const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Middlewares
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { rateLimiter } = require('../middleware/rateLimiter');

// Contrôleur
const dailySpecialController = require('../controllers/dailySpecialController');

// Configuration multer pour l'upload d'images
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, PNG et WebP sont autorisés'));
    }
  }
});

// Validateurs de données
const validateDailySpecial = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom doit contenir entre 3 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-'().]+$/)
    .withMessage('Le nom contient des caractères non autorisés'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),

  body('price')
    .isFloat({ min: 0, max: 500 })
    .withMessage('Le prix doit être entre 0 et 500€'),

  body('category')
    .isIn(['appetizers', 'soups', 'salads', 'mains', 'fish', 'meat', 'vegetarian', 'desserts', 'beverages', 'wines', 'cocktails'])
    .withMessage('Catégorie invalide'),

  body('availableDate')
    .isISO8601()
    .withMessage('Date de disponibilité invalide')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        throw new Error('La date de disponibilité ne peut pas être dans le passé');
      }
      return true;
    }),

  body('expirationDate')
    .optional()
    .isISO8601()
    .withMessage('Date d\'expiration invalide')
    .custom((value, { req }) => {
      if (value && req.body.availableDate) {
        const expiration = new Date(value);
        const available = new Date(req.body.availableDate);
        
        if (expiration <= available) {
          throw new Error('La date d\'expiration doit être postérieure à la date de disponibilité');
        }
      }
      return true;
    }),

  body('preparationTime')
    .optional()
    .isInt({ min: 5, max: 180 })
    .withMessage('Le temps de préparation doit être entre 5 et 180 minutes'),

  body('chef')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le nom du chef ne peut pas dépasser 50 caractères'),

  body('allergens')
    .optional()
    .isArray()
    .withMessage('Les allergènes doivent être un tableau')
    .custom((allergens) => {
      const validAllergens = [
        'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja',
        'Lait', 'Fruits à coques', 'Céleri', 'Moutarde', 'Graines de sésame',
        'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques'
      ];
      
      if (allergens && allergens.some(allergen => !validAllergens.includes(allergen))) {
        throw new Error('Allergène invalide détecté');
      }
      return true;
    }),

  body('isVegetarian')
    .optional()
    .isBoolean()
    .withMessage('isVegetarian doit être un booléen'),

  body('isVegan')
    .optional()
    .isBoolean()
    .withMessage('isVegan doit être un booléen'),

  body('isGlutenFree')
    .optional()
    .isBoolean()
    .withMessage('isGlutenFree doit être un booléen'),

  body('maxQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La quantité maximum doit être un entier positif'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent être un tableau')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags autorisés');
      }
      if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 20)) {
        throw new Error('Chaque tag doit être une chaîne de moins de 20 caractères');
      }
      return true;
    }),

  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les notes internes ne peuvent pas dépasser 500 caractères')
];

const validateId = [
  param('id')
    .isMongoId()
    .withMessage('ID invalide')
];

const validateRejectReason = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('La raison du rejet doit contenir entre 10 et 200 caractères')
];

const validateSearchQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le numéro de page doit être un entier positif'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le prix maximum doit être positif'),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'availableDate', 'orders', 'views'])
    .withMessage('Champ de tri invalide'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordre de tri invalide (asc ou desc)')
];

// Routes publiques (pour le site vitrine)
router.get('/public', 
  rateLimiter.public,
  validateSearchQuery,
  dailySpecialController.getTodaySpecials
);

// Routes protégées - Lecture
router.get('/', 
  auth, 
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  validateSearchQuery,
  dailySpecialController.getAllDailySpecials
);

router.get('/search',
  auth,
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  validateSearchQuery,
  dailySpecialController.searchDailySpecials
);

router.get('/today',
  auth,
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  dailySpecialController.getTodaySpecials
);

router.get('/week',
  auth,
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  dailySpecialController.getWeekSpecials
);

router.get('/statistics',
  auth,
  checkPermission('view_analytics'),
  rateLimiter.authenticated,
  dailySpecialController.getDailySpecialsStatistics
);

router.get('/:id',
  auth,
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  validateId,
  dailySpecialController.getDailySpecialById
);

// Routes protégées - Écriture
router.post('/',
  auth,
  checkPermission('create_daily_special'),
  rateLimiter.creation,
  upload.single('image'),
  validateDailySpecial,
  dailySpecialController.createDailySpecial
);

router.put('/:id',
  auth,
  checkPermission('update_daily_special'),
  rateLimiter.authenticated,
  upload.single('image'),
  validateId,
  validateDailySpecial,
  dailySpecialController.updateDailySpecial
);

router.delete('/:id',
  auth,
  checkPermission('delete_daily_special'),
  rateLimiter.authenticated,
  validateId,
  dailySpecialController.deleteDailySpecial
);

// Routes de gestion des statuts
router.post('/:id/approve',
  auth,
  checkPermission('approve_daily_special'),
  rateLimiter.authenticated,
  validateId,
  dailySpecialController.approveDailySpecial
);

router.post('/:id/reject',
  auth,
  checkPermission('approve_daily_special'),
  rateLimiter.authenticated,
  validateId,
  validateRejectReason,
  dailySpecialController.rejectDailySpecial
);

router.patch('/:id/toggle',
  auth,
  checkPermission('manage_daily_specials'),
  rateLimiter.authenticated,
  validateId,
  dailySpecialController.toggleDailySpecial
);

// Routes pour l'API mobile staff
router.get('/staff/pending',
  auth,
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  async (req, res, next) => {
    req.query.status = 'pending';
    next();
  },
  dailySpecialController.getAllDailySpecials
);

router.get('/staff/my-specials',
  auth,
  checkPermission('view_daily_specials'),
  rateLimiter.authenticated,
  async (req, res, next) => {
    // Filtrer par créateur
    req.query.createdBy = req.user._id;
    next();
  },
  dailySpecialController.getAllDailySpecials
);

// Route pour mettre à jour la quantité après commande
router.patch('/:id/order',
  auth,
  checkPermission('manage_orders'),
  rateLimiter.authenticated,
  validateId,
  async (req, res) => {
    try {
      const DailySpecial = require('../models/DailySpecial');
      const special = await DailySpecial.findById(req.params.id);
      
      if (!special) {
        return res.status(404).json({
          success: false,
          message: 'Plat du jour non trouvé'
        });
      }

      await special.incrementOrders();
      
      res.json({
        success: true,
        data: { special },
        message: 'Commande enregistrée'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// Middleware de gestion d'erreurs pour multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est trop volumineux (max 5MB)'
      });
    }
  }
  
  if (error.message.includes('Seuls les fichiers')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;