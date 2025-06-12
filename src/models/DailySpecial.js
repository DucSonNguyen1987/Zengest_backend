const mongoose = require('mongoose');

const dailySpecialSchema = new mongoose.Schema({
  // Informations de base
  name: {
    type: String,
    required: [true, 'Le nom du plat est requis'],
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    minlength: [10, 'La description doit contenir au moins 10 caractères'],
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut pas être négatif'],
    max: [500, 'Le prix ne peut pas dépasser 500€']
  },
  
  // Métadonnées du plat
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: [
      'appetizers', 'soups', 'salads', 'mains', 'fish', 'meat', 
      'vegetarian', 'desserts', 'beverages', 'wines', 'cocktails'
    ]
  },
  
  image: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
      },
      message: 'L\'image doit être une URL valide vers un fichier image'
    }
  },
  
  // Informations nutritionnelles et diététiques
  allergens: [{
    type: String,
    enum: [
      'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja',
      'Lait', 'Fruits à coques', 'Céleri', 'Moutarde', 'Graines de sésame',
      'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques'
    ]
  }],
  
  isVegetarian: {
    type: Boolean,
    default: false
  },
  
  isVegan: {
    type: Boolean,
    default: false
  },
  
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  
  // Informations de préparation
  preparationTime: {
    type: Number,
    min: [5, 'Le temps de préparation minimum est de 5 minutes'],
    max: [180, 'Le temps de préparation ne peut pas dépasser 3 heures'],
    validate: {
      validator: Number.isInteger,
      message: 'Le temps de préparation doit être un nombre entier'
    }
  },
  
  chef: {
    type: String,
    trim: true,
    maxlength: [50, 'Le nom du chef ne peut pas dépasser 50 caractères']
  },
  
  // Disponibilité et statut
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'active', 'rejected', 'expired'],
    default: 'pending'
  },
  
  availableDate: {
    type: Date,
    required: [true, 'La date de disponibilité est requise'],
    validate: {
      validator: function(v) {
        return v >= new Date().setHours(0, 0, 0, 0);
      },
      message: 'La date de disponibilité ne peut pas être dans le passé'
    }
  },
  
  expirationDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v > this.availableDate;
      },
      message: 'La date d\'expiration doit être postérieure à la date de disponibilité'
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Gestion des stocks
  maxQuantity: {
    type: Number,
    min: [1, 'La quantité maximum doit être d\'au moins 1'],
    default: null // null = illimité
  },
  
  currentQuantity: {
    type: Number,
    min: [0, 'La quantité actuelle ne peut pas être négative'],
    default: null
  },
  
  // Informations de création et gestion
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Le restaurant est requis']
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le créateur est requis']
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [200, 'La raison du rejet ne peut pas dépasser 200 caractères']
  },
  
  approvalDate: Date,
  rejectionDate: Date,
  
  // Métadonnées
  views: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de vues ne peut pas être négatif']
  },
  
  orders: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de commandes ne peut pas être négatif']
  },
  
  // Tags pour recherche et filtrage
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Notes internes
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Les notes internes ne peuvent pas dépasser 500 caractères']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes pour les requêtes fréquentes
dailySpecialSchema.index({ restaurant: 1, availableDate: 1 });
dailySpecialSchema.index({ status: 1, availableDate: 1 });
dailySpecialSchema.index({ restaurant: 1, status: 1, availableDate: 1 });
dailySpecialSchema.index({ category: 1, status: 1 });
dailySpecialSchema.index({ tags: 1 });
dailySpecialSchema.index({ createdBy: 1, createdAt: -1 });

// Index text pour la recherche
dailySpecialSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    tags: 3
  }
});

// Virtuals
dailySpecialSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const availableDate = new Date(this.availableDate);
  const expiration = this.expirationDate ? new Date(this.expirationDate) : null;
  
  return this.status === 'active' && 
         this.isActive && 
         availableDate <= today && 
         (!expiration || expiration >= today) &&
         (this.maxQuantity === null || this.currentQuantity > 0);
});

dailySpecialSchema.virtual('isExpired').get(function() {
  if (!this.expirationDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(this.expirationDate) < today;
});

dailySpecialSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expirationDate) return null;
  const now = new Date();
  const expiration = new Date(this.expirationDate);
  const diffTime = expiration - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

dailySpecialSchema.virtual('remainingQuantity').get(function() {
  if (this.maxQuantity === null) return 'unlimited';
  return this.currentQuantity || 0;
});

// Middleware pre-save
dailySpecialSchema.pre('save', function(next) {
  // Auto-expiration des plats périmés
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
    this.isActive = false;
  }
  
  // Validation de la cohérence des quantités
  if (this.maxQuantity !== null && this.currentQuantity === null) {
    this.currentQuantity = this.maxQuantity;
  }
  
  // Nettoyage des tags
  if (this.tags) {
    this.tags = this.tags.filter(tag => tag.trim().length > 0);
  }
  
  next();
});

// Méthodes d'instance
dailySpecialSchema.methods.approve = function(approver) {
  this.status = 'approved';
  this.approvedBy = approver;
  this.approvalDate = new Date();
  this.rejectedBy = undefined;
  this.rejectionReason = undefined;
  this.rejectionDate = undefined;
  return this.save();
};

dailySpecialSchema.methods.reject = function(rejecter, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecter;
  this.rejectionReason = reason;
  this.rejectionDate = new Date();
  this.approvedBy = undefined;
  this.approvalDate = undefined;
  return this.save();
};

dailySpecialSchema.methods.activate = function() {
  if (this.status !== 'approved') {
    throw new Error('Le plat doit être approuvé avant d\'être activé');
  }
  this.status = 'active';
  this.isActive = true;
  return this.save();
};

dailySpecialSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

dailySpecialSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

dailySpecialSchema.methods.incrementOrders = function() {
  this.orders += 1;
  if (this.currentQuantity !== null && this.currentQuantity > 0) {
    this.currentQuantity -= 1;
  }
  return this.save({ validateBeforeSave: false });
};

// Méthodes statiques
dailySpecialSchema.statics.findAvailable = function(restaurantId, date = new Date()) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  
  return this.find({
    restaurant: restaurantId,
    status: 'active',
    isActive: true,
    availableDate: { $lte: startOfDay },
    $or: [
      { expirationDate: null },
      { expirationDate: { $gte: startOfDay } }
    ],
    $or: [
      { maxQuantity: null },
      { currentQuantity: { $gt: 0 } }
    ]
  }).populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

dailySpecialSchema.statics.findByStatus = function(restaurantId, status) {
  return this.find({ restaurant: restaurantId, status })
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .populate('rejectedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

dailySpecialSchema.statics.getStatistics = function(restaurantId, startDate, endDate) {
  const matchQuery = { restaurant: restaurantId };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSpecials: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalOrders: { $sum: '$orders' },
        avgPrice: { $avg: '$price' },
        statusBreakdown: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        categoryBreakdown: {
          $push: {
            category: '$category',
            count: 1
          }
        }
      }
    }
  ]);
};

// Export du modèle
module.exports = mongoose.model('DailySpecial', dailySpecialSchema);