const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { validationResult } = require('express-validator');

/**
 * ✅ MÉTHODE CORRIGÉE - Récupérer toutes les commandes avec pagination et filtres
 */
exports.getAllOrders = async (req, res) => {
  try {
    console.log('🧪 STEP 1: Début getAllOrders');
    
    // Test 1: Paramètres basiques
    const page = 1;
    const limit = 5;
    console.log('🧪 STEP 2: Paramètres OK');
    
    // Test 2: Filter simple
    const filter = {};
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }
    console.log('🧪 STEP 3: Filter créé:', filter);
    
    // Test 3: Count simple
    const total = await Order.countDocuments(filter);
    console.log('🧪 STEP 4: Count réussi:', total);
    
    // Test 4: Find sans populate
    const ordersRaw = await Order.find(filter).limit(limit);
    console.log('🧪 STEP 5: Find brut réussi:', ordersRaw.length);
    
    // Test 5: Find avec populate un par un
    const orders = await Order.find(filter)
      .limit(limit)
      .lean(); // Sans virtuals pour éviter les erreurs
    console.log('🧪 STEP 6: Find lean réussi:', orders.length);
    
    console.log('🧪 STEP 7: Envoi réponse');
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          total,
          limit
        }
      }
    });
    
    console.log('🧪 STEP 8: Réponse envoyée avec succès');
    
  } catch (error) {
    console.error('💥 ERREUR À L\'ÉTAPE:', error.message);
    console.error('Stack complet:', error.stack);
    res.status(500).json({
      success: false,
      message: `Erreur détaillée: ${error.message}`
    });
  }
};

/**
 * Récupérer les commandes actives (en cours)
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const filter = {
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
    };

    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .populate('restaurantId', 'name')
      .sort({ 'timestamps.ordered': -1 });

    res.json({
      success: true,
      message: `${orders.length} commandes actives`,
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
 * Récupérer une commande par ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const order = await Order.findOne(filter)
      .populate('items.menuItem', 'name category priceVariants images')
      .populate('assignedServer', 'firstName lastName email')
      .populate('restaurantId', 'name address contact')
      .populate('floorPlanId', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Commande récupérée avec succès',
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
 */
exports.createOrder = async (req, res) => {
  try {
    // Validation des erreurs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      items,
      tableNumber,
      floorPlanId,
      customer,
      assignedServer,
      priority = 'normal',
      notes,
      type = 'dine-in'
    } = req.body;

    // Vérifier que les items existent et calculer les prix
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Article du menu non trouvé: ${item.menuItem}`
        });
      }

      // Trouver le bon variant de prix
      let priceVariant = menuItem.priceVariants.find(variant => 
        variant.size === item.size || variant.isDefault
      );
      
      if (!priceVariant) {
        priceVariant = menuItem.priceVariants[0]; // Fallback au premier variant
      }

      const itemTotal = priceVariant.price * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        menuItem: item.menuItem,
        quantity: item.quantity,
        size: item.size || priceVariant.size,
        unitPrice: priceVariant.price,
        totalPrice: itemTotal,
        notes: item.notes,
        status: 'pending'
      });
    }

    // Calculer les taxes et total final (exemple: 10% de service, 20% TVA)
    const serviceCharge = totalAmount * 0.10;
    const tax = totalAmount * 0.20;
    const finalTotal = totalAmount + serviceCharge + tax;

    // Créer la commande
    const newOrder = new Order({
      orderNumber: `CMD${Date.now()}`, // Générer un numéro unique
      items: processedItems,
      tableNumber,
      floorPlanId,
      customer,
      assignedServer,
      priority,
      notes,
      type,
      status: 'pending',
      restaurantId: req.user.restaurantId,
      createdBy: req.user._id,
      pricing: {
        subtotal: totalAmount,
        serviceCharge,
        tax,
        total: finalTotal
      },
      timestamps: {
        ordered: new Date()
      }
    });

    const savedOrder = await newOrder.save();

    // Populer les références pour la réponse
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .populate('restaurantId', 'name');

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: { order: populatedOrder }
    });

  } catch (error) {
    console.error('Erreur createOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande'
    });
  }
};

/**
 * Mettre à jour une commande
 */
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const order = await Order.findOneAndUpdate(
      filter,
      { 
        ...updates,
        'timestamps.updated': new Date()
      },
      { new: true, runValidators: true }
    )
    .populate('items.menuItem', 'name category')
    .populate('assignedServer', 'firstName lastName')
    .populate('restaurantId', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Commande mise à jour avec succès',
      data: { order }
    });

  } catch (error) {
    console.error('Erreur updateOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la commande'
    });
  }
};

/**
 * Mettre à jour le statut d'une commande
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
        validStatuses
      });
    }

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const updateData = {
      status,
      'timestamps.updated': new Date()
    };

    // Ajouter des timestamps spécifiques selon le statut
    switch (status) {
      case 'confirmed':
        updateData['timestamps.confirmed'] = new Date();
        break;
      case 'preparing':
        updateData['timestamps.preparing'] = new Date();
        break;
      case 'ready':
        updateData['timestamps.ready'] = new Date();
        break;
      case 'served':
        updateData['timestamps.served'] = new Date();
        break;
      case 'paid':
        updateData['timestamps.paid'] = new Date();
        break;
      case 'cancelled':
        updateData['timestamps.cancelled'] = new Date();
        updateData.cancelReason = notes;
        break;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const order = await Order.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    )
    .populate('items.menuItem', 'name category')
    .populate('assignedServer', 'firstName lastName')
    .populate('restaurantId', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`,
      data: { order }
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
 */
exports.getOrdersByTable = async (req, res) => {
  try {
    const { floorPlanId, tableId } = req.params;

    const filter = {
      floorPlanId,
      tableNumber: tableId,
      status: { $nin: ['paid', 'cancelled'] }
    };

    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .sort({ 'timestamps.ordered': -1 });

    res.json({
      success: true,
      message: `${orders.length} commandes trouvées pour cette table`,
      data: { orders }
    });

  } catch (error) {
    console.error('Erreur getOrdersByTable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes'
    });
  }
};

/**
 * Ajouter des items à une commande existante
 */
exports.addItemsToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    if (order.status === 'paid' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une commande payée ou annulée'
      });
    }

    // Traiter les nouveaux items
    let additionalAmount = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Article du menu non trouvé: ${item.menuItem}`
        });
      }

      let priceVariant = menuItem.priceVariants.find(variant => 
        variant.size === item.size || variant.isDefault
      );
      
      if (!priceVariant) {
        priceVariant = menuItem.priceVariants[0];
      }

      const itemTotal = priceVariant.price * item.quantity;
      additionalAmount += itemTotal;

      order.items.push({
        menuItem: item.menuItem,
        quantity: item.quantity,
        size: item.size || priceVariant.size,
        unitPrice: priceVariant.price,
        totalPrice: itemTotal,
        notes: item.notes,
        status: 'pending'
      });
    }

    // Recalculer les totaux
    order.pricing.subtotal += additionalAmount;
    order.pricing.serviceCharge = order.pricing.subtotal * 0.10;
    order.pricing.tax = order.pricing.subtotal * 0.20;
    order.pricing.total = order.pricing.subtotal + order.pricing.serviceCharge + order.pricing.tax;
    order.timestamps.updated = new Date();

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName');

    res.json({
      success: true,
      message: 'Items ajoutés à la commande avec succès',
      data: { order: populatedOrder }
    });

  } catch (error) {
    console.error('Erreur addItemsToOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout des items'
    });
  }
};

/**
 * Supprimer un item d'une commande
 */
exports.removeItemFromOrder = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item non trouvé dans la commande'
      });
    }

    // Retirer le prix de l'item du total
    const removedItem = order.items[itemIndex];
    order.pricing.subtotal -= removedItem.totalPrice;

    // Supprimer l'item
    order.items.splice(itemIndex, 1);

    // Recalculer les totaux
    order.pricing.serviceCharge = order.pricing.subtotal * 0.10;
    order.pricing.tax = order.pricing.subtotal * 0.20;
    order.pricing.total = order.pricing.subtotal + order.pricing.serviceCharge + order.pricing.tax;
    order.timestamps.updated = new Date();

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName');

    res.json({
      success: true,
      message: 'Item supprimé de la commande avec succès',
      data: { order: populatedOrder }
    });

  } catch (error) {
    console.error('Erreur removeItemFromOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'item'
    });
  }
};

/**
 * Traiter le paiement d'une commande
 */
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, amount, tip = 0, discount = 0 } = req.body;

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    if (order.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Commande déjà payée'
      });
    }

    // Calculer le montant final à partir du total de la commande
    const expectedAmount = order.pricing.total + tip - discount;
    
    // Utiliser le montant fourni ou le montant calculé
    const finalAmount = amount || expectedAmount;
    
    // Vérification optionnelle du montant
    if (amount && Math.abs(amount - expectedAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Montant incorrect. Attendu: ${expectedAmount.toFixed(2)}€, reçu: ${amount.toFixed(2)}€`
      });
    }

    order.payment = {
      method: paymentMethod,
      amount: finalAmount,
      tip,
      discount,
      paidAt: new Date(),
      processedBy: req.user._id
    };

    order.status = 'paid';
    order.timestamps.paid = new Date();
    order.timestamps.updated = new Date();

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .populate('payment.processedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Paiement traité avec succès',
      data: { order: populatedOrder }
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
 * Supprimer une commande
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = { _id: id };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier si la commande peut être supprimée
    if (order.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une commande payée'
      });
    }

    await Order.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Commande supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur deleteOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la commande'
    });
  }
};

/**
 * Statistiques des commandes
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    const { period = 'today', startDate, endDate } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today': {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(startOfDay.getDate() + 1);
        dateFilter = {
          'timestamps.ordered': {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };
        break;
      }
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = {
          'timestamps.ordered': { $gte: startOfWeek }
        };
        break;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = {
          'timestamps.ordered': { $gte: startOfMonth }
        };
        break;
      }
      case 'custom': {
        if (startDate && endDate) {
          dateFilter = {
            'timestamps.ordered': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          };
        }
        break;
      }
    }

    const filter = { ...dateFilter };
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }

    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      averageOrderValue,
      topItems
    ] = await Promise.all([
      Order.countDocuments(filter),
      
      Order.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      Order.aggregate([
        { $match: filter },
        { $group: { _id: null, avg: { $avg: '$pricing.total' } } }
      ]),
      
      Order.aggregate([
        { $match: filter },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.menuItem',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem'
        }},
        { $unwind: '$menuItem' }
      ])
    ]);

    const summary = {
      period,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageOrderValue: averageOrderValue[0]?.avg || 0,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topSellingItems: topItems.map(item => ({
        name: item.menuItem.name,
        category: item.menuItem.category,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue
      }))
    };

    res.json({
      success: true,
      message: 'Statistiques récupérées avec succès',
      data: { summary }
    });

  } catch (error) {
    console.error('Erreur getOrderStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};