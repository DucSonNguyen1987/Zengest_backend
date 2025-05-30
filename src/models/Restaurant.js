const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du restaurant est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
  },
  
  description: {
    type: String,
    maxlength: [500, 'La description ne peut dépasser 500 caractères']
  },
  
  address: {
    street: {
      type: String,
      required: [true, 'L\'adresse est requise']
    },
    city: {
      type: String,
      required: [true, 'La ville est requise']
    },
    zipCode: {
      type: String,
      required: [true, 'Le code postal est requis']
    },
    country: {
      type: String,
      default: 'France'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  contact: {
    phone: {
      type: String,
      required: [true, 'Le numéro de téléphone est requis'],
      match: [/^[0-9+\-\s()]+$/, 'Numéro de téléphone invalide']
    },
    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Email invalide'
      ]
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'URL du site web invalide']
    }
  },
  
  cuisine: {
    type: [String],
    enum: [
      'française', 'italienne', 'japonaise', 'chinoise', 'indienne',
      'mexicaine', 'thaï', 'méditerranéenne', 'américaine', 'libanaise',
      'marocaine', 'végétarienne', 'végétalienne', 'fusion', 'gastronomique',
      'bistrot', 'brasserie', 'fast-food', 'autre'
    ],
    default: ['française']
  },
  
  priceRange: {
    type: String,
    enum: ['€', '€€', '€€€', '€€€€'],
    default: '€€'
  },
  
  capacity: {
    seatingCapacity: {
      type: Number,
      min: [1, 'La capacité doit être d\'au moins 1 personne']
    },
    tablesCount: {
      type: Number,
      min: [1, 'Le restaurant doit avoir au moins 1 table']
    }
  },
  
  hours: {
    monday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    tuesday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    wednesday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    thursday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    friday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    saturday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    sunday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    }
  },
  
  settings: {
    currency: {
      type: String,
      default: 'EUR'
    },
    timezone: {
      type: String,
      default: 'Europe/Paris'
    },
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'es', 'de']
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 20 // TVA en France
    }
  },
  
  images: {
    logo: String,
    cover: String,
    gallery: [String]
  },
  
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    tripadvisor: String
  },
  
  features: {
    wifi: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    terrace: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
    takeaway: { type: Boolean, default: false },
    reservations: { type: Boolean, default: true },
    creditCards: { type: Boolean, default: true },
    accessibility: { type: Boolean, default: false }
  },
  
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  
  subscriptionExpiry: {
    type: Date
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
restaurantSchema.index({ name: 1 });
restaurantSchema.index({ 'address.city': 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ priceRange: 1 });
restaurantSchema.index({ isActive: 1 });
restaurantSchema.index({ owner: 1 });

// Index géospatial pour les recherches par localisation
restaurantSchema.index({ 'address.coordinates': '2dsphere' });

// Virtuel pour obtenir l'adresse complète
restaurantSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.zipCode} ${addr.city}, ${addr.country}`;
});

// Méthode pour vérifier si le restaurant est ouvert maintenant
restaurantSchema.methods.isOpenNow = function() {
  const now = new Date();
  const day = now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const daySchedule = this.hours[day];
  
  if (!daySchedule || daySchedule.closed) {
    return false;
  }
  
  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
};

// Méthode pour obtenir les horaires du jour
restaurantSchema.methods.getTodayHours = function() {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  return this.hours[today];
};

// Méthode pour obtenir les informations publiques
restaurantSchema.methods.toPublicJSON = function() {
  const restaurant = this.toObject();
  delete restaurant.__v;
  return restaurant;
};

// Middleware pour mettre à jour les timestamps
restaurantSchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);