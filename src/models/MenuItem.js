// src/models/MenuItem.js - MODÈLE MANQUANT

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },

  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: {
      values: [
        'appetizers', 'soups', 'salads', 'mains', 'fish', 'meat', 
        'vegetarian', 'vegan', 'desserts', 'beverages', 'wines', 
        'cocktails', 'daily_specials'
      ],
      message: 'Catégorie invalide'
    }
  },

  basePrice: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut pas être négatif'],
    max: [1000, 'Le prix ne peut pas dépasser 1000€']
  },

  priceVariants: [{
    size: {
      type: String,
      enum: ['small', 'medium', 'large', 'standard'],
      default: 'standard'
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    description: String
  }],

  ingredients: [{
    name: String,
    allergen: {
      type: Boolean,
      default: false
    }
  }],

  allergens: [{
    type: String,
    enum: [
      'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja',
      'Lait', 'Fruits à coques', 'Céleri', 'Moutarde', 'Graines de sésame',
      'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques'
    ]
  }],

  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fat: Number,
    fiber: Number
  },

  dietary: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isLactoseFree: { type: Boolean, default: false },
    isNutFree: { type: Boolean, default: false }
  },

  availability: {
    isActive: { type: Boolean, default: true },
    isSeasonalItem: { type: Boolean, default: false },
    availableFrom: Date,
    availableUntil: Date,
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },

  preparation: {
    cookingTime: {
      type: Number,
      min: 1,
      max: 180 // minutes
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    kitchenStation: {
      type: String,
      enum: ['cold', 'hot', 'grill', 'fryer', 'oven', 'bar'],
      default: 'hot'
    }
  },

  media: {
    images: [String],
    mainImage: String
  },

  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  tags: [String],

  internalNotes: {
    type: String,
    maxlength: 500
  },

  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },

  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEX POUR PERFORMANCE ===
menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantId: 1, 'availability.isActive': 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// === PROPRIÉTÉS VIRTUELLES ===
menuItemSchema.virtual('isAvailable').get(function() {
  if (!this.availability.isActive) return false;
  
  const now = new Date();
  if (this.availability.availableFrom && now < this.availability.availableFrom) return false;
  if (this.availability.availableUntil && now > this.availability.availableUntil) return false;
  
  return true;
});

menuItemSchema.virtual('currentPrice').get(function() {
  if (this.priceVariants && this.priceVariants.length > 0) {
    const standardVariant = this.priceVariants.find(v => v.size === 'standard');
    return standardVariant ? standardVariant.price : this.priceVariants[0].price;
  }
  return this.basePrice;
});

// === MÉTHODES D'INSTANCE ===
menuItemSchema.methods.incrementOrderCount = function() {
  this.orderCount += 1;
  return this.save();
};

menuItemSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

menuItemSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    category: this.category,
    basePrice: this.basePrice,
    priceVariants: this.priceVariants,
    allergens: this.allergens,
    dietary: this.dietary,
    availability: {
      isActive: this.availability.isActive,
      cookingTime: this.preparation.cookingTime
    },
    media: this.media,
    tags: this.tags,
    rating: this.rating,
    isAvailable: this.isAvailable,
    currentPrice: this.currentPrice
  };
};

// === MÉTHODES STATIQUES ===
menuItemSchema.statics.findByCategory = function(restaurantId, category, onlyActive = true) {
  const filter = { restaurantId, category };
  if (onlyActive) {
    filter['availability.isActive'] = true;
  }
  return this.find(filter).sort({ name: 1 });
};

menuItemSchema.statics.findAvailable = function(restaurantId) {
  return this.find({
    restaurantId,
    'availability.isActive': true
  }).sort({ category: 1, name: 1 });
};

module.exports = mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);
