const mongoose = require('mongoose');

// Schéma pour les réservations
const reservationSchema = new mongoose.Schema({
  // Restaurant concerné
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'L\'ID du restaurant est requis'],
    index: true
  },
  
  // Informations client (format flexible)
  customer: {
    // CORRECTION: Support des deux formats
    firstName: {
      type: String,
      required: function() {
        return !this.customer?.name; // firstName requis si pas de name
      },
      trim: true,
      maxlength: [50, 'Le prénom ne peut dépasser 50 caractères']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Le nom ne peut dépasser 50 caractères']
    },
    // Format alternatif avec nom complet
    name: {
      type: String,
      required: function() {
        return !this.customer?.firstName; // name requis si pas de firstName
      },
      trim: true,
      maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide']
    },
    phone: {
      type: String,
      required: [true, 'Le numéro de téléphone est requis'],
      trim: true,
      match: [/^[0-9+\-\s()]+$/, 'Numéro de téléphone invalide']
    },
    notes: {
      type: String,
      maxlength: [200, 'Les notes client ne peuvent dépasser 200 caractères']
    }
  },
  
  // Date et heure de la réservation
  dateTime: {
    type: Date,
    required: [true, 'La date et heure sont requises'],
    index: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'La date de réservation doit être dans le futur'
    }
  },
  
  // Nombre de personnes
  partySize: {
    type: Number,
    required: [true, 'Le nombre de convives est requis'],
    min: [1, 'Au moins 1 convive requis'],
    max: [20, 'Maximum 20 convives'],
    default: 2
  },
  
  // Durée estimée en minutes
  duration: {
    type: Number,
    min: [30, 'Durée minimum: 30 minutes'],
    max: [480, 'Durée maximum: 8 heures'],
    default: 120 // 2 heures par défaut
  },
  
  // Statut de la réservation
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
      message: 'Statut de réservation invalide'
    },
    default: 'pending',
    index: true
  },
  
  // Table assignée (optionnel)
  tableAssigned: {
    floorPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorPlan'
    },
    tableNumber: {
      type: String,
      trim: true
    }
  },
  
  // Demandes spéciales
  specialRequests: [{
    type: String,
    maxlength: [100, 'Chaque demande ne peut dépasser 100 caractères']
  }],
  
  // Source de la réservation
  source: {
    type: String,
    enum: ['online', 'phone', 'walk_in', 'app', 'partner'],
    default: 'online'
  },
  
  // Staff assigné
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notifications
  notifications: {
    confirmationSent: {
      type: Date
    },
    reminderSent: {
      type: Date
    },
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    smsStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    }
  },
  
  // Timestamps importants
  timestamps: {
    requested: {
      type: Date,
      default: Date.now
    },
    confirmed: Date,
    seated: Date,
    completed: Date,
    cancelled: Date
  },
  
  // Notes générales
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent dépasser 500 caractères']
  },
  
  // Informations de contact préférées
  preferences: {
    contactMethod: {
      type: String,
      enum: ['email', 'sms', 'phone'],
      default: 'email'
    },
    language: {
      type: String,
      enum: ['fr', 'en', 'es', 'de'],
      default: 'fr'
    }
  },
  
  // Métadonnées
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  },
  
  // Utilisateur qui a créé la réservation
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  },
  
  // Version pour optimistic locking
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index composés pour améliorer les performances
reservationSchema.index({ restaurantId: 1, dateTime: 1 });
reservationSchema.index({ restaurantId: 1, status: 1 });
reservationSchema.index({ restaurantId: 1, 'customer.phone': 1 });
reservationSchema.index({ restaurantId: 1, 'customer.email': 1 });
reservationSchema.index({ assignedTo: 1 });
reservationSchema.index({ 'tableAssigned.floorPlanId': 1, 'tableAssigned.tableNumber': 1 });

// Middleware pour normaliser les informations client
reservationSchema.pre('save', function(next) {
  // Normaliser le format du client
  if (this.customer) {
    // Si on a un name mais pas de firstName/lastName, les séparer
    if (this.customer.name && !this.customer.firstName) {
      const nameParts = this.customer.name.trim().split(' ').filter(part => part.length > 0);
      this.customer.firstName = nameParts[0] || '';
      this.customer.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Si on a firstName/lastName mais pas de name, les combiner
    if (this.customer.firstName && !this.customer.name) {
      this.customer.name = `${this.customer.firstName} ${this.customer.lastName || ''}`.trim();
    }
    
    // Nettoyer les espaces
    if (this.customer.firstName) this.customer.firstName = this.customer.firstName.trim();
    if (this.customer.lastName) this.customer.lastName = this.customer.lastName.trim();
    if (this.customer.name) this.customer.name = this.customer.name.trim();
    if (this.customer.email) this.customer.email = this.customer.email.trim().toLowerCase();
    if (this.customer.phone) this.customer.phone = this.customer.phone.trim();
  }
  
  next();
});

// Middleware pour mettre à jour les timestamps selon le statut
reservationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'confirmed':
        if (!this.timestamps.confirmed) this.timestamps.confirmed = now;
        break;
      case 'seated':
        if (!this.timestamps.seated) this.timestamps.seated = now;
        break;
      case 'completed':
        if (!this.timestamps.completed) this.timestamps.completed = now;
        break;
      case 'cancelled':
        if (!this.timestamps.cancelled) this.timestamps.cancelled = now;
        break;
    }
    
    // Incrémenter la version
    this.version += 1;
  }
  
  next();
});

// Virtuels pour des informations calculées
reservationSchema.virtual('customerFullName').get(function() {
  if (this.customer.name) return this.customer.name;
  return `${this.customer.firstName || ''} ${this.customer.lastName || ''}`.trim();
});

reservationSchema.virtual('isUpcoming').get(function() {
  return this.dateTime > new Date() && ['pending', 'confirmed'].includes(this.status);
});

reservationSchema.virtual('isPast').get(function() {
  return this.dateTime < new Date();
});

reservationSchema.virtual('durationInHours').get(function() {
  return Math.round(this.duration / 60 * 10) / 10; // Arrondi à 1 décimale
});

// Méthodes d'instance
reservationSchema.methods.canBeModified = function() {
  return ['pending', 'confirmed'].includes(this.status) && this.dateTime > new Date();
};

reservationSchema.methods.canBeCancelled = function() {
  return !['completed', 'cancelled', 'no_show'].includes(this.status);
};

reservationSchema.methods.isLate = function(minutesTolerance = 15) {
  if (this.status !== 'confirmed') return false;
  const now = new Date();
  const expectedTime = new Date(this.dateTime.getTime() + minutesTolerance * 60 * 1000);
  return now > expectedTime;
};

reservationSchema.methods.shouldSendReminder = function(hoursBeforeDefault = 24) {
  if (this.status !== 'confirmed') return false;
  if (this.notifications.reminderSent) return false;
  
  const now = new Date();
  const reminderTime = new Date(this.dateTime.getTime() - hoursBeforeDefault * 60 * 60 * 1000);
  
  return now >= reminderTime;
};

reservationSchema.methods.toPublicJSON = function() {
  const reservation = this.toObject({ virtuals: true });
  
  // Supprimer les champs sensibles
  delete reservation.__v;
  delete reservation.metadata.ipAddress;
  delete reservation.metadata.userAgent;
  
  return reservation;
};

// Méthodes statiques
reservationSchema.statics.findByCustomer = function(customerInfo, restaurantId) {
  const filter = { restaurantId, isActive: true };
  
  if (customerInfo.email) {
    filter['customer.email'] = customerInfo.email.toLowerCase();
  } else if (customerInfo.phone) {
    filter['customer.phone'] = customerInfo.phone;
  }
  
  return this.find(filter).sort({ dateTime: -1 });
};

reservationSchema.statics.findByDateRange = function(restaurantId, startDate, endDate) {
  return this.find({
    restaurantId,
    dateTime: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  }).sort({ dateTime: 1 });
};

reservationSchema.statics.findUpcoming = function(restaurantId, hours = 24) {
  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return this.find({
    restaurantId,
    dateTime: {
      $gte: now,
      $lte: endTime
    },
    status: { $in: ['pending', 'confirmed'] },
    isActive: true
  }).sort({ dateTime: 1 });
};

reservationSchema.statics.findNeedingReminder = function(restaurantId, hoursBeforeDefault = 24) {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + hoursBeforeDefault * 60 * 60 * 1000);
  
  return this.find({
    restaurantId,
    status: 'confirmed',
    dateTime: {
      $gte: now,
      $lte: reminderTime
    },
    'notifications.reminderSent': { $exists: false },
    isActive: true
  });
};

// Configuration JSON
reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', reservationSchema);