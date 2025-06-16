const mongoose = require('mongoose');

const dailySpecialSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  specials: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      enum: ['entrée', 'plat', 'dessert', 'boisson'],
      default: 'plat'
    },
    allergens: [String],
    available: {
      type: Boolean,
      default: true
    },
    soldOut: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
dailySpecialSchema.index({ restaurantId: 1, date: 1 });
dailySpecialSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('DailySpecial', dailySpecialSchema);