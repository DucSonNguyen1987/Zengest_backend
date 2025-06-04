const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const auth = async (req, res, next) => {
  try {
    let token;
    
    // Récupérer le token depuis les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé, token manquant'
      });
    }
    
    try {
      // Vérifier le token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Récupérer l'utilisateur depuis la base de données
      const user = await User.findById(decoded.id)
        .populate('restaurantId', 'name address')
        .select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide, utilisateur non trouvé'
        });
      }

      // Debug pour vérifier la structure
      console.log('🔍 DEBUG Auth - User loaded:', {
        userId: user._id.toString(),
        role: user.role,
        restaurantId: user.restaurantId?._id?.toString() || 'N/A',
        restaurantName: user.restaurantId?.name || 'N/A'
      });
      
      // Vérifier si le compte est actif
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Compte désactivé'
        });
      }
      
      // === CORRECTION: Gestion des permissions Owner ===
      // Rôles exempts des vérifications de restaurant
      const exemptRoles = ['admin', 'owner'];
      
      // AMÉLIORATION: Vérifier le restaurantId pour les utilisateurs non-exempts
      if (!exemptRoles.includes(user.role)) {
        // Si l'utilisateur a un restaurantId dans la DB mais la population a échoué
        if (user.restaurantId === null && user.toObject().restaurantId) {
          console.warn(`⚠️  Population échouée pour l'utilisateur ${user._id}, restaurant ${user.toObject().restaurantId} non trouvé`);
          return res.status(403).json({
            success: false,
            message: 'Restaurant assigné non trouvé'
          });
        }
        
        // Si l'utilisateur n'a pas de restaurant assigné (obligatoire pour staff/manager)
        if (!user.restaurantId) {
          console.warn(`⚠️  Utilisateur ${user._id} (${user.role}) sans restaurant assigné`);
          return res.status(403).json({
            success: false,
            message: 'Aucun restaurant assigné - Contact administrateur',
            debug: {
              userId: user._id,
              userRole: user.role,
              hasRestaurantId: !!user.restaurantId,
              exemptRoles
            }
          });
        }
      }
      
      // NOUVEAU: Gestion spéciale pour les owners sans restaurant
      if (user.role === 'owner' && !user.restaurantId) {
        console.log(`ℹ️  Owner ${user._id} sans restaurant - accès autorisé pour création automatique`);
        // L'owner peut passer, le système créera un restaurant automatiquement si nécessaire
      }
      
      // NOUVEAU: Gestion spéciale pour les admins
      if (user.role === 'admin') {
        console.log(`ℹ️  Admin ${user._id} - accès total autorisé`);
        // Les admins ont accès à tout, avec ou sans restaurant
      }
      
      // Debug logging pour tracer les problèmes
      console.log('🔐 AUTH SUCCESS:', {
        userId: user._id,
        userRole: user.role,
        restaurantId: user.restaurantId?._id || user.restaurantId,
        restaurantName: user.restaurantId?.name || 'N/A',
        isPopulated: typeof user.restaurantId === 'object',
        isExempt: exemptRoles.includes(user.role)
      });
      
      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();
      
    } catch (tokenError) {
      console.error('❌ Erreur de token:', tokenError.message);
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur middleware auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

// === NOUVEAU: Middleware de vérification de rôles ===
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`🚫 Accès refusé: ${req.user.role} pas dans ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `Accès non autorisé - Rôles autorisés: ${allowedRoles.join(', ')}`,
        userRole: req.user.role
      });
    }

    console.log(`✅ Accès autorisé: ${req.user.role} pour ${req.method} ${req.path}`);
    next();
  };
};

// === NOUVEAU: Middleware de vérification de restaurant ===
const requireSameRestaurant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
  }

  // Admin et Owner ont accès à tous les restaurants
  if (['admin', 'owner'].includes(req.user.role)) {
    console.log(`ℹ️  ${req.user.role} - accès multi-restaurant autorisé`);
    return next();
  }

  // Vérifier que l'utilisateur appartient au même restaurant
  const requestedRestaurantId = req.params.restaurantId || req.body.restaurantId;
  const userRestaurantId = req.user.restaurantId?._id?.toString() || req.user.restaurantId?.toString();

  if (requestedRestaurantId && requestedRestaurantId !== userRestaurantId) {
    console.warn(`🚫 Accès restaurant refusé: user ${userRestaurantId} vs requested ${requestedRestaurantId}`);
    return res.status(403).json({
      success: false,
      message: 'Accès limité à votre restaurant'
    });
  }

  next();
};

// === NOUVEAU: Middleware de vérification des permissions avancées ===
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Définition des permissions par rôle
    const rolePermissions = {
      admin: ['*'], // Accès total
      owner: [
        'restaurants:read', 'restaurants:write', 'restaurants:delete',
        'users:read', 'users:write', 'users:delete',
        'orders:read', 'orders:write', 'orders:delete',
        'reservations:read', 'reservations:write', 'reservations:delete',
        'menu:read', 'menu:write', 'menu:delete',
        'floorplans:read', 'floorplans:write', 'floorplans:delete',
        'notifications:read', 'notifications:write'
      ],
      manager: [
        'users:read', 'users:write',
        'orders:read', 'orders:write',
        'reservations:read', 'reservations:write',
        'menu:read', 'menu:write',
        'floorplans:read', 'floorplans:write',
        'notifications:read'
      ],
      staff_floor: [
        'orders:read', 'orders:write',
        'reservations:read', 'reservations:write',
        'menu:read',
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
      ]
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    // Admin a tous les droits
    if (userPermissions.includes('*')) {
      return next();
    }

    // Vérifier la permission spécifique
    if (!userPermissions.includes(permission)) {
      console.warn(`🚫 Permission refusée: ${req.user.role} n'a pas ${permission}`);
      return res.status(403).json({
        success: false,
        message: `Permission insuffisante: ${permission}`,
        userRole: req.user.role,
        userPermissions
      });
    }

    console.log(`✅ Permission accordée: ${req.user.role} pour ${permission}`);
    next();
  };
};

module.exports = { 
  auth, 
  requireRole, 
  requireSameRestaurant, 
  checkPermission 
};