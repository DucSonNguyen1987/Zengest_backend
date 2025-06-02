const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationNumber: {
    type: String,
    unique: true,
    sparse: true // Permet les valeurs null pendant la création
  },
  
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'L\'ID du restaurant est requis']
  },
  
  // Informations du client
  customer: {
    name: {
      type: String,
      required: [true, 'Le nom du client est requis'],
      trim: true,
      maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
    },
    email: {
      type: String,
      required: [true, 'L\'email du client est requis'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Email invalide'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Le téléphone du client est requis'],
      match: [/^[0-9+\-\s()]+$/, 'Numéro de téléphone invalide']
    },
    specialRequests: {
      type: String,
      maxlength: [300, 'Les demandes spéciales ne peuvent dépasser 300 caractères']
    }
  },
  
  // Date et heure de la réservation
  dateTime: {
    type: Date,
    required: [true, 'La date et heure sont requises'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'La date de réservation doit être dans le futur'
    }
  },
  
  // Durée estimée en minutes
  duration: {
    type: Number,
    default: 120, // 2 heures par défaut
    min: [30, 'Durée minimum : 30 minutes'],
    max: [360, 'Durée maximum : 6 heures']
  },
  
  // Nombre de convives
  numberOfGuests: {
    type: Number,
    required: [true, 'Le nombre de convives est requis'],
    min: [1, 'Au moins 1 convive requis'],
    max: [50, 'Maximum 50 convives']
  },
  
  // Table assignée (optionnel au moment de la réservation)
  assignedTable: {
    floorPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorPlan'
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId
    },
    tableNumber: String, // Stocké pour l'historique
    assignedAt: Date,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Statut de la réservation
  status: {
    type: String,
    enum: [
      'pending',     // En attente de confirmation
      'confirmed',   // Confirmée
      'seated',      // Client installé
      'completed',   // Terminée
      'cancelled',   // Annulée
      'no_show'      // Client absent
    ],
    default: 'pending'
  },
  
  // Préférences
  preferences: {
    seatingArea: {
      type: String,
      enum: ['indoor', 'outdoor', 'terrace', 'private', 'bar', 'no_preference'],
      default: 'no_preference'
    },
    tableType: {
      type: String,
      enum: ['round', 'square', 'rectangle', 'oval', 'no_preference'],
      default: 'no_preference'
    },
    accessibility: {
      type: Boolean,
      default: false
    },
    quiet: {
      type: Boolean,
      default: false
    }
  },
  
  // Notifications
  notifications: {
    confirmationSent: {
      type: Boolean,
      default: false
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    emails: [{
      type: {
        type: String,
        enum: ['confirmation', 'reminder', 'cancellation', 'modification']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      success: {
        type: Boolean,
        default: true
      },
      messageId: String
    }]
  },
  
  // Timestamps importants
  timestamps: {
    reserved: {
      type: Date,
      default: Date.now
    },
    confirmed: Date,
    seated: Date,
    completed: Date,
    cancelled: Date
  },
  
  // Notes internes
  internalNotes: {
    type: String,
    maxlength: [500, 'Les notes internes ne peuvent dépasser 500 caractères']
  },
  
  // Historique des modifications
  history: [{
    action: {
      type: String,
      enum: ['created', 'confirmed', 'modified', 'table_assigned', 'seated', 'completed', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: String
  }],
  
  // Utilisateur qui a créé la réservation
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Dernière modification
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
reservationSchema.index({ restaurantId: 1 });
reservationSchema.index({ restaurantId: 1, dateTime: 1 });
reservationSchema.index({ restaurantId: 1, status: 1 });
reservationSchema.index({ 'customer.email': 1 });
reservationSchema.index({ 'customer.phone': 1 });
reservationSchema.index({ 'assignedTable.floorPlanId': 1, 'assignedTable.tableId': 1 });
reservationSchema.index({ dateTime: 1, status: 1 });

// Middleware pour générer le numéro de réservation
reservationSchema.pre('save', async function(next) {
  if (this.isNew && !this.reservationNumber) {
    try {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const date = new Date(this.dateTime);
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Compter les réservations du même jour pour ce restaurant
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        
        const count = await this.constructor.countDocuments({
          restaurantId: this.restaurantId,
          dateTime: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        });
        
        if (attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        }
        
        const sequence = count + attempts + 1;
        const reservationNumber = `RES-${dateStr}-${sequence.toString().padStart(4, '0')}`;
        
        const existing = await this.constructor.findOne({ reservationNumber });
        if (!existing) {
          this.reservationNumber = reservationNumber;
          console.log(`🎫 Numéro de réservation généré: ${this.reservationNumber}`);
          return next();
        }
        
        attempts++;
      }
      
      // Fallback en cas d'échec
      const fallbackNumber = `RES-${Date.now().toString().slice(-8)}`;
      this.reservationNumber = fallbackNumber;
      
    } catch (error) {
      console.error('❌ Erreur génération numéro réservation:', error);
      this.reservationNumber = `RES-EMG-${Date.now()}`;
    }
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
  }
  
  next();
});

// Middleware pour ajouter à l'historique
reservationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      by: this.createdBy,
      details: 'Réservation créée'
    });
  } else if (this.isModified('status')) {
    this.history.push({
      action: this.status,
      by: this.lastModifiedBy,
      details: `Statut changé vers: ${this.status}`
    });
  }
  
  next();
});

// Virtuel pour calculer l'heure de fin
reservationSchema.virtual('endTime').get(function() {
  return new Date(this.dateTime.getTime() + (this.duration * 60000));
});

// Virtuel pour vérifier si la réservation est dans le futur
reservationSchema.virtual('isFuture').get(function() {
  return this.dateTime > new Date();
});

// Virtuel pour vérifier si la réservation est aujourd'hui
reservationSchema.virtual('isToday').get(function() {
  const today = new Date();
  const reservationDate = new Date(this.dateTime);
  return today.toDateString() === reservationDate.toDateString();
});

// Virtuel pour obtenir le temps restant avant la réservation
reservationSchema.virtual('timeUntilReservation').get(function() {
  const now = new Date();
  const diffMs = this.dateTime - now;
  
  if (diffMs <= 0) return null;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes, totalMinutes: Math.floor(diffMs / (1000 * 60)) };
});

// Méthode pour vérifier si la réservation peut être modifiée
reservationSchema.methods.canBeModified = function() {
  return ['pending', 'confirmed'].includes(this.status) && this.isFuture;
};

// Méthode pour vérifier si la réservation peut être annulée
reservationSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status) && this.isFuture;
};

// Méthode pour assigner une table
reservationSchema.methods.assignTable = function(floorPlanId, tableId, tableNumber, assignedBy) {
  this.assignedTable = {
    floorPlanId,
    tableId,
    tableNumber,
    assignedAt: new Date(),
    assignedBy
  };
  
  this.history.push({
    action: 'table_assigned',
    by: assignedBy,
    details: `Table ${tableNumber} assignée`
  });
};

// Méthode pour ajouter une note d'email
reservationSchema.methods.addEmailLog = function(type, success, messageId) {
  this.notifications.emails.push({
    type,
    success,
    messageId,
    sentAt: new Date()
  });
  
  if (type === 'confirmation' && success) {
    this.notifications.confirmationSent = true;
  } else if (type === 'reminder' && success) {
    this.notifications.reminderSent = true;
  }
};

// Méthode pour obtenir les informations publiques
reservationSchema.methods.toPublicJSON = function() {
  const reservation = this.toObject({ virtuals: true });
  
  // Supprimer les champs sensibles
  delete reservation.internalNotes;
  delete reservation.history;
  delete reservation.notifications.emails;
  delete reservation.lastModifiedBy;
  delete reservation.createdBy;
  delete reservation.__v;
  
  return reservation;
};

// Méthode statique pour trouver les conflits de réservation
reservationSchema.statics.findConflicts = function(restaurantId, dateTime, duration, excludeId = null) {
  const startTime = new Date(dateTime);
  const endTime = new Date(startTime.getTime() + (duration * 60000));
  
  const filter = {
    restaurantId,
    status: { $in: ['confirmed', 'seated'] },
    isActive: true,
    $or: [
      // Nouvelle réservation commence pendant une réservation existante
      {
        dateTime: { $lte: startTime },
        $expr: {
          $gte: [
            { $add: ['$dateTime', { $multiply: ['$duration', 60000] }] },
            startTime
          ]
        }
      },
      // Nouvelle réservation se termine pendant une réservation existante
      {
        dateTime: { $gte: startTime, $lt: endTime }
      }
    ]
  };
  
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  
  return this.find(filter);
};

// Méthode statique pour obtenir les réservations du jour
reservationSchema.statics.findByDate = function(restaurantId, date, status = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const filter = {
    restaurantId,
    dateTime: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    isActive: true
  };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('assignedTable.floorPlanId', 'name')
    .populate('createdBy', 'firstName lastName')
    .sort({ dateTime: 1 });
};

// Méthode statique pour les réservations nécessitant un rappel
reservationSchema.statics.findNeedingReminder = function() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);
  
  return this.find({
    dateTime: {
      $gte: tomorrow,
      $lte: endOfTomorrow
    },
    status: 'confirmed',
    'notifications.reminderSent': false,
    isActive: true
  }).populate('restaurantId', 'name email');
};

// S'assurer que les virtuels sont inclus dans la conversion JSON
reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', reservationSchema);