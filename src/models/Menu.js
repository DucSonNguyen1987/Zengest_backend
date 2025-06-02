const mongoose = require('mongoose');

// Schéma pour une variante de prix (différentes tailles/formats)
const priceVariantSchema = new mongoose.Schema({
  size: {
    type: String, // "12.5cl", "35cl", "75cl", "portion", etc.
    required: [true, 'La taille/format est requis']
  },
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut être négatif']
  },
  isDefault: {
    type: Boolean,
    default: false // Une seule variante par défaut
  }
}, { _id: true });

// Schéma pour un ingrédient/allergène
const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'ingrédient est requis'],
    trim: true
  },
  isAllergen: {
    type: Boolean,
    default: false
  },
  allergenType: {
    type: String,
    enum: ['gluten', 'dairy', 'nuts', 'eggs', 'fish', 'shellfish', 'soy', 'sesame', 'other'],
    required: function() { return this.isAllergen; }
  }
}, { _id: true });

// Schéma principal pour un item de menu
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'item est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut dépasser 500 caractères']
  },
  
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [100, 'La description courte ne peut dépasser 100 caractères']
  },
  
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: [
      'appetizers', 'salads', 'mains', 'sides', 'desserts', 'cheeses',
      'wines_red', 'wines_white', 'wines_rose', 'wines_sparkling',
      'cocktails', 'mocktails', 'beers', 'hot_drinks', 'cold_drinks',
      'spirits', 'digestifs', 'aperitifs'
    ]
  },
  
  subcategory: {
    type: String,
    trim: true
  },
  
  // Variantes de prix (différentes tailles)
  priceVariants: {
    type: [priceVariantSchema],
    required: [true, 'Au moins une variante de prix est requise'],
    validate: {
      validator: function(variants) {
        return variants.length > 0;
      },
      message: 'Au moins une variante de prix est requise'
    }
  },
  
  // Prix de base (pour compatibilité/recherche)
  basePrice: {
    type: Number,
    min: [0, 'Le prix ne peut être négatif'],
    // Pas required car calculé automatiquement depuis priceVariants
  },
  
  ingredients: [ingredientSchema],
  
  // Restrictions alimentaires
  dietary: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isOrganic: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    spicyLevel: { 
      type: Number, 
      min: 0, 
      max: 5,
      default: 0 
    }
  },
  
  // Informations nutritionnelles (optionnel)
  nutrition: {
    calories: Number,
    protein: Number, // en grammes
    carbs: Number,   // en grammes
    fat: Number,     // en grammes
    alcohol: Number  // pourcentage pour les boissons
  },
  
  // Métadonnées
  images: [String], // URLs des images
  
  tags: [String], // Tags libres : "signature", "chef-special", "popular", etc.
  
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    availableDays: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    availableTimeSlots: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: true },
      dinner: { type: Boolean, default: true },
      brunch: { type: Boolean, default: false },
      allDay: { type: Boolean, default: true }
    },
    seasonalStart: Date,
    seasonalEnd: Date
  },
  
  // Gestion des stocks (pour les boissons notamment)
  inventory: {
    hasInventory: { type: Boolean, default: false },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    isOutOfStock: { type: Boolean, default: false }
  },
  
  // Ordre d'affichage dans la catégorie
  displayOrder: {
    type: Number,
    default: 0
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Référence au restaurant
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'L\'ID du restaurant est requis']
  },
  
  // Métadonnées de création/modification
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
menuItemSchema.index({ restaurantId: 1 });
menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantId: 1, isActive: 1 });
menuItemSchema.index({ restaurantId: 1, 'availability.isAvailable': 1 });
menuItemSchema.index({ basePrice: 1 });
menuItemSchema.index({ displayOrder: 1 });

// Middleware pour calculer le prix de base automatiquement
menuItemSchema.pre('save', function(next) {
  // Calculer le basePrice depuis les priceVariants
  if (this.priceVariants && this.priceVariants.length > 0) {
    // Utiliser le prix de la variante par défaut ou de la première variante
    const defaultVariant = this.priceVariants.find(v => v.isDefault) || this.priceVariants[0];
    this.basePrice = defaultVariant.price;
  } else if (!this.basePrice) {
    // Si pas de variantes ET pas de basePrice, erreur
    return next(new Error('Au moins une variante de prix ou un prix de base est requis'));
  }
  
  next();
});

// Middleware pour valider qu'il y a au moins une variante par défaut
menuItemSchema.pre('save', function(next) {
  if (this.priceVariants && this.priceVariants.length > 0) {
    const defaultVariants = this.priceVariants.filter(v => v.isDefault);
    
    // Si aucune variante par défaut, définir la première comme défaut
    if (defaultVariants.length === 0) {
      this.priceVariants[0].isDefault = true;
    }
    
    // Si plusieurs variantes par défaut, garder seulement la première
    if (defaultVariants.length > 1) {
      this.priceVariants.forEach((variant, index) => {
        variant.isDefault = index === 0;
      });
    }
  }
  
  next();
});

// Virtuel pour obtenir le prix par défaut
menuItemSchema.virtual('defaultPrice').get(function() {
  if (this.priceVariants && this.priceVariants.length > 0) {
    const defaultVariant = this.priceVariants.find(v => v.isDefault) || this.priceVariants[0];
    return defaultVariant;
  }
  return null;
});

// Méthode pour vérifier la disponibilité
menuItemSchema.methods.isAvailableAt = function(day, timeSlot = 'allDay') {
  if (!this.availability.isAvailable || !this.isActive) {
    return false;
  }
  
  // Vérifier le jour
  if (!this.availability.availableDays.includes(day)) {
    return false;
  }
  
  // Vérifier le créneau horaire
  if (timeSlot === 'allDay') {
    return this.availability.availableTimeSlots.allDay;
  }
  
  return this.availability.availableTimeSlots[timeSlot] || false;
};

// Méthode pour obtenir le prix d'une variante spécifique
menuItemSchema.methods.getPriceForSize = function(size) {
  const variant = this.priceVariants.find(v => v.size === size);
  return variant ? variant.price : null;
};

// Méthode pour vérifier si en stock
menuItemSchema.methods.isInStock = function() {
  if (!this.inventory.hasInventory) {
    return true; // Pas de gestion de stock
  }
  return !this.inventory.isOutOfStock && this.inventory.currentStock > 0;
};

// Méthode pour obtenir les informations publiques
menuItemSchema.methods.toPublicJSON = function() {
  const item = this.toObject({ virtuals: true });
  
  // Supprimer les champs sensibles
  delete item.createdBy;
  delete item.lastModifiedBy;
  delete item.__v;
  
  return item;
};

// Méthode statique pour obtenir les items par catégorie
menuItemSchema.statics.findByCategory = function(restaurantId, category, includeInactive = false) {
  const filter = { 
    restaurantId, 
    category,
    ...(includeInactive ? {} : { isActive: true, 'availability.isAvailable': true })
  };
  
  return this.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .populate('restaurantId', 'name');
};

// Méthode statique pour la recherche
menuItemSchema.statics.searchItems = function(restaurantId, searchTerm, filters = {}) {
  const query = {
    restaurantId,
    isActive: true,
    'availability.isAvailable': true,
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { description: new RegExp(searchTerm, 'i') },
      { tags: new RegExp(searchTerm, 'i') }
    ]
  };
  
  // Appliquer les filtres
  if (filters.category) query.category = filters.category;
  if (filters.dietary) {
    Object.keys(filters.dietary).forEach(key => {
      if (filters.dietary[key]) {
        query[`dietary.${key}`] = true;
      }
    });
  }
  if (filters.priceRange) {
    if (filters.priceRange.min) query.basePrice = { $gte: filters.priceRange.min };
    if (filters.priceRange.max) {
      query.basePrice = { ...query.basePrice, $lte: filters.priceRange.max };
    }
  }
  
  return this.find(query).sort({ displayOrder: 1, name: 1 });
};

// S'assurer que les virtuels sont inclus dans la conversion JSON
menuItemSchema.set('toJSON', { virtuals: true });
menuItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);