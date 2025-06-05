/**
 * CORRECTION: src/models/User.js
 * Rôles en minuscules et restaurantId optionnel
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },

  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas inclure le mot de passe dans les requêtes par défaut
  },

  role: {
    type: String,
    enum: {
      values: [
        'admin',        // Administrateur système
        'owner',        // Propriétaire de restaurant
        'manager',      // Manager de restaurant
        'staff_floor',  // Personnel de salle
        'staff_bar',    // Personnel de bar
        'staff_kitchen',// Personnel de cuisine
        'guest'         // Invité (lecture seule)
      ],
      message: 'Rôle invalide: {VALUE}. Rôles autorisés: admin, owner, manager, staff_floor, staff_bar, staff_kitchen, guest'
    },
    required: [true, 'Le rôle est requis'],
    default: 'guest'
  },

  phone: {
    type: String,
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Veuillez entrer un numéro de téléphone valide'
    ]
  },

  // CORRECTION: RestaurantId OPTIONNEL
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false, // CHANGÉ: était true, maintenant false pour flexibilité
    default: null,
    validate: {
      validator: function (v) {
        // Si fourni, doit être un ObjectId valide
        return v === null || v === undefined || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'RestaurantId doit être un ObjectId valide'
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  preferences: {
    language: {
      type: String,
      enum: ['fr', 'en', 'es'],
      default: 'fr'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    dashboard: {
      defaultView: {
        type: String,
        enum: ['orders', 'reservations', 'menu', 'statistics'],
        default: 'orders'
      }
    }
  },

  permissions: [{
    type: String,
    enum: [
      // Permissions restaurants
      'restaurants:read', 'restaurants:write', 'restaurants:delete',
      // Permissions utilisateurs
      'users:read', 'users:write', 'users:delete',
      // Permissions commandes
      'orders:read', 'orders:write', 'orders:delete',
      // Permissions menu
      'menu:read', 'menu:write', 'menu:delete',
      // Permissions réservations
      'reservations:read', 'reservations:write', 'reservations:delete',
      // Permissions plans de salle
      'floorplans:read', 'floorplans:write', 'floorplans:delete',
      // Permissions statistiques
      'statistics:read',
      // Permissions notifications
      'notifications:send',
      // Permissions système
      'system:admin'
    ]
  }],

  timestamps: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    lastLogin: {
      type: Date
    },
    lastActivity: {
      type: Date
    }
  },

  security: {
    failedLoginAttempts: {
      type: Number,
      default: 0,
      max: [10, 'Trop de tentatives de connexion échouées']
    },
    lockUntil: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: false, // Utiliser notre propre système de timestamps
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      if (!ret) return ret; 
      if (!ret.restaurantId) return ret;
      delete ret.password;
      delete ret.security.lockUntil;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// === INDEXES POUR PERFORMANCE ===
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ restaurantId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'timestamps.lastLogin': -1 });

// === VIRTUELS ===
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

userSchema.virtual('restaurantName').get(function () {
  return this.restaurantId?.name || null;
});

// === MIDDLEWARE PRE-SAVE ===
userSchema.pre('save', async function (next) {
  // Hash du mot de passe si modifié
  if (this.isModified('password')) {
    try {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
      this.security.lastPasswordChange = new Date();
    } catch (error) {
      return next(error);
    }
  }

  // Mise à jour du timestamp
  this.timestamps.updatedAt = new Date();

  // Auto-attribution des permissions selon le rôle
  if (this.isModified('role')) {
    this.permissions = this.getPermissionsByRole(this.role);
  }

  next();
});

// === MÉTHODES D'INSTANCE ===

// Comparer mot de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Erreur lors de la comparaison du mot de passe');
  }
};

// Obtenir permissions par rôle
userSchema.methods.getPermissionsByRole = function (role) {
  const rolePermissions = {
    admin: [
      'restaurants:read', 'restaurants:write', 'restaurants:delete',
      'users:read', 'users:write', 'users:delete',
      'orders:read', 'orders:write', 'orders:delete',
      'menu:read', 'menu:write', 'menu:delete',
      'reservations:read', 'reservations:write', 'reservations:delete',
      'floorplans:read', 'floorplans:write', 'floorplans:delete',
      'statistics:read',
      'notifications:send',
      'system:admin'
    ],
    owner: [
      'restaurants:read', 'restaurants:write',
      'users:read', 'users:write',
      'orders:read', 'orders:write',
      'menu:read', 'menu:write',
      'reservations:read', 'reservations:write',
      'floorplans:read', 'floorplans:write',
      'statistics:read',
      'notifications:send'
    ],
    manager: [
      'users:read',
      'orders:read', 'orders:write',
      'menu:read', 'menu:write',
      'reservations:read', 'reservations:write',
      'floorplans:read', 'floorplans:write',
      'statistics:read'
    ],
    staff_floor: [
      'orders:read', 'orders:write',
      'menu:read',
      'reservations:read', 'reservations:write',
      'floorplans:read'
    ],
    staff_bar: [
      'orders:read', 'orders:write',
      'menu:read',
      'floorplans:read'
    ],
    staff_kitchen: [
      'orders:read', 'orders:write',
      'menu:read'
    ],
    guest: [
      'menu:read',
      'floorplans:read'
    ]
  };

  return rolePermissions[role] || [];
};

// Vérifier permission
userSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

// Mettre à jour activité
userSchema.methods.updateActivity = function () {
  this.timestamps.lastActivity = new Date();
  return this.save();
};

// Incrémenter tentatives échouées
userSchema.methods.incFailedLoginAttempts = function () {
  this.security.failedLoginAttempts += 1;

  // Verrouiller après 5 tentatives échouées
  if (this.security.failedLoginAttempts >= 5) {
    this.security.lockUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
  }

  return this.save();
};

// Réinitialiser tentatives échouées
userSchema.methods.resetFailedLoginAttempts = function () {
  this.security.failedLoginAttempts = 0;
  this.security.lockUntil = undefined;
  this.timestamps.lastLogin = new Date();
  return this.save();
};

// === MÉTHODES STATIQUES ===

// Trouver par email avec mot de passe
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

// Trouver utilisateurs actifs par restaurant
userSchema.statics.findActiveByRestaurant = function (restaurantId) {
  return this.find({
    restaurantId,
    isActive: true
  }).populate('restaurantId', 'name');
};

// Statistiques utilisateurs
userSchema.statics.getStatistics = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// === MIDDLEWARE POST ===
userSchema.post('save', function (doc) {
  console.log(`Utilisateur ${doc.email} sauvegardé (${doc.role})`);
});

userSchema.post('remove', function (doc) {
  console.log(`Utilisateur ${doc.email} supprimé`);
});

// === VALIDATION PERSONNALISÉE ===

// Validation email unique (hors current document)
userSchema.path('email').validate(async function (value) {
  if (!this.isModified('email')) return true;

  const count = await this.constructor.countDocuments({
    email: value,
    _id: { $ne: this._id }
  });

  return count === 0;
}, 'Cet email est déjà utilisé');

// Validation restaurant pour rôles spécifiques
userSchema.path('restaurantId').validate(function (value) {
  // Admin peut être sans restaurant
  if (this.role === 'admin') return true;

  // Owner peut créer un restaurant après
  if (this.role === 'owner') return true;

  // Autres rôles peuvent temporairement être sans restaurant
  return true;
}, 'Restaurant requis pour ce rôle');

const User = mongoose.model('User', userSchema);

module.exports = User;