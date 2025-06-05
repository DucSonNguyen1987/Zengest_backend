/**
 * CORRECTION: src/middleware/roleCheck.js
 * Middleware de vérification des rôles et restaurants avec gestion flexible
 */

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

/**
 * Middleware pour vérifier que l'utilisateur appartient au même restaurant
 * CORRECTION: Assouplissement pour owner sans restaurant
 */
const requireSameRestaurant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role.toLowerCase();
    
    // CORRECTION: Admin a accès à tous les restaurants
    if (userRole === 'admin') {
      console.log('Admin - accès tous restaurants autorisé');
      return next();
    }

    // CORRECTION: Owner peut agir même sans restaurant assigné
    if (userRole === 'owner') {
      console.log('Owner - accès autorisé (gestion restaurant)');
      
      // Si owner a un restaurant, l'ajouter pour filtrage
      if (req.user.restaurantId) {
        req.restaurantId = req.user.restaurantId._id || req.user.restaurantId;
      }
      
      return next();
    }

    // Pour les autres rôles, vérifier l'assignation restaurant
    if (!req.user.restaurantId) {
      console.log(`Utilisateur ${req.user.email} (${userRole}) sans restaurant assigné`);
      return res.status(403).json({
        success: false,
        message: 'Aucun restaurant assigné. Contactez un administrateur.',
        code: 'NO_RESTAURANT_ASSIGNED',
        userRole: userRole
      });
    }

    // Vérifier que le restaurant existe et est actif
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) {
      console.log(`Restaurant ${req.user.restaurantId} non trouvé pour ${req.user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Restaurant assigné introuvable',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    if (!restaurant.isActive) {
      console.log(`Restaurant ${restaurant.name} inactif pour ${req.user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Restaurant temporairement indisponible',
        code: 'RESTAURANT_INACTIVE'
      });
    }

    // Ajouter les IDs pour filtrage dans les contrôleurs
    req.restaurantId = req.user.restaurantId._id || req.user.restaurantId;
    req.restaurant = restaurant;

    console.log(`Restaurant vérifié: ${restaurant.name} pour ${req.user.email} (${userRole})`);
    next();

  } catch (error) {
    console.error('Erreur requireSameRestaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification restaurant',
      code: 'RESTAURANT_CHECK_ERROR'
    });
  }
};

/**
 * Middleware pour vérifier les rôles staff (tous ceux qui peuvent travailler)
 * CORRECTION: Rôles en minuscules
 */
const requireStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role.toLowerCase();
  const staffRoles = ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen'];

  if (!staffRoles.includes(userRole)) {
    console.log(`Accès staff refusé pour ${req.user.email} (${userRole})`);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé au personnel du restaurant',
      code: 'STAFF_ACCESS_REQUIRED',
      userRole: userRole,
      requiredRoles: staffRoles
    });
  }

  console.log(`Accès staff autorisé: ${req.user.email} (${userRole})`);
  next();
};

/**
 * Middleware pour vérifier les rôles de gestion
 * CORRECTION: Rôles en minuscules et Owner inclus
 */
const requireManagement = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role.toLowerCase();
  const managementRoles = ['admin', 'owner', 'manager'];

  if (!managementRoles.includes(userRole)) {
    console.log(`Accès gestion refusé pour ${req.user.email} (${userRole})`);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé à la direction',
      code: 'MANAGEMENT_ACCESS_REQUIRED',
      userRole: userRole,
      requiredRoles: managementRoles
    });
  }

  console.log(`Accès gestion autorisé: ${req.user.email} (${userRole})`);
  next();
};

/**
 * Middleware pour vérifier le rôle admin uniquement
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role.toLowerCase();

  if (userRole !== 'admin') {
    console.log(`Accès admin refusé pour ${req.user.email} (${userRole})`);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs',
      code: 'ADMIN_ACCESS_REQUIRED',
      userRole: userRole
    });
  }

  console.log(`Accès admin autorisé: ${req.user.email}`);
  next();
};

/**
 * Middleware pour vérifier l'owner ou admin
 * CORRECTION: Owner a maintenant les mêmes droits que admin pour son restaurant
 */
const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role.toLowerCase();
  const allowedRoles = ['admin', 'owner'];

  if (!allowedRoles.includes(userRole)) {
    console.log(`Accès owner/admin refusé pour ${req.user.email} (${userRole})`);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux propriétaires et administrateurs',
      code: 'OWNER_ADMIN_ACCESS_REQUIRED',
      userRole: userRole,
      requiredRoles: allowedRoles
    });
  }

  console.log(`Accès owner/admin autorisé: ${req.user.email} (${userRole})`);
  next();
};

/**
 * Middleware pour vérifier les permissions spécifiques au rôle
 * CORRECTION: Gestion flexible des permissions par contexte
 */
const requireRoleForAction = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role.toLowerCase();
    
    // Définir les permissions par action
    const actionPermissions = {
      'create_user': ['admin', 'owner'],
      'delete_user': ['admin'],
      'manage_restaurant': ['admin', 'owner'],
      'view_all_restaurants': ['admin'],
      'manage_orders': ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen'],
      'manage_reservations': ['admin', 'owner', 'manager', 'staff_floor'],
      'manage_menu': ['admin', 'owner', 'manager'],
      'view_statistics': ['admin', 'owner', 'manager'],
      'manage_floorplans': ['admin', 'owner', 'manager'],
      'send_notifications': ['admin', 'owner', 'manager']
    };

    const allowedRoles = actionPermissions[action] || [];

    if (!allowedRoles.includes(userRole)) {
      console.log(`Action ${action} refusée pour ${req.user.email} (${userRole})`);
      return res.status(403).json({
        success: false,
        message: `Action non autorisée: ${action}`,
        code: 'ACTION_NOT_ALLOWED',
        action: action,
        userRole: userRole,
        requiredRoles: allowedRoles
      });
    }

    console.log(`Action ${action} autorisée pour ${req.user.email} (${userRole})`);
    next();
  };
};

/**
 * Middleware pour vérifier l'accès aux données d'un autre utilisateur
 * CORRECTION: Owner peut gérer les utilisateurs de son restaurant
 */
const requireUserAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const currentUserRole = req.user.role.toLowerCase();
    const targetUserId = req.params.id || req.params.userId;

    // Admin a accès à tous les utilisateurs
    if (currentUserRole === 'admin') {
      return next();
    }

    // Accès à son propre profil
    if (targetUserId === req.user._id.toString()) {
      return next();
    }

    // Owner/Manager peuvent accéder aux utilisateurs de leur restaurant
    if (['owner', 'manager'].includes(currentUserRole) && req.user.restaurantId) {
      const targetUser = await User.findById(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      // Vérifier même restaurant
      if (targetUser.restaurantId && 
          targetUser.restaurantId.toString() === req.user.restaurantId.toString()) {
        return next();
      }
    }

    console.log(`Accès utilisateur refusé: ${req.user.email} vers ${targetUserId}`);
    res.status(403).json({
      success: false,
      message: 'Accès non autorisé à cet utilisateur',
      code: 'USER_ACCESS_DENIED'
    });

  } catch (error) {
    console.error('Erreur requireUserAccess:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification d\'accès utilisateur',
      code: 'USER_ACCESS_CHECK_ERROR'
    });
  }
};

/**
 * Middleware pour vérifier l'accès aux données sensibles
 * (statistiques, données financières, etc.)
 */
const requireSensitiveDataAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role.toLowerCase();
  const sensitiveRoles = ['admin', 'owner', 'manager'];

  if (!sensitiveRoles.includes(userRole)) {
    console.log(`Accès données sensibles refusé pour ${req.user.email} (${userRole})`);
    return res.status(403).json({
      success: false,
      message: 'Accès aux données sensibles non autorisé',
      code: 'SENSITIVE_DATA_ACCESS_DENIED',
      userRole: userRole
    });
  }

  next();
};

/**
 * Fonction utilitaire pour vérifier si un utilisateur peut accéder à une ressource
 */
const canAccessResource = (user, resource, action = 'read') => {
  if (!user) return false;

  const userRole = user.role.toLowerCase();

  // Admin a accès à tout
  if (userRole === 'admin') return true;

  // Logique d'accès par resource et action
  const accessMatrix = {
    'restaurant': {
      'read': ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen'],
      'write': ['admin', 'owner', 'manager'],
      'delete': ['admin', 'owner']
    },
    'user': {
      'read': ['admin', 'owner', 'manager'],
      'write': ['admin', 'owner'],
      'delete': ['admin']
    },
    'order': {
      'read': ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen'],
      'write': ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen'],
      'delete': ['admin', 'owner', 'manager']
    },
    'menu': {
      'read': ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen', 'guest'],
      'write': ['admin', 'owner', 'manager'],
      'delete': ['admin', 'owner', 'manager']
    },
    'reservation': {
      'read': ['admin', 'owner', 'manager', 'staff_floor'],
      'write': ['admin', 'owner', 'manager', 'staff_floor'],
      'delete': ['admin', 'owner', 'manager']
    },
    'statistics': {
      'read': ['admin', 'owner', 'manager'],
      'write': ['admin', 'owner'],
      'delete': ['admin']
    }
  };

  const allowedRoles = accessMatrix[resource]?.[action] || [];
  return allowedRoles.includes(userRole);
};

module.exports = {
  requireSameRestaurant,
  requireStaff,
  requireManagement,
  requireAdmin,
  requireOwnerOrAdmin,
  requireRoleForAction,
  requireUserAccess,
  requireSensitiveDataAccess,
  canAccessResource
};