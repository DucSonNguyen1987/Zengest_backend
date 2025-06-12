const express = require('express');
const router = express.Router();

// Middleware
const { auth } = require('../middleware/auth');
const { requireSameRestaurant, requireStaff } = require('../middleware/roleCheck');



// Contrôleur avec toutes les méthodes corrigées
const {
  getAllOrders,
  createOrder,
  getOrder,
  getActiveOrders,
  updateOrderStatus,
  processPayment,
  getOrderStatistics,
  getOrdersByTable
} = require('../controllers/orderController');

// === MIDDLEWARE GLOBAL ===
router.use(auth); // Authentification requise pour toutes les routes

/**
 * GET /api/orders/test-simple
 * Route de test simple SANS middlewares problématiques
 */
router.get('/test-simple', auth, (req, res) => {
  try {
    console.log('🧪 Route test-simple appelée');
    console.log('User:', req.user?.email);
    console.log('User Role:', req.user?.role);
    console.log('User Restaurant:', req.user?.restaurantId);
    console.log('User Permissions:', req.user?.permissions);

    res.json({
      success: true,
      message: 'Route test-simple fonctionne',
      debug: {
        user: {
          email: req.user?.email,
          role: req.user?.role,
          restaurantId: req.user?.restaurantId?.toString(),
          permissions: req.user?.permissions || []
        },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });

  } catch (error) {
    console.error('❌ Erreur test-simple:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur dans test-simple',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/orders/debug-middlewares
 * Test des middlewares un par un
 */
router.get('/debug-middlewares', auth, (req, res, next) => {
  console.log('✅ Middleware auth passé');
  
  // Test requireSameRestaurant manuellement
  try {
    if (!req.user.restaurantId && req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.json({
        success: false,
        message: 'Problème: Utilisateur sans restaurant',
        debug: {
          role: req.user.role,
          restaurantId: req.user.restaurantId,
          solution: 'Assigner un restaurant ou utiliser admin/owner'
        }
      });
    }

    res.json({
      success: true,
      message: 'Middlewares OK',
      debug: {
        authPassed: true,
        userRole: req.user.role,
        hasRestaurant: !!req.user.restaurantId,
        permissions: req.user.permissions
      }
    });

  } catch (error) {
    res.json({
      success: false,
      message: 'Erreur dans debug-middlewares',
      error: error.message
    });
  }
});


// === ROUTES PRINCIPALES ===

/**
 * GET /api/orders
 * Liste paginée des commandes avec filtres
 */
router.get('/', requireSameRestaurant, getAllOrders);

/**
 * POST /api/orders
 * Créer une nouvelle commande
 */
router.post('/', requireStaff, createOrder);

/**
 * GET /api/orders/active
 * Commandes actives (pending, confirmed, preparing, ready)
 */
router.get('/active', requireSameRestaurant, getActiveOrders);

/**
 * GET /api/orders/statistics/summary
 * Statistiques des commandes (avec period: today/week/month)
 */
router.get('/statistics/summary', requireSameRestaurant, getOrderStatistics);

/**
 * GET /api/orders/table/:planId/:tableId
 * Commandes d'une table spécifique
 */
router.get('/table/:planId/:tableId', requireSameRestaurant, getOrdersByTable);

/**
 * GET /api/orders/:id
 * Détails d'une commande spécifique
 */
router.get('/:id', requireSameRestaurant, getOrder);

/**
 * PATCH /api/orders/:id/status
 * Modifier le statut d'une commande
 */
router.patch('/:id/status',requireSameRestaurant, updateOrderStatus);

/**
 * POST /api/orders/:id/payment
 * Traiter le paiement d'une commande
 */
router.post('/:id/payment', requireSameRestaurant , processPayment);

// === MIDDLEWARE D'ERREUR SPÉCIFIQUE ===
router.use((error, req, res, next) => {
  console.error('Erreur route orders:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Données de commande invalides',
      errors: Object.values(error.errors).map(e => e.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID de commande invalide'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur serveur lors du traitement de la commande',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;