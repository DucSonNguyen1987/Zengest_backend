const Order = require('../models/Order');
const MenuItem = require('../models/Menu');
const FloorPlan = require('../models/FloorPlan');
const { USER_ROLES, ORDER_STATUS } = require('../utils/constants');
const {
  calculateOrderPricing,
  isValidStatusTransition,
  getValidTransitions,
  validateTableCapacity,
  calculateOrderStats,
  validateSplitPayment
} = require('../utils/orderUtils');

/**
 * Contrôleur pour la gestion des commandes
 */
class OrderController {
  
  /**
   * Crée une nouvelle commande
   */
  static async createOrder(req, res) {
    try {
      const { floorPlanId, tableId, items, customer, notes, service, pricing, metadata } = req.body;
      
      // Assigner le restaurant
      const restaurantId = req.user.role === USER_ROLES.ADMIN 
        ? req.body.restaurantId || req.user.restaurantId
        : req.user.restaurantId;
      
      // Vérifier et récupérer le plan de salle
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
      
      // Vérifier et récupérer la table
      const table = floorPlan.tables.id(tableId);
      if (!table) {
        return res.status(404).json({
          success: false,
          message: 'Table non trouvée'
        });
      }
      
      // Valider la capacité de la table
      const capacityValidation = validateTableCapacity(table, customer.numberOfGuests);
      if (!capacityValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: capacityValidation.message
        });
      }
      
      // Traiter et valider les items
      const processedItems = await OrderController.processOrderItems(items, restaurantId);
      if (processedItems.error) {
        return res.status(400).json({
          success: false,
          message: processedItems.error
        });
      }
      
      // Calculer les prix
      const orderPricing = calculateOrderPricing(processedItems.items, pricing);
      
      // Créer les données de la commande
      const orderData = {
        restaurantId,
        floorPlanId,
        tableId,
        tableSnapshot: {
          number: table.number,
          capacity: table.capacity
        },
        items: processedItems.items,
        customer,
        notes,
        pricing: orderPricing,
        service: {
          ...service,
          assignedServer: service?.assignedServer || req.user._id
        },
        metadata: {
          source: metadata?.source || 'tablet',
          language: metadata?.language || 'fr'
        },
        createdBy: req.user._id
      };
      
      // Créer la commande
      const order = await Order.create(orderData);
      
      // Mettre à jour le statut de la table
      await OrderController.updateTableStatus(table, floorPlan, 'occupied');
      
      // Populer les références
      await order.populate([
        { path: 'restaurantId', select: 'name' },
        { path: 'floorPlanId', select: 'name' },
        { path: 'items.menuItem', select: 'name category' },
        { path: 'service.assignedServer', select: 'firstName lastName' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);
      
      const response = order.toPublicJSON();
      response.tableInfo = {
        number: table.number,
        capacity: table.capacity,
        status: table.status
      };
      
      res.status(201).json({
        success: true,
        message: 'Commande créée avec succès',
        data: { order: response }
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
      
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la création'
      });
    }
  }
  
  /**
   * Traite et valide les items d'une commande
   */
  static async processOrderItems(items, restaurantId) {
    const processedItems = [];
    
    for (const item of items) {
      try {
        const menuItem = await MenuItem.findById(item.menuItem);
        
        // Vérifications de base
        if (!menuItem) {
          return { error: `Item de menu ${item.menuItem} non trouvé` };
        }
        
        if (!menuItem.isActive || !menuItem.availability.isAvailable) {
          return { error: `L'item "${menuItem.name}" n'est pas disponible` };
        }
        
        if (menuItem.restaurantId.toString() !== restaurantId.toString()) {
          return { error: `L'item "${menuItem.name}" n'appartient pas à ce restaurant` };
        }
        
        // Vérifier la gestion des stocks si activée
        if (menuItem.inventory.hasInventory && menuItem.inventory.isOutOfStock) {
          return { error: `L'item "${menuItem.name}" est en rupture de stock` };
        }
        
        if (menuItem.inventory.hasInventory && 
            menuItem.inventory.currentStock < item.quantity) {
          return { 
            error: `Stock insuffisant pour "${menuItem.name}" (${menuItem.inventory.currentStock} disponibles, ${item.quantity} demandés)` 
          };
        }
        
        // Valider la variante de prix
        const variant = menuItem.priceVariants.find(v => 
          v.size === item.selectedVariant.size && 
          Math.abs(v.price - item.selectedVariant.price) < 0.01
        );
        
        if (!variant) {
          return { error: `Variante de prix invalide pour "${menuItem.name}"` };
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
          notes: item.notes || '',
          modifications: item.modifications || [],
          status: 'pending'
        };
        
        processedItems.push(orderItem);
        
      } catch (error) {
        console.error('Erreur lors du traitement de l\'item:', error);
        return { error: `Erreur lors du traitement d'un item de menu` };
      }
    }
    
    return { items: processedItems };
  }
  
  /**
   * Met à jour le statut d'une table
   */
  static async updateTableStatus(table, floorPlan, status) {
    table.status = status;
    await floorPlan.save();
  }
  
  /**
   * Change le statut d'une commande
   */
  static async updateOrderStatus(req, res) {
    try {
      const { status, reason } = req.body;
      const order = req.currentOrder; // Fourni par le middleware de validation
      
      // Vérifier les permissions
      if (req.user.role !== USER_ROLES.ADMIN && 
          req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes'
        });
      }
      
      const oldStatus = order.status;
      
      // Appliquer le nouveau statut
      order.status = status;
      order.lastModifiedBy = req.user._id;
      
      // Ajouter une note si une raison est fournie
      if (reason) {
        const statusNote = `Changement de statut: ${oldStatus} → ${status}. Raison: ${reason}`;
        order.notes = order.notes ? `${order.notes}\n${statusNote}` : statusNote;
      }
      
      await order.save();
      
      // Gérer les changements d'état de table
      await OrderController.handleTableStatusChange(order, status);
      
      // Mettre à jour les stocks si nécessaire
      if (status === ORDER_STATUS.CONFIRMED) {
        await OrderController.updateInventoryForOrder(order, 'reserve');
      } else if (status === ORDER_STATUS.CANCELLED && oldStatus === ORDER_STATUS.CONFIRMED) {
        await OrderController.updateInventoryForOrder(order, 'release');
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
          }
        }
      });
      
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
  
  /**
   * Gère les changements d'état de table selon le statut de la commande
   */
  static async handleTableStatusChange(order, newStatus) {
    try {
      const floorPlan = await FloorPlan.findById(order.floorPlanId);
      const table = floorPlan?.tables.id(order.tableId);
      
      if (!table) return;
      
      if (newStatus === ORDER_STATUS.PAID || newStatus === ORDER_STATUS.CANCELLED) {
        // Vérifier s'il y a d'autres commandes actives sur cette table
        const activeOrdersCount = await Order.countDocuments({
          floorPlanId: order.floorPlanId,
          tableId: order.tableId,
          status: { $nin: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED] },
          _id: { $ne: order._id }
        });
        
        if (activeOrdersCount === 0) {
          table.status = newStatus === ORDER_STATUS.PAID ? 'cleaning' : 'available';
          await floorPlan.save();
        }
      } else if (table.status === 'available') {
        table.status = 'occupied';
        await floorPlan.save();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de table:', error);
    }
  }
  
  /**
   * Met à jour l'inventaire selon les actions sur la commande
   */
  static async updateInventoryForOrder(order, action) {
    try {
      for (const item of order.items) {
        const menuItem = await MenuItem.findById(item.menuItem);
        
        if (menuItem && menuItem.inventory.hasInventory) {
          if (action === 'reserve') {
            // Réserver le stock
            menuItem.inventory.currentStock = Math.max(0, 
              menuItem.inventory.currentStock - item.quantity
            );
            
            // Marquer comme en rupture si nécessaire
            if (menuItem.inventory.currentStock <= menuItem.inventory.lowStockThreshold) {
              menuItem.inventory.isOutOfStock = menuItem.inventory.currentStock === 0;
            }
          } else if (action === 'release') {
            // Libérer le stock
            menuItem.inventory.currentStock += item.quantity;
            menuItem.inventory.isOutOfStock = false;
          }
          
          await menuItem.save();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'inventaire:', error);
    }
  }
  
  /**
   * Traite le paiement d'une commande
   */
  static async processPayment(req, res) {
    try {
      const { method, reference, splits, tip } = req.body;
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Commande non trouvée'
        });
      }
      
      // Vérifications de base
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
      
      // Valider le paiement fractionné si applicable
      if (method === 'split' && splits) {
        const validation = validateSplitPayment(splits, totalWithTip);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.message
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
      
      // Ajouter le pourboire
      if (tip && tip > 0) {
        order.pricing.total = totalWithTip;
        order.notes = order.notes 
          ? `${order.notes}\nPourboire: ${tip}€`
          : `Pourboire: ${tip}€`;
      }
      
      order.status = ORDER_STATUS.PAID;
      order.lastModifiedBy = req.user._id;
      
      await order.save();
      
      // Gérer l'état de la table
      await OrderController.handleTableStatusChange(order, ORDER_STATUS.PAID);
      
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
          }
        }
      });
      
    } catch (error) {
      console.error('Erreur lors du traitement du paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
  
  /**
   * Ajoute des items à une commande existante
   */
  static async addItemsToOrder(req, res) {
    try {
      const { items } = req.body;
      const order = await Order.findById(req.params.id);
      
      if (!order || !order.canBeModified()) {
        return res.status(400).json({
          success: false,
          message: 'Cette commande ne peut plus être modifiée'
        });
      }
      
      // Traiter les nouveaux items
      const processedItems = await OrderController.processOrderItems(items, order.restaurantId);
      if (processedItems.error) {
        return res.status(400).json({
          success: false,
          message: processedItems.error
        });
      }
      
      // Ajouter les items
      order.items.push(...processedItems.items);
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
          addedItems: processedItems.items.map(item => ({
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
  }
  
  /**
   * Calcule les statistiques des commandes
   */
  static async getOrderStatistics(req, res) {
    try {
      const { period = 'today', restaurantId } = req.query;
      
      const targetRestaurantId = req.user.role === USER_ROLES.ADMIN 
        ? restaurantId 
        : req.user.restaurantId;
      
      // Définir la période
      const dateFilter = OrderController.getDateFilter(period);
      
      const baseFilter = {
        restaurantId: targetRestaurantId,
        'timestamps.ordered': dateFilter,
        isActive: true
      };
      
      // Statistiques générales
      const generalStats = await Order.aggregate([
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
          summary: generalStats[0] || {
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
  }
  
  /**
   * Utilitaire pour générer les filtres de date
   */
  static getDateFilter(period) {
    const now = new Date();
    
    switch (period) {
      case 'today':
        return {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lt: new Date(now.setHours(23, 59, 59, 999))
        };
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return {
          $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
          $lt: new Date()
        };
      case 'month':
        return {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date()
        };
      default:
        return {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lt: new Date(now.setHours(23, 59, 59, 999))
        };
    }
  }

  /**
 * Obtenir toutes les commandes avec filtres et pagination
 */
static async getAllOrders(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      dateFrom,
      dateTo,
      restaurantId,
      sortBy = 'timestamps.ordered',
      sortOrder = 'desc'
    } = req.query;
    
    // Construction du filtre
    const filter = { isActive: true };
    
    // Filtrer par restaurant selon le rôle
    if (req.user.role !== 'admin') {
      filter.restaurantId = req.user.restaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }
    
    // Filtres optionnels
    if (status) {
      filter.status = status;
    }
    
    // Filtre par date
    if (dateFrom || dateTo) {
      filter['timestamps.ordered'] = {};
      if (dateFrom) filter['timestamps.ordered'].$gte = new Date(dateFrom);
      if (dateTo) filter['timestamps.ordered'].$lte = new Date(dateTo);
    }
    
    console.log('🔍 Orders filter:', filter);
    
    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Requête avec population des références
    const orders = await Order.find(filter)
      .populate('restaurantId', 'name')
      .populate('floorPlanId', 'name')
      .populate('items.menuItem', 'name category')
      .populate('service.assignedServer', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Compter le total pour la pagination
    const total = await Order.countDocuments(filter);
    
    // Transformer les données pour l'API
    const ordersData = orders.map(order => {
      const orderData = order.toPublicJSON ? order.toPublicJSON() : order.toObject();
      
      // Ajouter des informations calculées
      orderData.itemsCount = order.items?.length || 0;
      orderData.totalAmount = order.pricing?.total || 0;
      orderData.customerInfo = {
        name: order.customer?.name,
        numberOfGuests: order.customer?.numberOfGuests
      };
      
      return orderData;
    });
    
    res.json({
      success: true,
      data: {
        orders: ordersData,
        pagination: {
          totalPages: Math.ceil(total / parseInt(limit)),
          currentPage: parseInt(page),
          total,
          limit: parseInt(limit)
        },
        filters: {
          status,
          dateFrom,
          dateTo,
          restaurantId: filter.restaurantId
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getAllOrders:', error);
    
    // Log détaillé pour le debugging
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Erreur spécifique selon le type
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Paramètre invalide dans la requête',
        error: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des commandes',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
}




}

module.exports = OrderController;