const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
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
    select: false // Par défaut, ne pas inclure le mot de passe dans les requêtes
  },
  
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s+.\-()]+$/, 'Numéro de téléphone invalide']  },
  
  role: {
  type: String,
  required: [true, 'Le rôle est requis'],
  enum: {
    values: Object.values(USER_ROLES),
    message: 'Rôle invalide: {VALUE}. Rôles autorisés: ' + Object.values(USER_ROLES).join(', ')
  },
  default: USER_ROLES.GUEST
},
  
  // RestaurantId OPTIONNEL pour les admins système
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() {
      // Requis seulement si ce n'est pas un admin système
      return this.role !== USER_ROLES.ADMIN;
    },
    validate: {
      validator: function(value) {
        // Admin peut ne pas avoir de restaurant
        if (this.role === USER_ROLES.ADMIN) {
          return true;
        }
        // Autres rôles doivent avoir un restaurant
        return value != null;
      },
      message: 'Restaurant requis pour ce rôle'
    }
  },
  
  // Statut du compte
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Préférences utilisateur
  preferences: {
    language: {
      type: String,
      enum: ['fr', 'en'],
      default: 'fr'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  
  // Métadonnées de sécurité
  security: {
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    passwordChangedAt: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false }
  },
  
  // Données de profil étendues
  profile: {
    avatar: String,
    bio: String,
    dateOfBirth: Date,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: 'France' }
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.security?.twoFactorSecret;
      return ret;
    }
  },
  toObject: { virtuals: true },
  lastLogin: {
  type: Date,
  default: null
}
});

// === INDEX POUR PERFORMANCE ===
// userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ restaurantId: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1 });

// === PROPRIÉTÉS VIRTUELLES ===
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return this.security?.lockedUntil && this.security.lockedUntil > Date.now();
});

// === MIDDLEWARE PRE-SAVE ===
userSchema.pre('save', async function(next) {
  try {
    // Hasher le mot de passe si modifié
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      this.security.passwordChangedAt = new Date();
    }
    
    // Normaliser l'email
    if (this.isModified('email')) {
      this.email = this.email.toLowerCase().trim();
    }
    
    // Validation conditionnelle du restaurant pour les rôles
    if (this.isModified('role') || this.isModified('restaurantId')) {
      // Admin peut ne pas avoir de restaurant
      if (this.role === USER_ROLES.ADMIN) {
        // Optionnel pour admin
      } else if (!this.restaurantId) {
        throw new Error(`Restaurant requis pour le rôle ${this.role}`);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// === MÉTHODES D'INSTANCE ===

/**
 * Comparer le mot de passe fourni avec le hash stocké
 */
userSchema.methods.comparePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error('Erreur lors de la vérification du mot de passe');
  }
};

/**
 * Incrémenter les tentatives de connexion
 */
userSchema.methods.incrementLoginAttempts = function() {
  // Si le compte était verrouillé et que la période est expirée
  if (this.security.lockedUntil && this.security.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockedUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Verrouiller le compte après 5 tentatives
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockedUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 heures
  }
  
  return this.updateOne(updates);
};

/**
 * Réinitialiser les tentatives de connexion
 */
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 
      'security.lockedUntil': 1,
      'security.loginAttempts': 1 
    },
    $set: { 'security.lastLogin': new Date() }
  });
};

/**
 * Vérifier si l'utilisateur a un rôle spécifique
 */
userSchema.methods.hasRole = function(role) {
  if (Array.isArray(role)) {
    return role.includes(this.role);
  }
  return this.role === role;
};

/**
 * Vérifier si l'utilisateur a une permission
 */
userSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    [USER_ROLES.ADMIN]: ['*'],
    [USER_ROLES.OWNER]: [
      'manage_restaurant', 'manage_users', 'manage_orders', 
      'manage_tables', 'view_analytics', 'manage_menu'
    ],
    [USER_ROLES.MANAGER]: [
      'manage_orders', 'manage_tables', 'view_analytics', 
      'manage_daily_specials'
    ],
    [USER_ROLES.STAFF]: [
      'manage_orders', 'manage_tables', 'view_kitchen'
    ],
    'staff_floor': ['manage_orders', 'manage_tables'],
    'staff_kitchen': ['view_kitchen', 'update_order_status']
  };
  
  const permissions = rolePermissions[this.role] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

/**
 * Méthode pour retourner les données publiques
 */
userSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    restaurantId: this.restaurantId,
    isActive: this.isActive,
    isEmailVerified: this.isEmailVerified,
    preferences: this.preferences,
    profile: {
      avatar: this.profile?.avatar,
      bio: this.profile?.bio
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// === MÉTHODES STATIQUES ===

/**
 * Trouver un utilisateur par email avec gestion des erreurs
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase().trim(),
    isActive: true 
  }).select('+password +security');
};

/**
 * Créer un utilisateur avec validation étendue
 */
userSchema.statics.createUser = async function(userData) {
  const user = new this(userData);
  
  // Validation supplémentaire
  if (user.role !== USER_ROLES.ADMIN && !user.restaurantId) {
    throw new Error(`Restaurant requis pour le rôle ${user.role}`);
  }
  
  return await user.save();
};

module.exports = mongoose.model('User', userSchema);