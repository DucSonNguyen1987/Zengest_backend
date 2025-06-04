const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const FloorPlan = require('../models/FloorPlan');
const Restaurant = require('../models/Restaurant');
const { createPagination } = require('../utils/pagination');
const { USER_ROLES } = require('../utils/constants');

/**
 * Contrôleur pour la gestion des commandes
 */

/**
 * Récupérer toutes les commandes avec pagination et filtres
 * GET /orders
 */
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'timestamps.ordered',
      sortOrder = 'desc',
      tableNumber,
      assignedServer,
      dateFrom,
      dateTo
    } = req.query;

    console.log('getAllOrders appelé par:', req.user?.email, 'avec params:', { page, limit, status });

    // Construire le filtre
    const filter = {};
    
    // Filtrer par restaurant selon le rôle
    if (req.user.role !== 'admin') {
      filter.restaurantId = req.user.restaurantId;
    }
    
    if (status) filter.status = status;
    if (tableNumber) filter.tableNumber = tableNumber;
    if (assignedServer) filter.assignedServer = assignedServer;
    
    // Filtres de date
    if (dateFrom || dateTo) {
      filter['timestamps.ordered'] = {};
      if (dateFrom) filter['timestamps.ordered'].$gte = new Date(dateFrom);
      if (dateTo) filter['timestamps.ordered'].$lte = new Date(dateTo);
    }

    const pagination = createPagination(page, limit, 0);

    // Requête avec pagination
    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name category priceVariants')
      .populate('assignedServer', 'firstName lastName')
      .populate('restaurantId', 'name')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(pagination.limit)
      .skip(pagination.skip);

    const total = await Order.countDocuments(filter);
    const finalPagination = createPagination(page, limit, total);

    console.log('Commandes récupérées:', { count: orders.length, total });

    res.json({
      success: true,
      data: {
        orders,
        pagination: finalPagination
      }
    });

  } catch (error) {
    console.error('Erreur getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des commandes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les commandes actives
 * GET /orders/active
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const filter = {
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    };
    
    if (req.user.role !== 'admin') {
      filter.restaurantId = req.user.restaurantId;
    }

    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .sort({ 'timestamps.ordered': 1 });

    res.json({
      success: true,
      data: { orders }
    });

  } catch (error) {
    console.error('Erreur getActiveOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes actives'
    });
  }
};

/**
 * Récupérer une commande spécifique
 * GET /orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .populate('items.menuItem', 'name category priceVariants')
      .populate('assignedServer', 'firstName lastName email')
      .populate('restaurantId', 'name address')
      .populate('floorPlanId', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérification permissions
    if (req.user.role !== 'admin' && 
        order.restaurantId._id.toString() !== req.user.restaurantId?.toString()) {
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
    console.error('Erreur getOrderById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la commande'
    });
  }
};

/**
 * Créer une nouvelle commande
 * POST /orders
 */
exports.createOrder = async (req, res) => {
  try {
    // === CORRECTION AUTO FLOORPLAN & TABLE ===
    let { floorPlanId, tableNumber, tableId, customer, items, priority = 'normal' } = req.body;
    
    console.log('createOrder appelé par:', req.user?.email, 'données:', { 
      hasFloorPlanId: !!floorPlanId, 
      tableNumber, 
      tableId, 
      itemsCount: items?.length 
    });
    
    // Validation basique
    if (!customer || (!customer.name && !customer.firstName)) {
      return res.status(400).json({
        success: false,
        message: 'Informations client requises (name ou firstName/lastName)'
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un élément doit être commandé'
      });
    }
    
    // Gestion automatique du floorPlanId
    if (!floorPlanId) {
      console.log('Recherche du plan par défaut...');
      const defaultPlan = await FloorPlan.findOne({ 
        restaurantId: req.user.restaurantId,
        isDefault: true 
      });
      
      if (defaultPlan) {
        floorPlanId = defaultPlan._id;
        console.log('FloorPlan par défaut utilisé:', defaultPlan.name, 'ID:', floorPlanId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Aucun plan de salle par défaut configuré'
        });
      }
    }
    
    // Gestion tableNumber/tableId
    const finalTableNumber = tableNumber || tableId || `T-${Date.now()}`;
    console.log('Table assignée:', finalTableNumber);
    // === FIN CORRECTION AUTO ===

    // Normaliser les informations client
    let normalizedCustomer = customer;
    if (customer.name && !customer.firstName) {
      const nameParts = customer.name.trim().split(' ');
      normalizedCustomer = {
        name: customer.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || ''
      };
    }

    // Valider et traiter les éléments de commande
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Élément de menu non trouvé: ${item.menuItem}`
        });
      }

      if (!menuItem.isActive || !menuItem.availability.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Élément indisponible: ${menuItem.name}`
        });
      }

      const quantity = parseInt(item.quantity) || 1;
      const price = item.price || menuItem.basePrice || 0;
      const itemTotal = price * quantity;

      processedItems.push({
        menuItem: menuItem._id,
        quantity,
        price,
        variants: item.variants || {},
        notes: item.notes || '',
        subtotal: itemTotal
      });

      subtotal += itemTotal;
    }

    // Calculer les totaux
    const taxRate = 0.20; // 20% TVA
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Créer la commande
    const orderData = {
      restaurantId: req.user.restaurantId,
      floorPlanId,
      tableNumber: finalTableNumber,
      customer: normalizedCustomer,
      items: processedItems,
      status: 'pending',
      priority,
      assignedServer: req.user._id,
      pricing: {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        discount: 0,
        total: Math.round(total * 100) / 100
      },
      payment: {
        method: null,
        status: 'pending'
      },
      timestamps: {
        ordered: new Date()
      }
    };

    const order = await Order.create(orderData);

    // Populer les références pour la réponse
    await order.populate([
      { path: 'items.menuItem', select: 'name category priceVariants' },
      { path: 'assignedServer', select: 'firstName lastName' },
      { path: 'restaurantId', select: 'name' },
      { path: 'floorPlanId', select: 'name' }
    ]);

    console.log('Commande créée:', order._id, 'total:', order.pricing.total);

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: { order }
    });

  } catch (error) {
    console.error('Erreur createOrder:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour le statut d'une commande
 * PATCH /orders/:id/status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Statuts autorisés: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérification permissions
    if (req.user.role !== 'admin' && 
        order.restaurantId.toString() !== req.user.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const oldStatus = order.status;
    order.status = status;
    
    // Mettre à jour les timestamps selon le statut
    switch (status) {
      case 'confirmed':
        order.timestamps.confirmed = new Date();
        break;
      case 'preparing':
        order.timestamps.preparing = new Date();
        break;
      case 'ready':
        order.timestamps.ready = new Date();
        break;
      case 'served':
        order.timestamps.served = new Date();
        break;
      case 'paid':
        order.timestamps.paid = new Date();
        order.payment.status = 'completed';
        break;
    }

    if (notes) {
      order.notes = (order.notes || '') + `\n[${new Date().toLocaleString()}] ${req.user.firstName}: ${notes}`;
    }

    await order.save();

    console.log('Statut commande mis à jour:', id, oldStatus, '->', status);

    res.json({
      success: true,
      message: `Statut de la commande changé vers "${status}"`,
      data: {
        order: {
          id: order._id,
          status: order.status,
          timestamps: order.timestamps
        }
      }
    });

  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * Récupérer les commandes par table
 * GET /orders/table/:floorPlanId/:tableId
 */
exports.getOrdersByTable = async (req, res) => {
  try {
    const { floorPlanId, tableId } = req.params;
    const { status } = req.query;

    const filter = {
      floorPlanId,
      tableNumber: tableId,
      restaurantId: req.user.restaurantId
    };

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .sort({ 'timestamps.ordered': -1 });

    res.json({
      success: true,
      data: { orders }
    });

  } catch (error) {
    console.error('Erreur getOrdersByTable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes par table'
    });
  }
};

/**
 * Traiter le paiement d'une commande
 * POST /orders/:id/payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, amount, transactionId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifications
    if (order.payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cette commande est déjà payée'
      });
    }

    if (amount && Math.abs(amount - order.pricing.total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Montant incorrect'
      });
    }

    // Traiter le paiement
    order.payment = {
      method: method || 'cash',
      status: 'completed',
      transactionId: transactionId || `PAY_${Date.now()}`,
      amount: order.pricing.total,
      processedAt: new Date(),
      processedBy: req.user._id
    };

    order.status = 'paid';
    order.timestamps.paid = new Date();

    await order.save();

    console.log('Paiement traité:', id, 'montant:', order.pricing.total);

    res.json({
      success: true,
      message: 'Paiement traité avec succès',
      data: {
        order: {
          id: order._id,
          status: order.status,
          payment: order.payment,
          total: order.pricing.total
        }
      }
    });

  } catch (error) {
    console.error('Erreur processPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement du paiement'
    });
  }
};

/**
 * Statistiques des commandes
 * GET /orders/statistics/summary
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    const { period = 'today', restaurantId } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter = { $gte: startOfDay, $lte: endOfDay };
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        dateFilter = { $gte: startOfWeek };
        break;
      case 'month':
        const startOfMonth = new Date(now);
        startOfMonth.setDate(now.getDate() - 30);
        dateFilter = { $gte: startOfMonth };
        break;
    }

    const filter = { 'timestamps.ordered': dateFilter };
    if (req.user.role !== 'admin') {
      filter.restaurantId = req.user.restaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          statusBreakdown: {
            $push: '$status'
          }
        }
      }
    ]);

    const statusCounts = {};
    if (stats[0]?.statusBreakdown) {
      stats[0].statusBreakdown.forEach(status => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }

    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };

    res.json({
      success: true,
      data: {
        period,
        statistics: {
          totalOrders: result.totalOrders,
          totalRevenue: Math.round((result.totalRevenue || 0) * 100) / 100,
          averageOrderValue: Math.round((result.averageOrderValue || 0) * 100) / 100,
          statusBreakdown: statusCounts
        }
      }
    });

  } catch (error) {
    console.error('Erreur getOrderStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = exports;