/**
 * CORRECTION AUTHCONTROLLER COMPATIBLE
 * Remplace le contenu de src/controllers/authController.js
 * Compatible avec votre structure existante
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// === FONCTION UTILITAIRE PERMISSIONS ===
const getUserPermissions = (role) => {
  const rolePermissions = {
    admin: [
      'restaurants:read', 'restaurants:write', 'restaurants:delete',
      'users:read', 'users:write', 'users:delete',
      'orders:read', 'orders:write', 'orders:delete',
      'menu:read', 'menu:write', 'menu:delete',
      'reservations:read', 'reservations:write', 'reservations:delete',
      'floorplans:read', 'floorplans:write', 'floorplans:delete',
      'statistics:read', 'notifications:send', 'system:admin'
    ],
    owner: [
      'restaurants:read', 'restaurants:write',
      'users:read', 'users:write',
      'orders:read', 'orders:write',
      'menu:read', 'menu:write',
      'reservations:read', 'reservations:write',
      'floorplans:read', 'floorplans:write',
      'statistics:read', 'notifications:send'
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

// === FONCTION UTILITAIRE USER SAFE ===
const getUserSafeData = (user) => {
  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.security;
  delete safeUser.__v;
  return safeUser;
};

// Générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpire || '24h'
  });
};

// === MÉTHODES PRINCIPALES ===

// Inscription
const register = async (req, res) => {
  try {
    console.log('Tentative inscription par:', req.user?.email || 'système');
    
    const { firstName, lastName, email, password, role, phone, restaurantId } = req.body;
    
    // Vérification permissions (seuls admin et owner peuvent créer)
    if (req.user && !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les administrateurs et propriétaires peuvent créer des utilisateurs'
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }
    
    // Validation rôle
    const validRoles = ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Rôle invalide. Rôles autorisés: ${validRoles.join(', ')}`
      });
    }
    
    // Déterminer restaurantId
    let finalRestaurantId = restaurantId;
    if (req.user && req.user.role === 'owner' && req.user.restaurantId) {
      finalRestaurantId = req.user.restaurantId;
    }
    
    // Créer l'utilisateur
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role,
      phone,
      restaurantId: finalRestaurantId || null,
      isActive: true
    });
    
    // Populate pour la réponse
    await user.populate('restaurantId', 'name address');
    
    // Générer le token
    const token = generateToken(user._id);
    
    console.log('Utilisateur créé:', user.email, 'par:', req.user?.email || 'système');
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: getUserSafeData(user),
        token,
        permissions: getUserPermissions(user.role)
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du compte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    console.log('Tentative de connexion pour:', req.body.email);
    
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }
    
    // Trouver l'utilisateur avec le mot de passe
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('restaurantId', 'name address isActive');
    
    if (!user) {
      console.log('Utilisateur non trouvé:', email);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Vérifier si le compte est actif
    if (!user.isActive) {
      console.log('Compte désactivé:', email);
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }
    
    // Vérifier si l'utilisateur est verrouillé
    if (user.isLocked) {
      console.log('Compte verrouillé:', email);
      return res.status(401).json({
        success: false,
        message: 'Compte temporairement verrouillé. Réessayez plus tard.'
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Mot de passe invalide pour:', email);
      
      // Incrémenter les tentatives échouées si la méthode existe
      if (typeof user.incFailedLoginAttempts === 'function') {
        await user.incFailedLoginAttempts();
      }
      
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Réinitialiser les tentatives échouées
    if (typeof user.resetFailedLoginAttempts === 'function') {
      await user.resetFailedLoginAttempts();
    } else {
      // Fallback: mettre à jour manuellement
      user.timestamps.lastLogin = new Date();
      await user.save();
    }
    
    // Générer le token
    const token = generateToken(user._id);
    
    console.log('Connexion réussie:', email, 'Rôle:', user.role);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: getUserSafeData(user),
        token,
        permissions: getUserPermissions(user.role),
        restaurant: user.restaurantId || null
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtenir l'utilisateur actuel
const getMe = async (req, res) => {
  try {
    console.log('Récupération profil pour:', req.user?.email || 'inconnu');
    
    // Récupérer l'utilisateur complet
    const user = await User.findById(req.user.id || req.user._id)
      .populate('restaurantId', 'name address phone email isActive')
      .select('-password -security.lockUntil');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: getUserSafeData(user),
        permissions: getUserPermissions(user.role),
        restaurant: user.restaurantId || null
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mettre à jour le profil
const updateProfile = async (req, res) => {
  try {
    console.log('Mise à jour profil pour:', req.user?.email);
    
    const allowedFields = ['firstName', 'lastName', 'phone', 'preferences'];
    const updates = {};
    
    // Filtrer les champs autorisés
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    // Mettre à jour timestamp
    updates['timestamps.updatedAt'] = new Date();
    
    const user = await User.findByIdAndUpdate(
      req.user.id || req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name address');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    console.log('Profil mis à jour:', user.email);
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: getUserSafeData(user)
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Déconnexion
const logout = async (req, res) => {
  try {
    console.log('Déconnexion:', req.user?.email || 'utilisateur');
    
    // Mettre à jour la dernière activité si l'utilisateur est présent
    if (req.user) {
      try {
        const user = await User.findById(req.user.id || req.user._id);
        if (user && typeof user.updateActivity === 'function') {
          await user.updateActivity();
        }
      } catch (updateError) {
        console.warn('Erreur mise à jour activité:', updateError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
    
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

// Changer le mot de passe
const changePassword = async (req, res) => {
  try {
    console.log('Changement de mot de passe pour:', req.user?.email);
    
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }
    
    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(req.user.id || req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();
    
    console.log('Mot de passe changé avec succès pour:', user.email);
    
    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du changement de mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  changePassword
};