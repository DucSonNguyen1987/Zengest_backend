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
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false
  },
  
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.GUEST,
    required: true
  },
  
  phone: {
    type: String,
    match: [/^[0-9+\-\s()]+$/, 'Numéro de téléphone invalide']
  },
  
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: { type: String, default: 'France' }
  },
  
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() {
      return this.role !== USER_ROLES.ADMIN && this.role !== USER_ROLES.GUEST;
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date
  },
  
  profileImage: {
    type: String
  },
  
  preferences: {
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'es', 'de']
    },
    timezone: {
      type: String,
      default: 'Europe/Paris'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ restaurantId: 1 });
userSchema.index({ isActive: 1 });

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
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

// Méthode pour obtenir les informations publiques
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Méthode pour vérifier si l'utilisateur est staff
userSchema.methods.isStaff = function() {
  return [
    USER_ROLES.STAFF_BAR,
    USER_ROLES.STAFF_FLOOR,
    USER_ROLES.STAFF_KITCHEN
  ].includes(this.role);
};

// Méthode pour vérifier si l'utilisateur peut gérer d'autres utilisateurs
userSchema.methods.canManageUsers = function() {
  return [
    USER_ROLES.ADMIN,
    USER_ROLES.OWNER,
    USER_ROLES.MANAGER
  ].includes(this.role);
};

// Méthode pour obtenir le type de staff
userSchema.methods.getStaffType = function() {
  if (!this.isStaff()) return null;
  
  switch(this.role) {
    case USER_ROLES.STAFF_BAR: return 'bar';
    case USER_ROLES.STAFF_FLOOR: return 'floor';
    case USER_ROLES.STAFF_KITCHEN: return 'kitchen';
    default: return null;
  }
};

module.exports = mongoose.model('User', userSchema);