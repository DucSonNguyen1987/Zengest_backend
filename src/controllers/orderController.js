/**
 * CORRECTION: src/controllers/orderController.js
 * Corriger gestion floorPlanId et populate
 */

const Order = require('../models/Order');
const MenuItem = require('../models/Menu');
const FloorPlan = require('../models/FloorPlan');
const User = require('../models/User');
const { createPagination } = require('../utils/pagination');

// === FONCTION UTILITAIRE POUR FLOORPLAN ===
const getOrCreateDefaultFloorPlan = async (restaurantId) => {
  try {
    // Chercher plan par défaut
    let defaultPlan = await FloorPlan.findOne({ 
      restaurantId, 
      isDefault: true 
    });
    
    if (defaultPlan) {
      console.log('Plan par défaut trouvé:', defaultPlan.name);
      return defaultPlan;
    }
    
    // Chercher n'importe quel plan actif
    defaultPlan = await FloorPlan.findOne({ 
      restaurantId, 
      isActive: true 
    });
    
    if (defaultPlan) {
      console.log('Plan actif utilisé:', defaultPlan.name);
      return defaultPlan;
    }
    
    // Créer un plan minimal si aucun n'existe
    console.log('Aucun plan trouvé - création plan minimal');
    const minimalPlan = new FloorPlan({
      name: 'Plan par défaut',
      description: 'Plan créé automatiquement',
      restaurantId,
      dimensions: { width: 800, height: 600, unit: 'cm' },
      tables: [
        {
          number: '1',
          capacity: 4,
          position: { x: 100, y: 100 },
          dimensions: { width: 120, height: 120 },
          shape: 'square',
          status: 'available',
          isActive: true
        }
      ],
      obstacles: [],
      isDefault: true,
      isActive: true
    });
    
    const savedPlan = await minimalPlan.save();
    console.log('Plan minimal créé:', savedPlan.name);
    return savedPlan;
    
  } catch (error) {
    console.error('Erreur gestion plan par défaut:', error);
    return null;
  }
};

// === FONCTION UTILITAIRE POPULATE SÉCURISÉE ===
const safePopulate = (query, path, select) => {
  try {
    return query.populate(path, select);
  } catch (error) {
    console.warn(`Populate ${path} échoué, continuant sans:`, error.message);
    return query;
  }
};

// === MÉTHODES PRINCIPALES ===

/**
 * Récupérer toutes les commandes avec pagination
 */
exports.getAllOrders = async (req, res) => {
  try {
    console.log('getAllOrders appelé par:', req.user?.email);
    
    const {
      page = 1,
      limit = 10,
      status,
      assignedServer,
      tableNumber,
      startDate,
      endDate,
      sortBy = 'timestamps.ordered',
      sortOrder = 'desc'
    } = req.query;

    // Construire le filtre
    const filter = { restaurantId: req.user.restaurantId };
    
    if (status) filter.status = status;
    if (assignedServer) filter.assignedServer = assignedServer;
    if (tableNumber) filter.tableNumber = new RegExp(tableNumber, 'i');
    
    if (startDate || endDate) {
      filter['timestamps.ordered'] = {};
      if (startDate) filter['timestamps.ordered'].$gte = new Date(startDate);
      if (endDate) filter['timestamps.ordered'].$lte = new Date(endDate);
    }

    const pagination = createPagination(page, limit, 0);
    
    // Requête avec populate sécurisé
    let query = Order.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(pagination.limit)
      .skip(pagination.skip);

    // Populate sécurisé
    query = safePopulate(query, 'items.menuItem', 'name category basePrice');
    query = safePopulate(query, 'assignedServer', 'firstName lastName');
    query = safePopulate(query, 'floorPlanId', 'name');
    
    const orders = await query.exec();
    const total = await Order.countDocuments(filter);
    const finalPagination = createPagination(page, limit, total);

    console.log('Commandes récupérées:', orders.length, 'sur', total);

    res.json({
      success: true,
      data: {
        orders,
        pagination: finalPagination,
        filter: { status, assignedServer, tableNumber }
      }
    });

  } catch (error) {
    console.error('Erreur getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Créer une nouvelle commande avec gestion FloorPlan automatique
 */
exports.createOrder = async (req, res) => {
  try {
    console.log('createOrder appelé par:', req.user?.email);
    
    let { 
      floorPlanId, 
      tableNumber, 
      tableId, 
      customer, 
      items, 
      assignedServer,
      priority = 'normal',
      notes = '',
      service = {}
    } = req.body;

    const restaurantId = req.body.restaurantId || req.user.restaurantId;

    // === GESTION FLOORPLAN AUTOMATIQUE ===
    if (!floorPlanId) {
      console.log('FloorPlanId manquant - recherche plan par défaut...');
      const defaultPlan = await getOrCreateDefaultFloorPlan(restaurantId);
      
      if (!defaultPlan) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de déterminer le plan de salle. Veuillez spécifier floorPlanId.'
        });
      }
      
      floorPlanId = defaultPlan._id;
      console.log('Plan par défaut utilisé:', defaultPlan.name);
    } else {
      // Vérifier que le plan existe
      const floorPlan = await FloorPlan.findById(floorPlanId);
      if (!floorPlan) {
        console.log('Plan spécifié introuvable, utilisation plan par défaut...');
        const defaultPlan = await getOrCreateDefaultFloorPlan(restaurantId);
        floorPlanId = defaultPlan?._id;
        
        if (!floorPlanId) {
          return res.status(400).json({
            success: false,
            message: 'Plan de salle spécifié introuvable et aucun plan par défaut disponible'
          });
        }
      }
    }

    // === GESTION CLIENT FLEXIBLE ===
    let normalizedCustomer;
    if (customer.firstName && customer.lastName) {
      normalizedCustomer = customer;
    } else if (customer.name) {
      const nameParts = customer.name.trim().split(' ');
      normalizedCustomer = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes || ''
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Informations client requises (name ou firstName/lastName)'
      });
    }

    // === GESTION TABLE ===
    const finalTableNumber = tableNumber || tableId || `T-${Date.now()}`;

    // === VALIDATION ITEMS ===
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un article doit être commandé'
      });
    }

    // Vérifier que les items existent
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    
    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Certains articles du menu sont introuvables'
      });
    }

    // === CALCUL PRIX ===
    let subtotal = 0;
    const validatedItems = items.map(item => {
      const menuItem = menuItems.find(mi => mi._id.toString() === item.menuItem);
      const price = item.price || menuItem.basePrice || 0;
      subtotal += price * item.quantity;
      
      return {
        menuItem: item.menuItem,
        quantity: item.quantity,
        price,
        variants: item.variants || {},
        notes: item.notes || ''
      };
    });

    const tax = subtotal * 0.1; // 10% TVA
    const total = subtotal + tax;

    // === CRÉATION COMMANDE ===
    const newOrder = new Order({
      restaurantId,
      floorPlanId,
      tableNumber: finalTableNumber,
      customer: normalizedCustomer,
      items: validatedItems,
      status: 'pending',
      priority,
      assignedServer: assignedServer || null,
      pricing: {
        subtotal,
        tax,
        discount: 0,
        total
      },
      notes,
      service,
      timestamps: {
        ordered: new Date()
      }
    });

    const savedOrder = await newOrder.save();
    
    // Populate pour la réponse
    let populatedOrder = await Order.findById(savedOrder._id);
    populatedOrder = await safePopulate(Order.findById(savedOrder._id), 'items.menuItem', 'name category');
    populatedOrder = await safePopulate(populatedOrder, 'assignedServer', 'firstName lastName');
    populatedOrder = await safePopulate(populatedOrder, 'floorPlanId', 'name');

    console.log('Commande créée:', savedOrder._id, 'Table:', finalTableNumber);

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: { order: populatedOrder }
    });

  } catch (error) {
    console.error('Erreur createOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer une commande par ID
 */
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('getOrder appelé pour ID:', id);

    let query = Order.findById(id);
    query = safePopulate(query, 'items.menuItem', 'name category basePrice images');
    query = safePopulate(query, 'assignedServer', 'firstName lastName');
    query = safePopulate(query, 'floorPlanId', 'name');
    
    const order = await query.exec();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérification permissions restaurant
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette commande'
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Erreur getOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la commande',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les commandes actives
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    
    let query = Order.find({
      restaurantId: req.user.restaurantId,
      status: { $in: activeStatuses }
    }).sort({ 'timestamps.ordered': -1 });

    query = safePopulate(query, 'items.menuItem', 'name category');
    query = safePopulate(query, 'assignedServer', 'firstName lastName');
    query = safePopulate(query, 'floorPlanId', 'name');

    const orders = await query.exec();

    res.json({
      success: true,
      data: { 
        orders,
        count: orders.length,
        statuses: activeStatuses
      }
    });

  } catch (error) {
    console.error('Erreur getActiveOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes actives',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Modifier le statut d'une commande
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

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

    const oldStatus = order.status;
    order.status = status;

    // Mettre à jour les timestamps
    const now = new Date();
    switch (status) {
      case 'confirmed':
        order.timestamps.confirmed = now;
        break;
      case 'preparing':
        order.timestamps.confirmed = order.timestamps.confirmed || now;
        break;
      case 'ready':
        order.timestamps.prepared = now;
        break;
      case 'served':
        order.timestamps.served = now;
        break;
      case 'paid':
        order.timestamps.paid = now;
        break;
    }

    if (reason) {
      order.notes = (order.notes || '') + `\nStatut ${oldStatus} -> ${status}: ${reason}`;
    }

    const updatedOrder = await order.save();

    console.log(`Commande ${id} statut changé: ${oldStatus} -> ${status}`);

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: { 
        order: updatedOrder,
        oldStatus,
        newStatus: status
      }
    });

  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Statistiques des commandes
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const restaurantId = req.user.restaurantId;

    // Déterminer les dates selon la période
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

    const filter = {
      restaurantId,
      'timestamps.ordered': { $gte: startDate, $lte: endDate }
    };

    // Statistiques de base
    const totalOrders = await Order.countDocuments(filter);
    
    const revenueData = await Order.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$pricing.total' },
        averageOrder: { $avg: '$pricing.total' },
        totalGuests: { $sum: { $sum: '$items.quantity' } }
      }}
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, averageOrder: 0, totalGuests: 0 };

    // Répartition par statut
    const statusBreakdown = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Top serveurs
    const topServers = await Order.aggregate([
      { $match: { ...filter, assignedServer: { $exists: true, $ne: null } } },
      { $group: { _id: '$assignedServer', orderCount: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalOrders,
          totalRevenue: revenue.totalRevenue,
          averageOrderValue: revenue.averageOrder,
          totalGuests: revenue.totalGuests
        },
        statusBreakdown,
        topServers
      }
    });

  } catch (error) {
    console.error('Erreur getOrderStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;