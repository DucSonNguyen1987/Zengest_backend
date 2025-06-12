const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const FloorPlan = require('../models/FloorPlan');
const { USER_ROLES } = require('../utils/constants');

// === FONCTIONS UTILITAIRES ===

const safePopulate = (query, path, select) => {
  try {
    return query.populate(path, select);
  } catch (error) {
    console.warn(`Populate échoué pour ${path}:`, error.message);
    return query;
  }
};

const normalizeCustomer = (customer) => {
  if (!customer) return null;
  
  // Format flexible : name OU firstName/lastName
  if (customer.name && !customer.firstName && !customer.lastName) {
    const nameParts = customer.name.trim().split(' ');
    return {
      firstName: nameParts[0] || 'Client',
      lastName: nameParts.slice(1).join(' ') || '',
      phone: customer.phone || '',
      email: customer.email || '',
      specialRequests: customer.specialRequests || ''
    };
  }
  
  return {
    firstName: customer.firstName || 'Client',
    lastName: customer.lastName || '',
    phone: customer.phone || '',
    email: customer.email || '',
    specialRequests: customer.specialRequests || ''
  };
};

// === MÉTHODES PRINCIPALES ===

/**
 * Récupérer toutes les commandes avec pagination
 * GET /api/orders
 */
exports.getAllOrders = async (req, res) => {
  try {
    console.log('getAllOrders appelé avec query:', req.query);
    
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'timestamps.ordered',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Construire le filtre
    const filter = { restaurantId: req.user.restaurantId };
    if (status) filter.status = status;

    console.log('Filtre utilisé:', filter);
    console.log('Pagination:', { page: pageNum, limit: limitNum, skip });

    // Compter le total
    const total = await Order.countDocuments(filter);
    console.log('Total de commandes trouvées:', total);

    // Construire la requête avec tri
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = Order.find(filter)
      .sort(sortObj)
      .limit(limitNum)
      .skip(skip);

    // Populate sécurisé
    query = safePopulate(query, 'items.menuItem', 'name category basePrice');
    query = safePopulate(query, 'assignedServer', 'firstName lastName');
    query = safePopulate(query, 'floorPlanId', 'name');
    query = safePopulate(query, 'restaurantId', 'name');

    const orders = await query.exec();
    console.log('Commandes récupérées:', orders.length);

    // Calculer la pagination
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const response = {
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null
        }
      }
    };

    console.log('Réponse pagination:', response.data.pagination);
    res.json(response);

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
 * Créer une nouvelle commande
 * POST /api/orders
 */
exports.createOrder = async (req, res) => {
  try {
    console.log('createOrder appelé avec body:', JSON.stringify(req.body, null, 2));
    
    const {
      floorPlanId,
      tableNumber,
      tableId,
      customer,
      items = [],
      notes = '',
      priority = 'normal'
    } = req.body;

    // Validation de base
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un item est requis pour créer une commande'
      });
    }

    // === GESTION FLEXIBLE DU PLAN DE SALLE ===
    let finalFloorPlanId = floorPlanId;
    
    if (!finalFloorPlanId) {
      console.log('Aucun floorPlanId fourni, recherche du plan par défaut...');
      const defaultPlan = await FloorPlan.findOne({ 
        restaurantId: req.user.restaurantId 
      }).sort({ createdAt: 1 });
      
      if (defaultPlan) {
        finalFloorPlanId = defaultPlan._id;
        console.log('Plan par défaut trouvé:', finalFloorPlanId);
      } else {
        console.log('Aucun plan trouvé, commande sans plan de salle');
      }
    }

    // === NORMALISATION DU CLIENT ===
    const normalizedCustomer = normalizeCustomer(customer);
    console.log('Client normalisé:', normalizedCustomer);

    // === TRAITEMENT DES ITEMS ===
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (!item.menuItem) {
        return res.status(400).json({
          success: false,
          message: 'menuItem requis pour chaque item'
        });
      }

      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isActive) {
        return res.status(400).json({
          success: false,
          message: `Item de menu non disponible: ${item.menuItem}`
        });
      }

      // Gestion des variantes de prix
      let unitPrice = menuItem.basePrice;
      if (item.selectedVariant && menuItem.priceVariants) {
        const variant = menuItem.priceVariants.find(v => 
          v.size === item.selectedVariant.size
        );
        if (variant) {
          unitPrice = variant.price;
        }
      }

      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const totalPrice = unitPrice * quantity;

      const orderItem = {
        menuItem: menuItem._id,
        menuItemSnapshot: {
          name: menuItem.name,
          description: menuItem.description,
          category: menuItem.category,
          basePrice: menuItem.basePrice
        },
        selectedVariant: item.selectedVariant || { size: 'standard', price: unitPrice },
        quantity,
        unitPrice,
        totalPrice,
        notes: item.notes || '',
        modifications: item.modifications || []
      };

      processedItems.push(orderItem);
      subtotal += totalPrice;
    }

    // === CALCULS FINANCIERS ===
    const tva = Math.round(subtotal * 0.1 * 100) / 100; // 10% TVA
    const total = Math.round((subtotal + tva) * 100) / 100;

    const pricing = {
      subtotal,
      tva,
      total,
      currency: 'EUR'
    };

    // === GESTION DU NUMÉRO DE TABLE ===
    const finalTableNumber = tableNumber || tableId || `T${Date.now()}`;
    
    // === CRÉATION DE LA COMMANDE ===
    const newOrder = new Order({
      restaurantId: req.user.restaurantId,
      floorPlanId: finalFloorPlanId,
      tableNumber: finalTableNumber,
      customer: normalizedCustomer,
      items: processedItems,
      status: 'pending',
      priority: priority,
      assignedServer: req.user._id,
      pricing: pricing,
      payment: {
        method: null,
        status: 'pending',
        transactionId: null
      },
      timestamps: {
        ordered: new Date()
      },
      notes: notes
    });
    
    const savedOrder = await newOrder.save();
    
    // Peupler les références pour la réponse
    await savedOrder.populate([
      { path: 'items.menuItem', select: 'name category' },
      { path: 'assignedServer', select: 'firstName lastName' },
      { path: 'restaurantId', select: 'name' },
      { path: 'floorPlanId', select: 'name' }
    ]);
    
    console.log('✅ Commande créée avec succès:', {
      id: savedOrder._id,
      customer: `${normalizedCustomer.firstName} ${normalizedCustomer.lastName}`,
      items: processedItems.length,
      total: pricing.total,
      table: finalTableNumber
    });
    
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: { order: savedOrder }
    });
    
  } catch (error) {
    console.error('❌ Erreur createOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la commande',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer une commande par ID
 * GET /api/orders/:id
 */
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = Order.findById(id);
    query = safePopulate(query, 'items.menuItem', 'name category basePrice');
    query = safePopulate(query, 'assignedServer', 'firstName lastName');
    query = safePopulate(query, 'floorPlanId', 'name');
    query = safePopulate(query, 'restaurantId', 'name');
    
    const order = await query.exec();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérification permissions
    if (order.restaurantId._id.toString() !== req.user.restaurantId.toString()) {
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
 * GET /api/orders/active
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
 * PATCH /api/orders/:id/status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Statuts valides: ${validStatuses.join(', ')}`
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
 * Traiter un paiement
 * POST /api/orders/:id/payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, amount, tip = 0 } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifications
    if (order.payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Commande déjà payée'
      });
    }

    const totalDue = order.pricing.total;
    const finalAmount = amount || totalDue;

    // Mettre à jour le paiement
    order.payment = {
      method,
      amount: finalAmount,
      tip: tip || 0,
      status: 'paid',
      transactionId: `TXN_${Date.now()}`,
      processedAt: new Date()
    };

    // Mettre à jour le pricing si pourboire
    if (tip > 0) {
      order.pricing.tip = tip;
      order.pricing.total = totalDue + tip;
    }

    order.status = 'paid';
    order.timestamps.paid = new Date();

    await order.save();

    res.json({
      success: true,
      message: 'Paiement traité avec succès',
      data: { 
        order,
        payment: order.payment,
        total: order.pricing.total
      }
    });

  } catch (error) {
    console.error('Erreur processPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement du paiement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les statistiques des commandes
 * GET /api/orders/statistics/summary
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const orders = await Order.find({
      restaurantId: req.user.restaurantId,
      'timestamps.ordered': { $gte: startDate }
    });

    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0),
      averageOrderValue: 0,
      statusBreakdown: {},
      topItems: []
    };

    if (summary.totalOrders > 0) {
      summary.averageOrderValue = summary.totalRevenue / summary.totalOrders;
    }

    // Breakdown par statut
    orders.forEach(order => {
      summary.statusBreakdown[order.status] = (summary.statusBreakdown[order.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        summary,
        period,
        startDate,
        endDate: new Date()
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

/**
 * Récupérer les commandes par table
 * GET /api/orders/table/:planId/:tableId
 */
exports.getOrdersByTable = async (req, res) => {
  try {
    const { planId, tableId } = req.params;
    
    const orders = await Order.find({
      restaurantId: req.user.restaurantId,
      floorPlanId: planId,
      tableNumber: tableId,
      status: { $nin: ['paid', 'cancelled'] }
    })
    .populate('items.menuItem', 'name category')
    .populate('assignedServer', 'firstName lastName')
    .sort({ 'timestamps.ordered': -1 });

    res.json({
      success: true,
      data: { 
        orders,
        table: {
          planId,
          tableId
        }
      }
    });

  } catch (error) {
    console.error('Erreur getOrdersByTable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes par table',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};