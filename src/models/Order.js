const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../utils/constants');

// Schéma pour un item de commande
const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: [true, 'L\'item de menu est requis']
  },
  
  // Copie des données du menu au moment de la commande (pour historique)
  menuItemSnapshot: {
    name: { type: String, required: true },
    description: String,
    category: String,
    basePrice: { type: Number, required: true }
  },
  
  // Variante de prix sélectionnée
  selectedVariant: {
    size: { type: String, required: true },
    price: { type: Number, required: true }
  },
  
  quantity: {
    type: Number,
    required: [true, 'La quantité est requise'],
    min: [1, 'La quantité doit être d\'au moins 1']
  },
  
  // Prix unitaire au moment de la commande
  unitPrice: {
    type: Number,
    required: [true, 'Le prix unitaire est requis'],
    min: [0, 'Le prix ne peut être négatif']
  },
  
  // Prix total pour cet item (unitPrice * quantity)
  totalPrice: {
    type: Number,
    required: [true, 'Le prix total est requis'],
    min: [0, 'Le prix total ne peut être négatif']
  },
  
  // Notes spéciales pour cet item
  notes: {
    type: String,
    maxlength: [200, 'Les notes ne peuvent dépasser 200 caractères']
  },
  
  // Statut spécifique à cet item
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served'],
    default: 'pending'
  },
  
  // Modifications/customisation
  modifications: [String]
}, { _id: true });

// Schéma principal pour une commande
const orderSchema = new mongoose.Schema({
  // Numéro de commande unique - CORRIGÉ: pas required ici car généré automatiquement
  orderNumber: {
    type: String,
    unique: true,
    sparse: true // Permet les valeurs null pendant la création
  },
  
  // Restaurant concerné
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'L\'ID du restaurant est requis']
  },
  
  // Plan de salle et table
  floorPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FloorPlan',
    required: [true, 'L\'ID du plan de salle est requis']
  },
  
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'L\'ID de la table est requis']
  },
  
  // Informations de la table au moment de la commande
  tableSnapshot: {
    number: { type: String, required: true },
    capacity: { type: Number, required: true }
  },
  
  // Items commandés
  items: {
    type: [orderItemSchema],
    required: [true, 'Au moins un item est requis'],
    validate: {
      validator: function(items) {
        return items.length > 0;
      },
      message: 'Au moins un item est requis'
    }
  },
  
  // Informations client
  customer: {
    name: String,
    phone: String,
    email: String,
    numberOfGuests: {
      type: Number,
      min: [1, 'Le nombre de convives doit être d\'au moins 1'],
      required: true
    }
  },
  
  // Statut global de la commande
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING,
    required: true
  },
  
  // Calculs financiers
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    
    // TVA (calculée automatiquement)
    tax: {
      rate: { type: Number, default: 20 }, // Pourcentage
      amount: { type: Number, default: 0 }
    },
    
    // Service (optionnel)
    service: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    
    // Réductions
    discount: {
      type: { type: String, enum: ['percentage', 'amount'], default: 'percentage' },
      value: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      reason: String
    },
    
    // Total final
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  // Timestamps importants
  timestamps: {
    ordered: { type: Date, default: Date.now },
    confirmed: Date,
    preparing: Date,
    ready: Date,
    served: Date,
    paid: Date,
    cancelled: Date
  },
  
  // Notes générales
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent dépasser 500 caractères']
  },
  
  // Informations de service
  service: {
    // Serveur assigné
    assignedServer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Temps estimé de préparation (en minutes)
    estimatedTime: Number,
    
    // Priorité
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    }
  },
  
  // Paiement
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'mobile', 'voucher', 'split'],
      default: 'card'
    },
    
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    
    reference: String,
    
    // Pour les paiements fractionnés
    splits: [{
      method: String,
      amount: Number,
      reference: String
    }]
  },
  
  // Métadonnées
  metadata: {
    source: {
      type: String,
      enum: ['tablet', 'pos', 'mobile', 'web', 'phone'],
      default: 'tablet'
    },
    
    language: {
      type: String,
      default: 'fr'
    },
    
    version: {
      type: Number,
      default: 1
    }
  },
  
  // Utilisateur qui a créé la commande
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Utilisateur qui a modifié en dernier
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Soft delete
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
orderSchema.index({ restaurantId: 1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, 'timestamps.ordered': -1 });
orderSchema.index({ floorPlanId: 1, tableId: 1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ 'service.assignedServer': 1 });

// Middleware pour générer le numéro de commande - VERSION CORRIGÉE
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Créer des nouvelles instances de Date pour éviter les mutations
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        // Compter les commandes du jour pour ce restaurant
        const count = await this.constructor.countDocuments({
          restaurantId: this.restaurantId,
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        });
        
        const orderNumber = `${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
        
        // Vérifier l'unicité
        const existing = await this.constructor.findOne({ orderNumber });
        if (!existing) {
          this.orderNumber = orderNumber;
          console.log(`🔢 OrderNumber généré: ${this.orderNumber} (tentative ${attempts + 1})`);
          break;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Impossible de générer un orderNumber unique après ${maxAttempts} tentatives`);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération du orderNumber:', error);
      return next(error);
    }
  }
  
  next();
});

// Middleware pour calculer les prix automatiquement
orderSchema.pre('save', function(next) {
  // Calculer le sous-total
  this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculer la TVA
  this.pricing.tax.amount = (this.pricing.subtotal * this.pricing.tax.rate) / 100;
  
  // Calculer le service
  this.pricing.service.amount = (this.pricing.subtotal * this.pricing.service.rate) / 100;
  
  // Calculer la réduction
  if (this.pricing.discount.type === 'percentage') {
    this.pricing.discount.amount = (this.pricing.subtotal * this.pricing.discount.value) / 100;
  } else {
    this.pricing.discount.amount = this.pricing.discount.value;
  }
  
  // Calculer le total
  this.pricing.total = this.pricing.subtotal + 
                      this.pricing.tax.amount + 
                      this.pricing.service.amount - 
                      this.pricing.discount.amount;
  
  // S'assurer que le total n'est pas négatif
  this.pricing.total = Math.max(0, this.pricing.total);
  
  next();
});

// Middleware pour mettre à jour les timestamps selon le statut
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case ORDER_STATUS.CONFIRMED:
        if (!this.timestamps.confirmed) this.timestamps.confirmed = now;
        break;
      case ORDER_STATUS.PREPARING:
        if (!this.timestamps.preparing) this.timestamps.preparing = now;
        break;
      case ORDER_STATUS.READY:
        if (!this.timestamps.ready) this.timestamps.ready = now;
        break;
      case ORDER_STATUS.SERVED:
        if (!this.timestamps.served) this.timestamps.served = now;
        break;
      case ORDER_STATUS.PAID:
        if (!this.timestamps.paid) this.timestamps.paid = now;
        this.payment.status = 'paid';
        break;
      case ORDER_STATUS.CANCELLED:
        if (!this.timestamps.cancelled) this.timestamps.cancelled = now;
        break;
    }
  }
  
  next();
});

// Virtuel pour obtenir la durée depuis la commande
orderSchema.virtual('duration').get(function() {
  const now = new Date();
  const ordered = this.timestamps.ordered;
  return Math.floor((now - ordered) / 1000 / 60); // en minutes
});

// Virtuel pour obtenir le temps restant estimé
orderSchema.virtual('estimatedTimeRemaining').get(function() {
  if (!this.service.estimatedTime) return null;
  
  const elapsed = this.duration;
  const remaining = this.service.estimatedTime - elapsed;
  return Math.max(0, remaining);
});

// Méthode pour obtenir les items par statut
orderSchema.methods.getItemsByStatus = function(status) {
  return this.items.filter(item => item.status === status);
};

// Méthode pour vérifier si la commande peut être modifiée
orderSchema.methods.canBeModified = function() {
  return [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(this.status);
};

// Méthode pour vérifier si la commande peut être annulée
orderSchema.methods.canBeCancelled = function() {
  return ![ORDER_STATUS.SERVED, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED].includes(this.status);
};

// Méthode pour ajouter un item
orderSchema.methods.addItem = function(itemData) {
  if (!this.canBeModified()) {
    throw new Error('La commande ne peut plus être modifiée');
  }
  
  this.items.push(itemData);
  this.metadata.version += 1;
};

// Méthode pour supprimer un item
orderSchema.methods.removeItem = function(itemId) {
  if (!this.canBeModified()) {
    throw new Error('La commande ne peut plus être modifiée');
  }
  
  this.items.id(itemId).remove();
  this.metadata.version += 1;
};

// Méthode pour obtenir les informations publiques
orderSchema.methods.toPublicJSON = function() {
  const order = this.toObject({ virtuals: true });
  
  // Supprimer les champs sensibles
  delete order.__v;
  delete order.payment.reference;
  delete order.payment.splits;
  
  return order;
};

// Méthode statique pour obtenir les commandes par table
orderSchema.statics.findByTable = function(floorPlanId, tableId, options = {}) {
  const filter = { 
    floorPlanId, 
    tableId,
    isActive: true 
  };
  
  if (options.status) {
    filter.status = options.status;
  }
  
  return this.find(filter)
    .populate('items.menuItem', 'name category')
    .populate('service.assignedServer', 'firstName lastName')
    .sort({ 'timestamps.ordered': -1 });
};

// Méthode statique pour obtenir les commandes en cours
orderSchema.statics.findActive = function(restaurantId, options = {}) {
  const filter = {
    restaurantId,
    status: { $nin: [ORDER_STATUS.SERVED, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED] },
    isActive: true
  };
  
  return this.find(filter)
    .populate('floorPlanId', 'name')
    .populate('items.menuItem', 'name category')
    .populate('service.assignedServer', 'firstName lastName')
    .sort({ 'service.priority': -1, 'timestamps.ordered': 1 });
};

// S'assurer que les virtuels sont inclus dans la conversion JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);