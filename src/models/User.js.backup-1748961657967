const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut dépasser 50 caractères']
  },
  
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut dépasser 50 caractères']
  },
  
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Email invalide'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas inclure par défaut dans les requêtes
  },
  
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.GUEST,
    required: true
  },
  
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Numéro de téléphone invalide']
  },
  
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: {
      type: String,
      default: 'France'
    }
  },
  
  preferences: {
    language: {
      type: String,
      enum: ['fr', 'en', 'es', 'de'],
      default: 'fr'
    },
    timezone: {
      type: String,
      default: 'Europe/Paris'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() {
      return this.role !== USER_ROLES.ADMIN;
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  
  passwordResetToken: String,
  
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Index pour améliorer les performances
userSchema.index({ restaurantId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  // Ne hasher que si le mot de passe a été modifié
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Hasher le mot de passe avec un salt de 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir le nom complet
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Méthode pour vérifier les permissions de gestion
userSchema.methods.canManageUsers = function() {
  return [USER_ROLES.ADMIN, USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(this.role);
};

// Méthode pour vérifier les permissions d'accès au restaurant
userSchema.methods.canAccessRestaurant = function(restaurantId) {
  if (this.role === USER_ROLES.ADMIN) {
    return true;
  }
  return this.restaurantId && this.restaurantId.toString() === restaurantId.toString();
};

// Méthode pour obtenir les informations publiques (sans données sensibles)
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  
  // Supprimer les champs sensibles
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.__v;
  
  return user;
};

// Middleware pour valider le rôle vs restaurant
userSchema.pre('save', function(next) {
  // Admin ne doit pas avoir de restaurant assigné
  if (this.role === USER_ROLES.ADMIN && this.restaurantId) {
    const error = new Error('Un administrateur ne peut pas avoir de restaurant assigné');
    return next(error);
  }
  
  // Les autres rôles doivent avoir un restaurant (sauf pour les nouveaux comptes en attente)
  if (this.role !== USER_ROLES.ADMIN && !this.restaurantId && !this.isNew) {
    const error = new Error('Un restaurant doit être assigné pour ce rôle');
    return next(error);
  }
  
  next();
});

// Méthode statique pour obtenir les utilisateurs par restaurant
userSchema.statics.findByRestaurant = function(restaurantId, options = {}) {
  return this.find({ 
    restaurantId, 
    isActive: true 
  }, null, options).populate('restaurantId', 'name');
};

// Méthode statique pour obtenir les utilisateurs par rôle
userSchema.statics.findByRole = function(role, restaurantId = null) {
  const filter = { role, isActive: true };
  if (restaurantId) {
    filter.restaurantId = restaurantId;
  }
  return this.find(filter).populate('restaurantId', 'name');
};

// Virtuel pour inclure le nom du restaurant
userSchema.virtual('restaurantName').get(function() {
  return this.restaurantId ? this.restaurantId.name : null;
});

// S'assurer que les virtuels sont inclus dans la conversion JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);