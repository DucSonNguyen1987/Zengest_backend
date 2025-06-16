const mongoose = require('mongoose');

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date,
    default: null
  },
  unsubscribeToken: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    type: String,
    enum: ['website', 'mobile', 'admin', 'import'],
    default: 'website'
  },
  preferences: {
    dailySpecials: { type: Boolean, default: true },
    events: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
newsletterSubscriberSchema.index({ email: 1 });
newsletterSubscriberSchema.index({ active: 1 });
newsletterSubscriberSchema.index({ unsubscribeToken: 1 });

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);