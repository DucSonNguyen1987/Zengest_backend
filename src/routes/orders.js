/**
 * CORRECTION: src/routes/orders.js
 * Routes avec validations assouplies et gestion d'erreur améliorée
 */

const express = require('express');
const {
  getAllOrders,
  createOrder,
  getOrder,
  getActiveOrders,
  updateOrderStatus,
  getOrderStatistics
} = require('../controllers/orderController');

const { auth } = require('../middleware/auth');
const { requireSameRestaurant, requireStaff } = require('../middleware/roleCheck');

// Import des validations ASSOUPLIES
const {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderStatus,
  validateOrderFilters
} = require('../middleware/orderValidation');

const router = express.Router();

// === MIDDLEWARE GLOBAL ===
router.use(auth); // Authentification requise pour toutes les routes

// === ROUTES PRINCIPALES ===

/**
 * GET /api/orders
 * Liste des commandes avec pagination et filtres
 */
router.get('/', 
  requireSameRestaurant, 
  validateOrderFilters, // Validation assouplie
  getAllOrders
);

/**
 * GET /api/orders/active
 * Commandes actives seulement
 */
router.get('/active', 
  requireSameRestaurant, 
  getActiveOrders
);

/**
 * GET /api/orders/statistics/summary
 * Statistiques des commandes
 */
router.get('/statistics/summary', 
  requireSameRestaurant, 
  getOrderStatistics
);

/**
 * GET /api/orders/:id
 * Détails d'une commande
 */
router.get('/:id', 
  requireSameRestaurant, 
  getOrder
);

/**
 * POST /api/orders
 * Créer une nouvelle commande
 * Validation assouplie pour floorPlanId optionnel et formats clients flexibles
 */
router.post('/', 
  requireStaff, 
  validateCreateOrder, // Validation ASSOUPLIE
  createOrder
);

/**
 * PATCH /api/orders/:id/status
 * Modifier le statut d'une commande
 */
router.patch('/:id/status', 
  requireStaff, 
  validateOrderStatus, // Validation simple
  updateOrderStatus
);

// === ROUTES SPÉCIALISÉES SANS VALIDATION STRICTE ===

/**
 * GET /api/orders/table/:floorPlanId/:tableId
 * Commandes par table - SANS VALIDATION STRICTE
 */
router.get('/table/:floorPlanId/:tableId', requireSameRestaurant, async (req, res) => {
  try {
    const { floorPlanId, tableId } = req.params;
    const { status } = req.query;
    
    console.log('Commandes par table:', { floorPlanId, tableId, status });
    
    const Order = require('../models/Order');
    
    // Construire le filtre avec flexibilité
    const filter = {
      restaurantId: req.user.restaurantId
    };
    
    // Accepter plusieurs formats de table
    const tableConditions = [];
    if (tableId) {
      tableConditions.push(
        { tableNumber: tableId },
        { tableNumber: new RegExp(tableId, 'i') },
        { tableId: tableId }
      );
    }
    
    if (tableConditions.length > 0) {
      filter.$or = tableConditions;
    }
    
    // Filtre par plan si fourni et valide
    if (floorPlanId && floorPlanId !== 'any' && floorPlanId !== 'null') {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(floorPlanId)) {
        filter.floorPlanId = floorPlanId;
      }
    }
    
    if (status) {
      filter.status = status;
    }
    
    console.log('Filtre final:', filter);
    
    let query = Order.find(filter).sort({ 'timestamps.ordered': -1 });
    
    // Populate sécurisé
    try {
      query = query.populate('items.menuItem', 'name category basePrice');
      query = query.populate('assignedServer', 'firstName lastName');
      query = query.populate('floorPlanId', 'name');
    } catch (populateError) {
      console.warn('Populate échoué, continuant sans:', populateError.message);
    }
    
    const orders = await query.exec();
    
    console.log('Commandes trouvées:', orders.length);
    
    res.json({
      success: true,
      data: { 
        orders,
        filter: { floorPlanId, tableId, status },
        count: orders.length
      }
    });
    
  } catch (error) {
    console.error('Erreur commandes par table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes par table',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/orders/:id
 * Mettre à jour une commande complète - SANS VALIDATION STRICTE
 */
router.put('/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Mise à jour commande:', id);
    
    const Order = require('../models/Order');
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérification permissions
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    // Mise à jour flexible
    const allowedFields = [
      'customer', 'items', 'assignedServer', 'status', 'priority', 
      'notes', 'service', 'pricing', 'tableNumber'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        order[field] = updateData[field];
      }
    });
    
    // Mettre à jour timestamp
    order.timestamps.updatedAt = new Date();
    
    const updatedOrder = await order.save();
    
    // Populate pour réponse
    let populatedOrder;
    try {
      populatedOrder = await Order.findById(updatedOrder._id)
        .populate('items.menuItem', 'name category')
        .populate('assignedServer', 'firstName lastName')
        .populate('floorPlanId', 'name');
    } catch (populateError) {
      console.warn('Populate échoué:', populateError.message);
      populatedOrder = updatedOrder;
    }
    
    res.json({
      success: true,
      message: 'Commande mise à jour avec succès',
      data: { order: populatedOrder }
    });
    
  } catch (error) {
    console.error('Erreur mise à jour commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/orders/:id/items
 * Ajouter des articles à une commande - VALIDATION SIMPLE
 */
router.post('/:id/items', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Articles requis'
      });
    }
    
    const Order = require('../models/Order');
    const MenuItem = require('../models/Menu');
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérification permissions
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    // Validation des articles (simple)
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    
    // Ajouter les articles
    items.forEach(item => {
      const menuItem = menuItems.find(mi => mi._id.toString() === item.menuItem);
      if (menuItem) {
        order.items.push({
          menuItem: item.menuItem,
          quantity: item.quantity || 1,
          price: item.price || menuItem.basePrice || 0,
          variants: item.variants || {},
          notes: item.notes || ''
        });
      }
    });
    
    // Recalculer les prix
    let subtotal = 0;
    order.items.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    order.pricing.subtotal = subtotal;
    order.pricing.tax = subtotal * 0.1;
    order.pricing.total = order.pricing.subtotal + order.pricing.tax;
    
    const updatedOrder = await order.save();
    
    res.json({
      success: true,
      message: 'Articles ajoutés avec succès',
      data: { order: updatedOrder }
    });
    
  } catch (error) {
    console.error('Erreur ajout articles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout des articles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/orders/:id/items/:itemId
 * Supprimer un article d'une commande
 */
router.delete('/:id/items/:itemId', requireStaff, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    const Order = require('../models/Order');
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérification permissions
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    // Supprimer l'article
    order.items = order.items.filter(item => item._id.toString() !== itemId);
    
    // Vérifier qu'il reste des articles
    if (order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer tous les articles d\'une commande'
      });
    }
    
    // Recalculer les prix
    let subtotal = 0;
    order.items.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    order.pricing.subtotal = subtotal;
    order.pricing.tax = subtotal * 0.1;
    order.pricing.total = order.pricing.subtotal + order.pricing.tax;
    
    const updatedOrder = await order.save();
    
    res.json({
      success: true,
      message: 'Article supprimé avec succès',
      data: { order: updatedOrder }
    });
    
  } catch (error) {
    console.error('Erreur suppression article:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/orders/:id/payment
 * Traitement du paiement - VALIDATION SIMPLE
 */
router.post('/:id/payment', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'cash', reference, tip = 0 } = req.body;
    
    const Order = require('../models/Order');
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérification permissions
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    // Mettre à jour le paiement
    order.payment = {
      method,
      reference: reference || `PAY-${Date.now()}`,
      status: 'completed',
      processedAt: new Date(),
      tip: parseFloat(tip) || 0
    };
    
    // Ajouter le pourboire au total
    if (tip > 0) {
      order.pricing.tip = parseFloat(tip);
      order.pricing.total += parseFloat(tip);
    }
    
    order.status = 'paid';
    order.timestamps.paid = new Date();
    
    const updatedOrder = await order.save();
    
    console.log(`Paiement traité pour commande ${id}: ${method}, ${order.pricing.total}€`);
    
    res.json({
      success: true,
      message: 'Paiement traité avec succès',
      data: { 
        order: updatedOrder,
        payment: order.payment,
        total: order.pricing.total
      }
    });
    
  } catch (error) {
    console.error('Erreur traitement paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement du paiement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === GESTION D'ERREUR GLOBALE POUR CETTE ROUTE ===
router.use((error, req, res, next) => {
  console.error('Erreur route orders:', error);
  
  // Erreur de validation
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      details: Object.values(error.errors).map(e => e.message)
    });
  }
  
  // Erreur MongoDB
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID invalide',
      field: error.path
    });
  }
  
  // Erreur générique
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;