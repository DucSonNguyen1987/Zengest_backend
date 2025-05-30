const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { getUserPermissions } = require('../utils/permissions');

// Générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpire
  });
};

// Inscription
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, restaurantId } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }
    
    // Créer l'utilisateur
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      restaurantId
    });
    
    // Générer le token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: user.toPublicJSON(),
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
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création du compte'
    });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Trouver l'utilisateur avec le mot de passe
    const user = await User.findOne({ email })
      .select('+password')
      .populate('restaurantId', 'name address');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();
    
    // Générer le token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toPublicJSON(),
        token,
        permissions: getUserPermissions(user.role)
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
};

// Obtenir l'utilisateur actuel
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('restaurantId', 'name address phone email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        permissions: getUserPermissions(user.role)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Mettre à jour le profil
const updateProfile = async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'preferences'];
    const updates = {};
    
    // Filtrer les champs autorisés
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name address');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: user.toPublicJSON()
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
};

// Déconnexion (côté client principalement)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
};

// Changer le mot de passe
const changePassword = async (req, res) => {
  try {
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
    const user = await User.findById(req.user.id).select('+password');
    
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
    
    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
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