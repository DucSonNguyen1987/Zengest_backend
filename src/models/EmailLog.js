const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'reservation_confirmation',
      'reservation_cancellation', 
      'reservation_reminder',
      'daily_specials_notification',
      'newsletter_welcome',
      'contact_notification',
      'admin_test'
    ]
  },
  resourceId: {
    type: String, // ID de la réservation, newsletter, etc.
    default: null
  },
  recipientEmail: {
    type: String,
    required: true
  },
  senderEmail: {
    type: String,
    default: 'noreply@zengest.fr'
  },
  subject: String,
  messageId: String, // ID Brevo
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'pending'
  },
  error: {
    message: String,
    stack: String
  },
  metadata: {
    templateId: Number,
    requestId: String,
    attempts: { type: Number, default: 1 }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
emailLogSchema.index({ type: 1, timestamp: -1 });
emailLogSchema.index({ recipientEmail: 1, timestamp: -1 });
emailLogSchema.index({ status: 1, timestamp: -1 });
emailLogSchema.index({ timestamp: 1 }); // Pour le nettoyage automatique

module.exports = mongoose.model('EmailLog', emailLogSchema);