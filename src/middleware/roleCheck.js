const { hasPermission, canAccessRestaurant } = require('../utils/permissions');
const { USER_ROLES } = require('../utils/constants');

// Middleware pour vérifier les rôles spécifiques
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

// Middleware pour vérifier les permissions spécifiques
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission requise: ${permission}`,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

// Middleware pour vérifier que l'utilisateur appartient au même restaurant
const requireSameRestaurant = (req, res, next) => {
  console.log('🏢 DEBUG requireSameRestaurant:', {
    userRole: req.user?.role,
    userRestaurantId: req.user?.restaurantId?.toString(),
    isAdmin: req.user?.role === USER_ROLES.ADMIN
  });

  if (!req.user) {
    console.log('❌ requireSameRestaurant: Pas d\'utilisateur');
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
  }
  
  // Les admins peuvent accéder à tous les restaurants
  if (req.user.role === USER_ROLES.ADMIN) {
    console.log('✅ requireSameRestaurant: Admin autorisé');
    return next();
  }
  
  // Vérifier que l'utilisateur a un restaurant assigné
  if (!req.user.restaurantId || !req.user.restaurantId._id) {
    console.log('❌ requireSameRestaurant: Aucun restaurant assigné');
    return res.status(403).json({
      success: false,
      message: 'Aucun restaurant assigné'
    });
  }

  // Si un restaurantId est fourni dans les params ou body, vérifier qu'il correspond
  const targetRestaurantId = req.params.restaurantId || req.body.restaurantId; // CORRIGÉ: req.boy -> req.body

  if (targetRestaurantId && !canAccessRestaurant(req.user.role, req.user.restaurantId._id, targetRestaurantId)) {
    return res.status(403).json({
      success: false, // CORRIGÉ: espacement
      message: 'Accès non autorisé à ce restaurant'
    });
  }
  
  // Pour les routes GET génériques, on laisse passer et on filtrera dans la route
  if (req.method === 'GET' && !req.params.id) {
    console.log('✅ requireSameRestaurant: Route GET générique autorisée');
    return next();
  }
  
  console.log('✅ requireSameRestaurant: Validation passée');
  next();
};

// Middleware pour les propriétaires/managers seulement
const requireManagement = requireRole(USER_ROLES.ADMIN, USER_ROLES.OWNER, USER_ROLES.MANAGER);

// Middleware pour le staff seulement (inclut management)
const requireStaff = requireRole(
  USER_ROLES.ADMIN,
  USER_ROLES.OWNER,
  USER_ROLES.MANAGER,
  USER_ROLES.STAFF_BAR,
  USER_ROLES.STAFF_FLOOR,
  USER_ROLES.STAFF_KITCHEN
);

// Middleware pour vérifier que l'utilisateur peut modifier un autre utilisateur
const canModifyUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
  }
  
  const targetUserId = req.params.id || req.params.userId;
  
  // Un utilisateur peut toujours modifier ses propres données
  if (targetUserId === req.user._id.toString()) {
    return next();
  }
  
  // Seuls les managers et plus peuvent modifier d'autres utilisateurs
  if (!req.user.canManageUsers()) {
    return res.status(403).json({
      success: false,
      message: 'Permissions insuffisantes pour modifier cet utilisateur'
    });
  }
  
  next();
};

module.exports = {
  requireRole,
  requirePermission,
  requireSameRestaurant,
  requireManagement,
  requireStaff,
  canModifyUser
};