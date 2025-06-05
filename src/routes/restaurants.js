/**
 * CORRECTION: src/routes/restaurants.js
 * Routes complètes pour la gestion des restaurants avec permissions Owner
 */

const express = require('express');
const {
  getAllRestaurants,
  getRestaurant,
  getRestaurantStatus,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
} = require('../controllers/restaurantController');

const { auth } = require('../middleware/auth');
const { 
  requireSameRestaurant, 
  requireAdmin, 
  requireOwnerOrAdmin,
  requireManagement,
  requireRoleForAction
} = require('../middleware/roleCheck');

const router = express.Router();

// === MIDDLEWARE GLOBAL ===
router.use(auth); // Authentification requise pour toutes les routes

// === ROUTES PRINCIPALES ===

/**
 * GET /api/restaurants
 * Liste de tous les restaurants
 * CORRECTION: Owner peut voir les restaurants (pour son restaurant)
 */
router.get('/', requireOwnerOrAdmin, getAllRestaurants);

/**
 * GET /api/restaurants/:id
 * Détails d'un restaurant spécifique
 * CORRECTION: Owner peut voir les détails de son restaurant
 */
router.get('/:id', requireOwnerOrAdmin, getRestaurant);

/**
 * GET /api/restaurants/:id/status
 * Statut d'un restaurant (ouvert/fermé, capacité, etc.)
 * CORRECTION: Accès public pour vérifier si restaurant ouvert
 */
router.get('/:id/status', getRestaurantStatus);

/**
 * POST /api/restaurants
 * Créer un nouveau restaurant
 * CORRECTION: Owner peut créer un restaurant (pour auto-assignment)
 */
router.post('/', requireRoleForAction('manage_restaurant'), createRestaurant);

/**
 * PUT /api/restaurants/:id
 * Mettre à jour un restaurant
 * CORRECTION: Owner peut modifier son restaurant
 */
router.put('/:id', requireOwnerOrAdmin, updateRestaurant);

/**
 * DELETE /api/restaurants/:id
 * Supprimer un restaurant
 * Seuls les admins peuvent supprimer (sécurité)
 */
router.delete('/:id', requireAdmin, deleteRestaurant);

// === ROUTES SPÉCIALISÉES ===

/**
 * GET /api/restaurants/:id/users
 * Utilisateurs d'un restaurant
 */
router.get('/:id/users', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const User = require('../models/User');
    
    // Vérification permissions spécifiques
    if (req.user.role !== 'admin') {
      // Owner ne peut voir que les utilisateurs de son restaurant
      if (!req.user.restaurantId || req.user.restaurantId.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à ce restaurant',
          code: 'RESTAURANT_ACCESS_DENIED'
        });
      }
    }
    
    const users = await User.find({ restaurantId: id })
      .select('-password -security')
      .sort({ role: 1, firstName: 1 });
    
    // Grouper par rôle pour meilleure présentation
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        users,
        usersByRole,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length
      }
    });
    
  } catch (error) {
    console.error('Erreur récupération utilisateurs restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/restaurants/:id/statistics
 * Statistiques d'un restaurant
 */
router.get('/:id/statistics', requireManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'today' } = req.query;
    
    // Vérification permissions restaurant
    if (req.user.role !== 'admin') {
      if (!req.user.restaurantId || req.user.restaurantId.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé aux statistiques de ce restaurant',
          code: 'RESTAURANT_STATS_ACCESS_DENIED'
        });
      }
    }
    
    const Order = require('../models/Order');
    const Reservation = require('../models/Reservation');
    
    // Calculer les dates selon la période
    let startDate, endDate = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }
    
    const dateFilter = {
      restaurantId: id,
      'timestamps.ordered': { $gte: startDate, $lte: endDate }
    };
    
    // Statistiques commandes
    const orderStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          totalItems: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);
    
    // Répartition par statut
    const statusBreakdown = await Order.aggregate([
      { $match: { restaurantId: id, 'timestamps.ordered': { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Statistiques réservations
    const reservationStats = await Reservation.aggregate([
      { 
        $match: { 
          restaurantId: id,
          dateTime: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReservations: { $sum: 1 },
          totalGuests: { $sum: '$partySize' },
          averagePartySize: { $avg: '$partySize' }
        }
      }
    ]);
    
    const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, totalItems: 0 };
    const reservations = reservationStats[0] || { totalReservations: 0, totalGuests: 0, averagePartySize: 0 };
    
    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        orders: stats,
        reservations,
        statusBreakdown,
        performance: {
          ordersPerHour: period === 'today' ? 
            Math.round(stats.totalOrders / 12) : // Approximation 12h service
            Math.round(stats.totalOrders / (period === 'week' ? 168 : 720)), // heures dans période
          revenuePerOrder: stats.averageOrderValue,
          occupancyRate: reservations.totalGuests > 0 ? 
            Math.round((reservations.totalGuests / (period === 'today' ? 60 : period === 'week' ? 420 : 1800)) * 100) : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur statistiques restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/restaurants/:id/activate
 * Activer/désactiver un restaurant
 */
router.post('/:id/activate', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const Restaurant = require('../models/Restaurant');
    
    // Vérification permissions
    if (req.user.role !== 'admin') {
      if (!req.user.restaurantId || req.user.restaurantId.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à ce restaurant',
          code: 'RESTAURANT_ACCESS_DENIED'
        });
      }
    }
    
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    restaurant.isActive = isActive;
    await restaurant.save();
    
    console.log(`Restaurant ${restaurant.name} ${isActive ? 'activé' : 'désactivé'} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: `Restaurant ${isActive ? 'activé' : 'désactivé'} avec succès`,
      data: { restaurant }
    });
    
  } catch (error) {
    console.error('Erreur activation restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/restaurants/:id/hours
 * Mettre à jour les horaires d'un restaurant
 */
router.put('/:id/hours', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { hours } = req.body;
    
    const Restaurant = require('../models/Restaurant');
    
    // Vérification permissions
    if (req.user.role !== 'admin') {
      if (!req.user.restaurantId || req.user.restaurantId.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à ce restaurant',
          code: 'RESTAURANT_ACCESS_DENIED'
        });
      }
    }
    
    // Validation des horaires
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validHours = {};
    
    daysOfWeek.forEach(day => {
      if (hours[day]) {
        validHours[day] = {
          open: hours[day].open || '09:00',
          close: hours[day].close || '22:00',
          closed: hours[day].closed || false
        };
      }
    });
    
    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { hours: validHours },
      { new: true, runValidators: true }
    );
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    console.log(`Horaires mis à jour pour ${restaurant.name} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Horaires mis à jour avec succès',
      data: { restaurant }
    });
    
  } catch (error) {
    console.error('Erreur mise à jour horaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des horaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/restaurants/:id/current-status
 * Statut en temps réel d'un restaurant (ouvert/fermé maintenant)
 */
router.get('/:id/current-status', async (req, res) => {
  try {
    const { id } = req.params;
    const Restaurant = require('../models/Restaurant');
    
    const restaurant = await Restaurant.findById(id).select('name isActive hours');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Calculer si ouvert maintenant
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    let isOpenNow = false;
    let nextOpenTime = null;
    let todayHours = null;
    
    if (restaurant.isActive && restaurant.hours && restaurant.hours[currentDay]) {
      todayHours = restaurant.hours[currentDay];
      
      if (!todayHours.closed) {
        const [openHour, openMin] = (todayHours.open || '09:00').split(':').map(Number);
        const [closeHour, closeMin] = (todayHours.close || '22:00').split(':').map(Number);
        
        const openTimeMinutes = openHour * 60 + openMin;
        const closeTimeMinutes = closeHour * 60 + closeMin;
        
        isOpenNow = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes;
        
        if (!isOpenNow && currentTimeMinutes < openTimeMinutes) {
          nextOpenTime = todayHours.open;
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          isActive: restaurant.isActive,
          isOpenNow,
          currentDay,
          currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
          todayHours,
          nextOpenTime
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur statut actuel restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === GESTION D'ERREUR POUR CETTE ROUTE ===
router.use((error, req, res, next) => {
  console.error('Erreur route restaurants:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      details: Object.values(error.errors).map(e => e.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID restaurant invalide',
      field: error.path
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;