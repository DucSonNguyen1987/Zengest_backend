/**
 * CORRECTION: src/models/Order.js
 * Schema avec populate sécurisé et validations assouplies
 */

const mongoose = require('mongoose');

// Sous-schéma pour les articles commandés
const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: [true, 'Article du menu requis']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantité requise'],
    min: [1, 'Quantité minimum: 1'],
    max: [50, 'Quantité maximum: 50']
  },
  price: {
    type: Number,
    required: [true, 'Prix requis'],
    min: [0, 'Prix doit être positif']
  },
  variants: {
    size: {
      type: String,
      trim: true
    },
    customizations: [{
      type: String,
      trim: true
    }],
    extras: [{
      name: { type: String, trim: true },
      price: { type: Number, default: 0 }
    }]
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes trop longues (max 500 caractères)']
  }
}, {
  _id: true, // Garder les IDs pour les sous-documents
  timestamps: false
});

// Sous-schéma pour les informations client
const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Prénom client requis'],
    trim: true,
    maxlength: [50, 'Prénom trop long']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Nom trop long'],
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[\d\s\-\(\)]{6,20}$/, 'Téléphone invalide']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes client trop longues']
  }
}, {
  _id: false,
  timestamps: false
});

// Sous-schéma pour les prix
const pricingSchema = new mongoose.Schema({
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discount: {
    type: Number,
    min: 0,
    default: 0
  },
  tip: {
    type: Number,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  _id: false,
  timestamps: false
});

// Sous-schéma pour le paiement
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cash', 'card', 'online', 'mixed', 'pending'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  reference: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  processedAt: Date,
  tip: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  _id: false,
  timestamps: false
});

// Sous-schéma pour les timestamps
const timestampsSchema = new mongoose.Schema({
  ordered: {
    type: Date,
    default: Date.now,
    required: true
  },
  confirmed: Date,
  prepared: Date,
  served: Date,
  paid: Date,
  cancelled: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

// Schéma principal de la commande
const orderSchema = new mongoose.Schema({
  // CORRECTION: Référence restaurant toujours requise
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant requis'],
    index: true
  },

  // CORRECTION: FloorPlanId OPTIONNEL avec valeur par défaut
  floorPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FloorPlan',
    required: false, // CHANGÉ: optionnel
    default: null,
    validate: {
      validator: function(v) {
        return v === null || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'FloorPlanId invalide'
    }
  },

  // Identification de la table
  tableNumber: {
    type: String,
    required: [true, 'Numéro de table requis'],
    trim: true,
    maxlength: [20, 'Numéro de table trop long']
  },

  tableId: {
    type: String,
    trim: true,
    maxlength: [50, 'ID de table trop long']
  },

  // Informations client
  customer: {
    type: customerSchema,
    required: [true, 'Informations client requises']
  },

  // Articles commandés
  items: {
    type: [orderItemSchema],
    required: [true, 'Articles requis'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Au moins un article requis'
    }
  },

  // Statut de la commande
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
      message: 'Statut invalide: {VALUE}'
    },
    default: 'pending',
    required: true,
    index: true
  },

  // Priorité
  priority: {
    type: String,
    enum: ['low', 'normal', 'urgent'],
    default: 'normal'
  },

  // CORRECTION: AssignedServer OPTIONNEL avec gestion flexible
  assignedServer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // CHANGÉ: optionnel
    default: null,
    validate: {
      validator: function(v) {
        return v === null || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'ID serveur invalide'
    }
  },

  // Prix et facturation
  pricing: {
    type: pricingSchema,
    required: true
  },

  // Paiement
  payment: {
    type: paymentSchema,
    default: () => ({})
  },

  // Notes et commentaires
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes trop longues']
  },

  // Service et métadonnées
  service: {
    type: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery'],
      default: 'dine_in'
    },
    estimatedPrepTime: {
      type: Number, // minutes
      min: 0,
      max: 180
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Instructions trop longues']
    }
  },

  // Timestamps détaillés
  timestamps: {
    type: timestampsSchema,
    default: () => ({})
  },

  // Métadonnées
  metadata: {
    source: {
      type: String,
      enum: ['pos', 'online', 'phone', 'walk_in'],
      default: 'pos'
    },
    deviceId: String,
    sessionId: String,
    version: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: false, // Utiliser notre système custom
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// === INDEXES POUR PERFORMANCE ===
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, 'timestamps.ordered': -1 });
orderSchema.index({ tableNumber: 1, status: 1 });
orderSchema.index({ assignedServer: 1 });
orderSchema.index({ floorPlanId: 1, tableNumber: 1 });
orderSchema.index({ 'timestamps.ordered': -1 });
orderSchema.index({ status: 1, 'timestamps.ordered': -1 });

// Index composé pour recherches complexes
orderSchema.index({ 
  restaurantId: 1, 
  status: 1, 
  'timestamps.ordered': -1 
});

// === VIRTUELS ===
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.virtual('customerFullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`.trim();
});

orderSchema.virtual('isActive').get(function() {
  return ['pending', 'confirmed', 'preparing', 'ready'].includes(this.status);
});

orderSchema.virtual('isPaid').get(function() {
  return this.status === 'paid';
});

orderSchema.virtual('duration').get(function() {
  if (!this.timestamps.ordered) return 0;
  const endTime = this.timestamps.served || this.timestamps.paid || new Date();
  return Math.round((endTime - this.timestamps.ordered) / (1000 * 60)); // minutes
});

// === MIDDLEWARE PRE-SAVE ===
orderSchema.pre('save', function(next) {
  // Mettre à jour le timestamp updatedAt
  this.timestamps.updatedAt = new Date();
  
  // Auto-calcul des prix si non fournis
  if (!this.pricing.total || this.pricing.total === 0) {
    this.calculatePricing();
  }
  
  // Valider la cohérence des statuts et timestamps
  this.validateStatusTimestamps();
  
  next();
});

// === MÉTHODES D'INSTANCE ===

// Calculer automatiquement les prix
orderSchema.methods.calculatePricing = function() {
  const subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  this.pricing.subtotal = subtotal;
  this.pricing.tax = Math.round(subtotal * 0.1 * 100) / 100; // TVA 10%
  this.pricing.total = this.pricing.subtotal + this.pricing.tax - this.pricing.discount + this.pricing.tip;
  
  return this.pricing;
};

// Valider cohérence statuts/timestamps
orderSchema.methods.validateStatusTimestamps = function() {
  const now = new Date();
  
  switch (this.status) {
    case 'confirmed':
      if (!this.timestamps.confirmed) {
        this.timestamps.confirmed = now;
      }
      break;
    case 'preparing':
      if (!this.timestamps.confirmed) {
        this.timestamps.confirmed = now;
      }
      break;
    case 'ready':
      if (!this.timestamps.prepared) {
        this.timestamps.prepared = now;
      }
      break;
    case 'served':
      if (!this.timestamps.served) {
        this.timestamps.served = now;
      }
      break;
    case 'paid':
      if (!this.timestamps.paid) {
        this.timestamps.paid = now;
      }
      break;
    case 'cancelled':
      if (!this.timestamps.cancelled) {
        this.timestamps.cancelled = now;
      }
      break;
  }
};

// Changer le statut avec validation
orderSchema.methods.changeStatus = function(newStatus, reason) {
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['served', 'cancelled'],
    'served': ['paid'],
    'paid': [],
    'cancelled': []
  };
  
  const allowed = validTransitions[this.status] || [];
  
  if (!allowed.includes(newStatus)) {
    throw new Error(`Transition ${this.status} -> ${newStatus} non autorisée`);
  }
  
  this.status = newStatus;
  if (reason) {
    this.notes = (this.notes || '') + `\n[${new Date().toISOString()}] ${reason}`;
  }
  
  this.validateStatusTimestamps();
  return this;
};

// Ajouter un article
orderSchema.methods.addItem = function(menuItemId, quantity, price, variants, notes) {
  this.items.push({
    menuItem: menuItemId,
    quantity: quantity || 1,
    price: price || 0,
    variants: variants || {},
    notes: notes || ''
  });
  
  this.calculatePricing();
  return this;
};

// Supprimer un article
orderSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  
  if (this.items.length === 0) {
    throw new Error('Impossible de supprimer tous les articles');
  }
  
  this.calculatePricing();
  return this;
};

// === MÉTHODES STATIQUES ===

// Trouver commandes par table
orderSchema.statics.findByTable = function(floorPlanId, tableNumber, options = {}) {
  const filter = { tableNumber };
  
  if (floorPlanId && floorPlanId !== 'any') {
    filter.floorPlanId = floorPlanId;
  }
  
  if (options.status) {
    filter.status = options.status;
  }
  
  if (options.restaurantId) {
    filter.restaurantId = options.restaurantId;
  }
  
  return this.find(filter)
    .populate('items.menuItem', 'name category basePrice')
    .populate('assignedServer', 'firstName lastName')
    .populate('floorPlanId', 'name')
    .sort({ 'timestamps.ordered': -1 });
};

// Commandes actives
orderSchema.statics.findActive = function(restaurantId) {
  return this.find({
    restaurantId,
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
  })
  .populate('items.menuItem', 'name category')
  .populate('assignedServer', 'firstName lastName')
  .sort({ 'timestamps.ordered': 1 });
};

// Statistiques quotidiennes
orderSchema.statics.getDailyStats = function(restaurantId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        'timestamps.ordered': { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$pricing.total' },
        avgOrderValue: { $avg: '$pricing.total' }
      }
    }
  ]);
};

// === MIDDLEWARE POST ===
orderSchema.post('save', function(doc) {
  console.log(`Commande ${doc._id} sauvegardée: ${doc.status} - Table ${doc.tableNumber}`);
});

orderSchema.post('remove', function(doc) {
  console.log(`Commande ${doc._id} supprimée`);
});

// === VALIDATION PERSONNALISÉE ===

// Validation cohérence client
orderSchema.path('customer').validate(function(customer) {
  return customer.firstName && customer.firstName.trim().length > 0;
}, 'Prénom client requis');

// Validation items non vide
orderSchema.path('items').validate(function(items) {
  return items && items.length > 0 && items.every(item => 
    item.menuItem && item.quantity > 0 && item.price >= 0
  );
}, 'Articles valides requis');

// Validation prix cohérent
orderSchema.path('pricing.total').validate(function(total) {
  const calculatedTotal = this.pricing.subtotal + this.pricing.tax - this.pricing.discount + this.pricing.tip;
  return Math.abs(total - calculatedTotal) < 0.01; // Tolérance centimes
}, 'Total incohérent avec les sous-totaux');

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;