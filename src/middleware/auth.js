/**
 * CORRECTION: src/middleware/auth.js
 * Permissions Owner renforcées et gestion erreurs améliorée
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// Middleware d'authentification principal
const auth = async (req, res, next) => {
  try {
    // Récupérer le token
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Token d\'authentification requis.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); 
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant.',
        code: 'MISSING_TOKEN'
      });
    }

    if (token === 'PUBLIC_RESERVATIONS_TOKEN_2025') {
      console.log('🌍 Token public détecté pour réservations');
      
      // Créer un utilisateur fictif pour les réservations publiques
      req.user = {
        id: 'public',
        email: 'public@reservations',
        role: 'public',
        isActive: true,
        isPublicToken: true,
        permissions: ['reservations:write', 'reservations:read'],
        restaurantId: null
      };
      req.token = token;
      
      console.log('✅ Authentification publique réussie pour réservations');
      return next();
    }

    // Vérifier le token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré. Veuillez vous reconnecter.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token invalide.',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }

    // Récupérer l'utilisateur avec populate du restaurant
    const user = await User.findById(decoded.id)
      .populate('restaurantId', 'name isActive')
      .select('-password -security.lockUntil');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Vérifier si l'utilisateur est verrouillé
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Compte temporairement verrouillé.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // CORRECTION: Attribution des permissions selon le rôle
    user.permissions = getPermissionsByRole(user.role, user.restaurantId);

    // Ajouter l'utilisateur à la requête
    req.user = user;
    req.token = token;

    console.log(`Auth réussie: ${user.email} (${user.role}) - Restaurant: ${user.restaurantId?.name || 'N/A'}`);
    
    next();

  } catch (error) {
    console.error('Erreur middleware auth:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification.',
      code: 'AUTH_ERROR'
    });
  }
};

// CORRECTION: Fonction permissions renforcée pour Owner
const getPermissionsByRole = (role, restaurant) => {
  const basePermissions = {
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
    
    // CORRECTION: Owner a maintenant TOUTES les permissions restaurants
    owner: [
      'restaurants:read', 'restaurants:write', 'restaurants:delete', // AJOUTÉ delete
      'users:read', 'users:write', 'users:delete', // AJOUTÉ delete
      'orders:read', 'orders:write', 'orders:delete',
      'menu:read', 'menu:write', 'menu:delete',
      'reservations:read', 'reservations:write', 'reservations:delete',
      'floorplans:read', 'floorplans:write', 'floorplans:delete',
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

  let permissions = basePermissions[role] || [];

  // CORRECTION: Gestion spéciale pour owner sans restaurant
  if (role === 'owner' && !restaurant) {
    // Owner sans restaurant peut quand même créer/gérer restaurants
    console.log('Owner sans restaurant - permissions restaurants maintenues');
    permissions = [...permissions, 'restaurants:create'];
  }

  return permissions;
};

// Middleware pour vérifier une permission spécifique
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise.',
        code: 'AUTH_REQUIRED'
      });
    }

    // CORRECTION: Vérification permission améliorée
    const userPermissions = req.user.permissions || [];
    const hasPermission = userPermissions.includes(permission);
    
    console.log(`Vérification permission "${permission}" pour ${req.user.email}:`, hasPermission);
    console.log('Permissions utilisateur:', userPermissions);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Permission manquante: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Middleware pour vérifier un rôle spécifique
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise.',
        code: 'AUTH_REQUIRED'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    // CORRECTION: Normaliser les rôles (minuscules)
    const normalizedRoles = allowedRoles.map(role => role.toLowerCase());
    const userRole = req.user.role.toLowerCase();

    if (!normalizedRoles.includes(userRole)) {
      console.log(`Accès refusé: ${req.user.email} (${userRole}) n'a pas le rôle requis: ${normalizedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: 'Rôle insuffisant pour cette action.',
        code: 'INSUFFICIENT_ROLE',
        required: normalizedRoles,
        userRole: userRole
      });
    }

    console.log(`Accès autorisé: ${req.user.email} (${userRole})`);
    next();
  };
};



 
// Middleware pour les opérations staff
const requireStaff = (req, res, next) => {
  const staffRoles = ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen'];
  return requireRole(staffRoles)(req, res, next);
};

// Middleware pour les opérations de gestion
const requireManagement = (req, res, next) => {
  const managementRoles = ['admin', 'owner', 'manager'];
  return requireRole(managementRoles)(req, res, next);
};

// Middleware optionnel (ne bloque pas si pas authentifié)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continuer sans authentification
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continuer sans authentification
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id)
      .populate('restaurantId', 'name isActive')
      .select('-password');

    if (user && user.isActive && !user.isLocked) {
      user.permissions = getPermissionsByRole(user.role, user.restaurantId);
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    console.warn('Auth optionnelle échouée:', error.message);
    next();
  }
};

// Fonction utilitaire pour générer un token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwtSecret,
    { expiresIn: config.jwtExpire || '24h' }
  );
};

// Fonction utilitaire pour vérifier si un utilisateur a une permission
const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

// Fonction utilitaire pour vérifier si un utilisateur a un rôle
const hasRole = (user, roles) => {
  if (!user) return false;
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.map(r => r.toLowerCase()).includes(user.role.toLowerCase());
};

module.exports = {
  auth,
  requirePermission,
  requireRole,
  requireStaff,
  requireManagement,
  optionalAuth,
  generateToken,
  hasPermission,
  hasRole,
  getPermissionsByRole
};