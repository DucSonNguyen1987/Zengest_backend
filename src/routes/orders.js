const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/Menu');
const FloorPlan = require('../models/FloorPlan');
const { auth } = require('../middleware/auth');
const { requireSameRestaurant, requireStaff } = require('../middleware/roleCheck');
const { USER_ROLES, ORDER_STATUS } = require('../utils/constants');
const {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderStatus,
  validateAddItem,
  validatePayment,
  validateOrderFilters,
  validateStatusTransition
} = require('../middleware/orderValidation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// GET /api/orders - Obtenir toutes les commandes (avec filtres)
router.get('/', requireSameRestaurant, validateOrderFilters, async (req, res) => {
  try {
    const {
      page,
      limit,
      status,
      tableNumber,
      assignedServer,
      priority,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      customerPhone,
      sortBy,
      sortOrder
    } = req.query;
    
    // Construction du filtre de base
    const filter = { isActive: true };
    
    // Filtrer par restaurant
    if (req.user.role !== USER_ROLES.ADMIN) {
      filter.restaurantId = req.user.restaurantId;
    } else if (req.query.restaurantId) {
      filter.restaurantId = req.query.restaurantId;
    }
    
    // Filtres spécifiques
    if (status) filter.status = status;
    if (assignedServer) filter['service.assignedServer'] = assignedServer;
    if (priority) filter['service.priority'] = priority;
    if (customerPhone) filter['customer.phone'] = new RegExp(customerPhone, 'i');
    
    // Filtres de montant
    if (minAmount || maxAmount) {
      filter['pricing.total'] = {};
      if (minAmount) filter['pricing.total'].$gte = parseFloat(minAmount);
      if (maxAmount) filter['pricing.total'].$lte = parseFloat(maxAmount);
    }
    
    // Filtres de date
    if (dateFrom || dateTo) {
      filter['timestamps.ordered'] = {};
      if (dateFrom) filter['timestamps.ordered'].$gte = new Date(dateFrom);
      if (dateTo) filter['timestamps.ordered'].$lte = new Date(dateTo);
    }
    
    // Pipeline d'agrégation si filtrage par numéro de table
    let query;
    if (tableNumber) {
      query = Order.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'floorplans',
            localField: 'floorPlanId',
            foreignField: '_id',
            as: 'floorPlan'
          }
        },
        { $unwind: '$floorPlan' },
        {
          $addFields: {
            table: {
              $filter: {
                input: '$floorPlan.tables',
                cond: { $eq: ['$$this._id', '$tableId'] }
              }
            }
          }
        },
        { $unwind: '$table' },
        { $match: { 'table.number': tableNumber } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]);
    } else {
      // Construction du tri
      const sortOptions = {};
      if (sortBy === 'total') {
        sortOptions['pricing.total'] = sortOrder === 'desc' ? -1 : 1;
      } else if (sortBy === 'priority') {
        sortOptions['service.priority'] = sortOrder === 'desc' ? -1 : 1;
      } else if (sortBy === 'status') {
        sortOptions.status = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions['timestamps.ordered'] = sortOrder === 'desc' ? -1 : 1;
      }
      
      query = Order.find(filter)
        .populate('floorPlanId', 'name')
        .populate('items.menuItem', 'name category')
        .populate('service.assignedServer', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort(sortOptions);
    }
    
    const orders = await query;
    const total = await Order.countDocuments(filter);
    
    // Ajouter les informations de table pour chaque commande
    const ordersWithTables = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toPublicJSON();
        
        // Récupérer les infos de la table depuis le plan de salle
        const floorPlan = await FloorPlan.findById(order.floorPlanId);
        if (floorPlan) {
          const table = floorPlan.tables.id(order.tableId);
          if (table) {
            orderObj.tableInfo = {
              number: table.number,
              capacity: table.capacity,
              status: table.status
            };
          }
        }
        
        return orderObj;
      })
    );
    
    res.json({
      success: true,
      data: {
        orders: ordersWithTables,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total,
          limit
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/orders/active - Obtenir les commandes actives
router.get('/active', requireSameRestaurant, async (req, res) => {
  try {
    const restaurantId = req.user.role === USER_ROLES.ADMIN 
      ? req.query.restaurantId 
      : req.user.restaurantId;
      
    const activeOrders = await Order.findActive(restaurantId)
      .populate('items.menuItem', 'name category')
      .populate('service.assignedServer', 'firstName lastName');
    
    // Ajouter les informations de table
    const ordersWithTables = await Promise.all(
      activeOrders.map(async (order) => {
        const orderObj = order.toPublicJSON();
        const floorPlan = await FloorPlan.findById(order.floorPlanId);
        if (floorPlan) {
          const table = floorPlan.tables.id(order.tableId);
          if (table) {
            orderObj.tableInfo = {
              number: table.number,
              capacity: table.capacity,
              status: table.status
            };
          }
        }
        return orderObj;
      })
    );
    
    res.json({
      success: true,
      data: { orders: ordersWithTables }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes actives:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/orders/table/:floorPlanId/:tableId - Obtenir les commandes d'une table
router.get('/table/:floorPlanId/:tableId', requireSameRestaurant, async (req, res) => {
  try {
    const { floorPlanId, tableId } = req.params;
    const { status, limit = 10 } = req.query;
    
    // Vérifier l'accès au plan de salle
    const floorPlan = await FloorPlan.findById(floorPlanId);
    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de salle non trouvé'
      });
    }
    
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== floorPlan.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce plan de salle'
      });
    }
    
    // Vérifier que la table existe
    const table = floorPlan.tables.id(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table non trouvée'
      });
    }
    
    const orders = await Order.findByTable(floorPlanId, tableId, { status })
      .populate('items.menuItem', 'name category')
      .populate('service.assignedServer', 'firstName lastName')
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        orders: orders.map(order => order.toPublicJSON()),
        table: {
          id: table._id,
          number: table.number,
          capacity: table.capacity,
          status: table.status
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes de la table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/orders/:id - Obtenir une commande spécifique
router.get('/:id', requireSameRestaurant, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name')
      .populate('floorPlanId', 'name')
      .populate('items.menuItem', 'name description category')
      .populate('service.assignedServer', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérifier les permissions d'accès
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== order.restaurantId._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette commande'
      });
    }
    
    // Ajouter les informations de table
    const floorPlan = await FloorPlan.findById(order.floorPlanId);
    const table = floorPlan?.tables.id(order.tableId);
    
    const orderData = order.toPublicJSON();
    if (table) {
      orderData.tableInfo = {
        number: table.number,
        capacity: table.capacity,
        status: table.status
      };
    }
    
    res.json({
      success: true,
      data: { order: orderData }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/orders - Créer une nouvelle commande
router.post('/', requireStaff, validateCreateOrder, async (req, res) => {
  try {
    const { floorPlanId, tableId, items, customer, notes, service, pricing, metadata } = req.body;
    
    // Assigner automatiquement le restaurant si pas admin
    const restaurantId = req.user.role === USER_ROLES.ADMIN 
      ? req.body.restaurantId || req.user.restaurantId
      : req.user.restaurantId;
    
    // Vérifier l'accès au plan de salle
    const floorPlan = await FloorPlan.findById(floorPlanId);
    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de salle non trouvé'
      });
    }
    
    if (floorPlan.restaurantId.toString() !== restaurantId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Le plan de salle ne correspond pas au restaurant'
      });
    }
    
    // Vérifier que la table existe et récupérer ses infos
    const table = floorPlan.tables.id(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table non trouvée'
      });
    }
    
    // Vérifier que la table peut accueillir le nombre de convives
    if (customer.numberOfGuests > table.capacity) {
      return res.status(400).json({
        success: false,
        message: `La table ${table.number} ne peut accueillir que ${table.capacity} convives (${customer.numberOfGuests} demandés)`
      });
    }
    
    // Vérifier la disponibilité des items de menu et construire les données
    const processedItems = [];
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Item de menu ${item.menuItem} non trouvé`
        });
      }
      
      if (!menuItem.isActive || !menuItem.availability.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `L'item "${menuItem.name}" n'est pas disponible`
        });
      }
      
      if (menuItem.restaurantId.toString() !== restaurantId.toString()) {
        return res.status(400).json({
          success: false,
          message: `L'item "${menuItem.name}" n'appartient pas à ce restaurant`
        });
      }
      
      // Vérifier que la variante de prix existe
      const variant = menuItem.priceVariants.find(v => 
        v.size === item.selectedVariant.size && v.price === item.selectedVariant.price
      );
      
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: `Variante de prix invalide pour "${menuItem.name}"`
        });
      }
      
      // Construire l'item de commande
      const orderItem = {
        menuItem: menuItem._id,
        menuItemSnapshot: {
          name: menuItem.name,
          description: menuItem.description,
          category: menuItem.category,
          basePrice: menuItem.basePrice
        },
        selectedVariant: item.selectedVariant,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice: variant.price * item.quantity,
        notes: item.notes,
        modifications: item.modifications
      };
      
      processedItems.push(orderItem);
    }
    
    // Créer la commande
    const orderData = {
      restaurantId,
      floorPlanId,
      tableId,
      tableSnapshot: {
        number: table.number,
        capacity: table.capacity
      },
      items: processedItems,
      customer,
      notes,
      service: {
        ...service,
        assignedServer: service?.assignedServer || req.user._id
      },
      pricing: {
        tax: { rate: pricing?.tax?.rate || 20 },
        service: { rate: pricing?.service?.rate || 0 },
        discount: pricing?.discount || { type: 'percentage', value: 0 }
      },
      metadata: {
        ...metadata,
        source: metadata?.source || 'tablet'
      },
      createdBy: req.user._id
    };
    
    const order = await Order.create(orderData);
    
    // Mettre à jour le statut de la table
    table.status = 'occupied';
    await floorPlan.save();
    
    // Populer les références
    await order.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'floorPlanId', select: 'name' },
      { path: 'items.menuItem', select: 'name category' },
      { path: 'service.assignedServer', select: 'firstName lastName' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);
    
    const orderData2 = order.toPublicJSON();
    orderData2.tableInfo = {
      number: table.number,
      capacity: table.capacity,
      status: table.status
    };
    
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: { order: orderData2 }
    });
    
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création'
    });
  }
});

// PUT /api/orders/:id - Mettre à jour une commande
router.put('/:id', requireStaff, validateUpdateOrder, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    // Vérifier si la commande peut être modifiée
    if (!order.canBeModified()) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande ne peut plus être modifiée'
      });
    }
    
    // Mettre à jour les champs autorisés
    const allowedFields = ['customer', 'notes', 'service', 'pricing'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = { ...order[field], ...req.body[field] };
      }
    });
    
    // Traitement spécial pour les items
    if (req.body.items) {
      // Valider et traiter les nouveaux items comme pour la création
      const processedItems = [];
      for (const item of req.body.items) {
        const menuItem = await MenuItem.findById(item.menuItem);
        
        if (!menuItem || !menuItem.isActive) {
          return res.status(400).json({
            success: false,
            message: `Item de menu non disponible`
          });
        }
        
        const variant = menuItem.priceVariants.find(v => 
          v.size === item.selectedVariant.size && v.price === item.selectedVariant.price
        );
        
        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `Variante de prix invalide pour "${menuItem.name}"`
          });
        }
        
        const orderItem = {
          menuItem: menuItem._id,
          menuItemSnapshot: {
            name: menuItem.name,
            description: menuItem.description,
            category: menuItem.category,
            basePrice: menuItem.basePrice
          },
          selectedVariant: item.selectedVariant,
          quantity: item.quantity,
          unitPrice: variant.price,
          totalPrice: variant.price * item.quantity,
          notes: item.notes,
          modifications: item.modifications
        };
        
        processedItems.push(orderItem);
      }
      
      updates.items = processedItems;
    }
    
    updates.lastModifiedBy = req.user._id;
    updates['metadata.version'] = (order.metadata.version || 1) + 1;
    
    // Appliquer les mises à jour
    Object.assign(order, updates);
    await order.save();
    
    await order.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'floorPlanId', select: 'name' },
      { path: 'items.menuItem', select: 'name category' },
      { path: 'service.assignedServer', select: 'firstName lastName' },
      { path: 'lastModifiedBy', select: 'firstName lastName' }
    ]);
    
    res.json({
      success: true,
      message: 'Commande mise à jour avec succès',
      data: { order: order.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commande:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
});

// PATCH /api/orders/:id/status - Changer le statut d'une commande
router.patch('/:id/status', requireStaff, validateOrderStatus, validateStatusTransition, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const order = req.currentOrder; // Fourni par validateStatusTransition
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    const oldStatus = order.status;
    order.status = status;
    order.lastModifiedBy = req.user._id;
    
    // Ajouter une note si une raison est fournie
    if (reason) {
      const statusNote = `Changement de statut: ${oldStatus} → ${status}. Raison: ${reason}`;
      order.notes = order.notes ? `${order.notes}\n${statusNote}` : statusNote;
    }
    
    await order.save();
    
    // Mettre à jour le statut de la table si nécessaire
    const floorPlan = await FloorPlan.findById(order.floorPlanId);
    const table = floorPlan?.tables.id(order.tableId);
    
    if (table) {
      if (status === ORDER_STATUS.PAID || status === ORDER_STATUS.CANCELLED) {
        // Vérifier s'il y a d'autres commandes actives sur cette table
        const activeOrdersCount = await Order.countDocuments({
          floorPlanId: order.floorPlanId,
          tableId: order.tableId,
          status: { $nin: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED] },
          _id: { $ne: order._id }
        });
        
        if (activeOrdersCount === 0) {
          table.status = 'available';
          await floorPlan.save();
        }
      } else if (table.status === 'available') {
        table.status = 'occupied';
        await floorPlan.save();
      }
    }
    
    res.json({
      success: true,
      message: `Statut de la commande changé vers "${status}"`,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          timestamps: order.timestamps
        },
        tableStatus: table?.status
      }
    });
    
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/orders/:id/items - Ajouter des items à une commande
router.post('/:id/items', requireStaff, validateAddItem, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    if (!order.canBeModified()) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande ne peut plus être modifiée'
      });
    }
    
    // Traiter les nouveaux items
    const processedItems = [];
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      
      if (!menuItem || !menuItem.isActive) {
        return res.status(400).json({
          success: false,
          message: `Item de menu non disponible`
        });
      }
      
      const variant = menuItem.priceVariants.find(v => 
        v.size === item.selectedVariant.size && v.price === item.selectedVariant.price
      );
      
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: `Variante de prix invalide pour "${menuItem.name}"`
        });
      }
      
      const orderItem = {
        menuItem: menuItem._id,
        menuItemSnapshot: {
          name: menuItem.name,
          description: menuItem.description,
          category: menuItem.category,
          basePrice: menuItem.basePrice
        },
        selectedVariant: item.selectedVariant,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice: variant.price * item.quantity,
        notes: item.notes,
        modifications: item.modifications
      };
      
      processedItems.push(orderItem);
    }
    
    // Ajouter les items à la commande
    order.items.push(...processedItems);
    order.lastModifiedBy = req.user._id;
    order.metadata.version += 1;
    
    await order.save();
    
    res.json({
      success: true,
      message: `${items.length} item(s) ajouté(s) à la commande`,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          itemsCount: order.items.length,
          total: order.pricing.total
        },
        addedItems: processedItems.map(item => ({
          name: item.menuItemSnapshot.name,
          quantity: item.quantity,
          totalPrice: item.totalPrice
        }))
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'items:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/orders/:id/items/:itemId - Supprimer un item d'une commande
router.delete('/:id/items/:itemId', requireStaff, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    if (!order.canBeModified()) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande ne peut plus être modifiée'
      });
    }
    
    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item non trouvé dans cette commande'
      });
    }
    
    // Vérifier qu'il restera au moins un item
    if (order.items.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer le dernier item. Annulez plutôt la commande.'
      });
    }
    
    const itemName = item.menuItemSnapshot.name;
    item.remove();
    
    order.lastModifiedBy = req.user._id;
    order.metadata.version += 1;
    
    await order.save();
    
    res.json({
      success: true,
      message: `Item "${itemName}" supprimé de la commande`,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          itemsCount: order.items.length,
          total: order.pricing.total
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression d\'item:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/orders/:id/payment - Traiter le paiement d'une commande
router.post('/:id/payment', requireStaff, validatePayment, async (req, res) => {
  try {
    const { method, reference, splits, tip } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    if (order.status !== ORDER_STATUS.SERVED) {
      return res.status(400).json({
        success: false,
        message: 'La commande doit être servie avant le paiement'
      });
    }
    
    if (order.payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cette commande a déjà été payée'
      });
    }
    
    // Calculer le total avec pourboire
    const totalWithTip = order.pricing.total + (tip || 0);
    
    // Valider les montants pour le paiement fractionné
    if (method === 'split' && splits) {
      const splitsTotal = splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(splitsTotal - totalWithTip) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Le total des paiements fractionnés (${splitsTotal}€) ne correspond pas au total à payer (${totalWithTip}€)`
        });
      }
    }
    
    // Mettre à jour le paiement
    order.payment = {
      method,
      status: 'paid',
      reference,
      splits: method === 'split' ? splits : undefined
    };
    
    // Ajouter le pourboire si applicable
    if (tip && tip > 0) {
      order.pricing.total = totalWithTip;
      order.notes = order.notes 
        ? `${order.notes}\nPourboire: ${tip}€`
        : `Pourboire: ${tip}€`;
    }
    
    order.status = ORDER_STATUS.PAID;
    order.lastModifiedBy = req.user._id;
    
    await order.save();
    
    // Libérer la table si c'est la dernière commande active
    const floorPlan = await FloorPlan.findById(order.floorPlanId);
    const table = floorPlan?.tables.id(order.tableId);
    
    if (table) {
      const activeOrdersCount = await Order.countDocuments({
        floorPlanId: order.floorPlanId,
        tableId: order.tableId,
        status: { $nin: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED] },
        _id: { $ne: order._id }
      });
      
      if (activeOrdersCount === 0) {
        table.status = 'cleaning'; // Table à nettoyer après paiement
        await floorPlan.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Paiement traité avec succès',
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.pricing.total,
          payment: {
            method: order.payment.method,
            status: order.payment.status
          }
        },
        tableStatus: table?.status
      }
    });
    
  } catch (error) {
    console.error('Erreur lors du traitement du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/orders/statistics/summary - Statistiques des commandes
router.get('/statistics/summary', requireSameRestaurant, async (req, res) => {
  try {
    const { period = 'today', restaurantId } = req.query;
    
    const targetRestaurantId = req.user.role === USER_ROLES.ADMIN 
      ? restaurantId 
      : req.user.restaurantId;
    
    // Définir la période
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter = {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lt: new Date(now.setHours(23, 59, 59, 999))
        };
        break;
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = {
          $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
          $lt: new Date()
        };
        break;
      case 'month':
        dateFilter = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date()
        };
        break;
    }
    
    const baseFilter = {
      restaurantId: targetRestaurantId,
      'timestamps.ordered': dateFilter,
      isActive: true
    };
    
    // Statistiques générales
    const stats = await Order.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          totalGuests: { $sum: '$customer.numberOfGuests' }
        }
      }
    ]);
    
    // Répartition par statut
    const statusStats = await Order.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);
    
    // Top des serveurs
    const serverStats = await Order.aggregate([
      { $match: { ...baseFilter, 'service.assignedServer': { $exists: true } } },
      {
        $group: {
          _id: '$service.assignedServer',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'server'
        }
      },
      { $unwind: '$server' }
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        summary: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          totalGuests: 0
        },
        statusBreakdown: statusStats,
        topServers: serverStats.map(s => ({
          id: s._id,
          name: `${s.server.firstName} ${s.server.lastName}`,
          orderCount: s.orderCount,
          totalRevenue: s.totalRevenue
        }))
      }
    });
    
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;