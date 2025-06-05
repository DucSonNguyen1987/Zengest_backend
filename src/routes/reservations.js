const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 🔍 DEBUG: Tests des imports un par un
console.log('🚀 ROUTES RESERVATIONS - MODE DEBUG TEMPORAIRE');

// Test import contrôleur
let ReservationController = null;
try {
  ReservationController = require('../controllers/reservationController');
  console.log('✅ Import ReservationController réussi');
  console.log('📋 Méthodes disponibles:', Object.keys(ReservationController || {}));
  console.log('🔍 Type getAllReservations:', typeof ReservationController?.getAllReservations);
} catch (error) {
  console.error('❌ Erreur import ReservationController:', error.message);
}

// Test import roleCheck
let roleCheckMiddleware = null;
try {
  roleCheckMiddleware = require('../middleware/roleCheck');
  console.log('✅ Import roleCheck réussi');
  console.log('📋 Middlewares disponibles:', Object.keys(roleCheckMiddleware || {}));
} catch (error) {
  console.error('❌ Erreur import roleCheck:', error.message);
}

// Test import validation
let validationMiddleware = null;
try {
  validationMiddleware = require('../middleware/reservationValidation');
  console.log('✅ Import reservationValidation réussi');
  console.log('📋 Validations disponibles:', Object.keys(validationMiddleware || {}));
} catch (error) {
  console.error('❌ Erreur import reservationValidation:', error.message);
}

// Toutes les routes nécessitent une authentification
router.use(auth);

// 🧪 ROUTES DE TEST TEMPORAIRES

// Test de base
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Route test OK',
    user: req.user?.email,
    timestamp: new Date().toISOString()
  });
});

// Test debug imports
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    debug: {
      reservationController: {
        imported: !!ReservationController,
        methods: Object.keys(ReservationController || {}),
        getAllReservations: typeof ReservationController?.getAllReservations
      },
      roleCheck: {
        imported: !!roleCheckMiddleware,
        methods: Object.keys(roleCheckMiddleware || {})
      },
      validation: {
        imported: !!validationMiddleware,
        methods: Object.keys(validationMiddleware || {})
      }
    }
  });
});

// Test création réservation simple (si contrôleur disponible)
router.post('/test-create', async (req, res) => {
  try {
    console.log('🔄 Test création réservation');
    console.log('Body:', req.body);
    console.log('User:', req.user?.email);
    console.log('ReservationController disponible:', !!ReservationController);
    console.log('createReservation disponible:', typeof ReservationController?.createReservation);
    
    if (ReservationController && ReservationController.createReservation) {
      console.log('🚀 Appel du vrai contrôleur');
      return await ReservationController.createReservation(req, res);
    } else {
      res.json({
        success: false,
        message: 'Contrôleur non disponible - test en cours',
        received: req.body,
        user: req.user?.email,
        controllerStatus: {
          imported: !!ReservationController,
          hasCreateMethod: typeof ReservationController?.createReservation
        }
      });
    }
  } catch (error) {
    console.error('❌ Erreur test création:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test getAllReservations simple (si contrôleur disponible)  
router.get('/test-list', async (req, res) => {
  try {
    console.log('🔄 Test liste réservations');
    console.log('User:', req.user?.email);
    
    if (ReservationController && ReservationController.getAllReservations) {
      console.log('🚀 Appel du vrai contrôleur getAllReservations');
      return await ReservationController.getAllReservations(req, res);
    } else {
      res.json({
        success: false,
        message: 'Contrôleur getAllReservations non disponible',
        user: req.user?.email,
        controllerStatus: {
          imported: !!ReservationController,
          hasGetAllMethod: typeof ReservationController?.getAllReservations,
          availableMethods: Object.keys(ReservationController || {})
        }
      });
    }
  } catch (error) {
    console.error('❌ Erreur test liste:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Info sur les routes disponibles
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Routes réservations - Mode debug temporaire',
    availableRoutes: [
      'GET /test - Test de base',
      'GET /debug - Debug des imports',
      'GET /test-list - Test liste réservations', 
      'POST /test-create - Test création réservation'
    ],
    user: req.user?.email,
    timestamp: new Date().toISOString(),
    note: 'Mode temporaire pour diagnostiquer les problèmes d\'import'
  });
});

module.exports = router;