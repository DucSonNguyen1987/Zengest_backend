const { sendErrorResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');

// Définition des rôles et leurs permissions
const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
  PUBLIC: 'public'
};

const PERMISSIONS = {
  // Gestion Restaurant
  MANAGE_RESTAURANT: 'manage_restaurant',
  VIEW_RESTAURANT: 'view_restaurant',
  UPDATE_RESTAURANT_SETTINGS: 'update_restaurant_settings',

  // Gestion Utilisateurs
  MANAGE_USERS: 'manage_users',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  VIEW_USERS: 'view_users',
  MANAGE_ROLES: 'manage_roles',

  // Gestion Menu
  MANAGE_MENU: 'manage_menu',
  CREATE_MENU_ITEM: 'create_menu_item',
  UPDATE_MENU_ITEM: 'update_menu_item',
  DELETE_MENU_ITEM: 'delete_menu_item',
  VIEW_MENU: 'view_menu',
  MANAGE_CATEGORIES: 'manage_categories',
  UPDATE_PRICES: 'update_prices',

  // Plats du Jour
  MANAGE_DAILY_SPECIALS: 'manage_daily_specials',
  CREATE_DAILY_SPECIAL: 'create_daily_special',
  UPDATE_DAILY_SPECIAL: 'update_daily_special',
  DELETE_DAILY_SPECIAL: 'delete_daily_special',
  APPROVE_DAILY_SPECIAL: 'approve_daily_special',
  VIEW_DAILY_SPECIALS: 'view_daily_specials',

  // Gestion Commandes
  MANAGE_ORDERS: 'manage_orders',
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER: 'update_order',
  DELETE_ORDER: 'delete_order',
  VIEW_ORDERS: 'view_orders',
  PROCESS_PAYMENT: 'process_payment',

  // Gestion Tables
  MANAGE_TABLES: 'manage_tables',
  UPDATE_TABLE_STATUS: 'update_table_status',
  VIEW_FLOOR_PLAN: 'view_floor_plan',
  EDIT_FLOOR_PLAN: 'edit_floor_plan',

  // Gestion Réservations
  MANAGE_RESERVATIONS: 'manage_reservations',
  CREATE_RESERVATION: 'create_reservation',
  UPDATE_RESERVATION: 'update_reservation',
  DELETE_RESERVATION: 'delete_reservation',
  VIEW_RESERVATIONS: 'view_reservations',
  ASSIGN_TABLE: 'assign_table',

  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  SEND_NOTIFICATION: 'send_notification',
  VIEW_NOTIFICATION_HISTORY: 'view_notification_history',

  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REVENUE_REPORTS: 'view_revenue_reports',
  VIEW_CUSTOMER_ANALYTICS: 'view_customer_analytics',
  EXPORT_DATA: 'export_data',

  // Paramètres
  MANAGE_SETTINGS: 'manage_settings',
  UPDATE_SITE_VITRINE: 'update_site_vitrine',
  MANAGE_MOBILE_APP: 'manage_mobile_app',

  // Cuisine
  VIEW_KITCHEN: 'view_kitchen',
  MANAGE_KITCHEN_QUEUE: 'manage_kitchen_queue',

  // Public
  MAKE_RESERVATION: 'make_reservation',
  VIEW_PUBLIC_MENU: 'view_public_menu',
  CONTACT_RESTAURANT: 'contact_restaurant'
};

// Mapping des rôles vers leurs permissions
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'], // Toutes les permissions

  [ROLES.OWNER]: [
    // Restaurant
    'manage_restaurant',
    'view_restaurant',
    'update_restaurant_settings',
    
    // Utilisateurs
    'manage_users',
    'create_user',
    'update_user',
    'delete_user',
    'view_users',
    'manage_roles',
    
    // Menu
    'manage_menu',
    'create_menu_item',
    'update_menu_item',
    'delete_menu_item',
    'view_menu',
    'manage_categories',
    'update_prices',
    
    // Plats du jour
    'manage_daily_specials',
    'create_daily_special',
    'update_daily_special',
    'delete_daily_special',
    'approve_daily_special',
    'view_daily_specials',
    
    // Commandes
    'manage_orders',
    'create_order',
    'update_order',
    'delete_order',
    'view_orders',
    'process_payment',
    
    // Tables
    'manage_tables',
    'update_table_status',
    'view_floor_plan',
    'edit_floor_plan',
    
    // Réservations
    'manage_reservations',
    'create_reservation',
    'update_reservation',
    'delete_reservation',
    'view_reservations',
    'assign_table',
    
    // Notifications
    'manage_notifications',
    'send_notification',
    'view_notification_history',
    
    // Analytics
    'view_analytics',
    'view_revenue_reports',
    'view_customer_analytics',
    'export_data',
    
    // Paramètres
    'manage_settings',
    'update_site_vitrine',
    'manage_mobile_app',
    
    // Cuisine
    'view_kitchen',
    'manage_kitchen_queue'
  ],

  [ROLES.MANAGER]: [
    // Restaurant (lecture seule)
    'view_restaurant',
    
    // Menu
    'view_menu',
    'update_menu_item',
    'update_prices',
    
    // Plats du jour
    'manage_daily_specials',
    'create_daily_special',
    'update_daily_special',
    'delete_daily_special',
    'approve_daily_special',
    'view_daily_specials',
    
    // Commandes
    'manage_orders',
    'create_order',
    'update_order',
    'view_orders',
    'process_payment',
    
    // Tables
    'manage_tables',
    'update_table_status',
    'view_floor_plan',
    
    // Réservations
    'manage_reservations',
    'create_reservation',
    'update_reservation',
    'view_reservations',
    'assign_table',
    
    // Notifications
    'send_notification',
    'view_notification_history',
    
    // Cuisine
    'view_kitchen',
    'manage_kitchen_queue',
    
    // Analytics limitées
    'view_analytics'
  ],

  [ROLES.STAFF]: [
    // Menu (lecture seule)
    'view_menu',
    
    // Plats du jour (lecture + création)
    'create_daily_special',
    'update_daily_special',
    'view_daily_specials',
    
    // Commandes
    'manage_orders',
    'create_order',
    'update_order',
    'view_orders',
    
    // Tables
    'manage_tables',
    'update_table_status',
    'view_floor_plan',
    
    // Réservations limitées
    'view_reservations',
    'assign_table',
    
    // Cuisine
    'view_kitchen'
  ],

  [ROLES.PUBLIC]: [
    'make_reservation',
    'view_public_menu',
    'contact_restaurant'
  ]
};

/**
 * Vérifier si un utilisateur a une permission spécifique
 */
const hasPermission = (user, requiredPermission) => {
  // Admin a toutes les permissions
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // Vérifier les permissions du rôle
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  
  // Wildcard pour admin
  if (rolePermissions.includes('*')) {
    return true;
  }

  // Vérifier si la permission est dans la liste
  if (rolePermissions.includes(requiredPermission)) {
    return true;
  }

  // Vérifier les permissions personnalisées si elles existent
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(requiredPermission);
  }

  return false;
};

/**
 * Vérifier si un utilisateur a un des rôles requis
 */
const hasRole = (user, requiredRoles) => {
  if (typeof requiredRoles === 'string') {
    return user.role === requiredRoles;
  }
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  
  return false;
};

/**
 * Vérifier les permissions contextuelles (ex: propriétaire de la ressource)
 */
const hasContextualPermission = (user, permission, context = {}) => {
  // Vérification de base des permissions
  if (!hasPermission(user, permission)) {
    return false;
  }

  // Vérifications contextuelles spécifiques
  if (context.resourceOwnerId) {
    // L'utilisateur peut modifier ses propres ressources
    if (context.resourceOwnerId.toString() === user._id.toString()) {
      return true;
    }
    
    // Ou s'il a les permissions de niveau supérieur
    return hasRole(user, [ROLES.ADMIN, ROLES.OWNER, ROLES.MANAGER]);
  }

  if (context.restaurantId) {
    // Vérifier que l'utilisateur appartient au bon restaurant
    if (user.restaurant && user.restaurant._id) {
      return user.restaurant._id.toString() === context.restaurantId.toString();
    }
  }

  return true;
};

/**
 * Middleware pour vérifier une permission
 */
const checkPermission = (requiredPermission, options = {}) => {
  return (req, res, next) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        return sendErrorResponse(res, 'Authentification requise', 401);
      }

      // Construire le contexte pour les vérifications
      const context = {
        ...options,
        userId: req.user._id,
        restaurantId: req.user.restaurant?._id,
        userRole: req.user.role
      };

      // Ajouter des éléments du contexte depuis les paramètres de la requête
      if (req.params.id) context.resourceId = req.params.id;
      if (req.params.restaurantId) context.restaurantId = req.params.restaurantId;
      if (req.body.restaurant) context.restaurantId = req.body.restaurant;

      // Vérifier la permission
      if (!hasContextualPermission(req.user, requiredPermission, context)) {
        logger.warn(`Permission refusée: ${req.user.email} tentait d'accéder à ${requiredPermission}`, {
          userId: req.user._id,
          userRole: req.user.role,
          requiredPermission,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip
        });

        return sendErrorResponse(res, 'Permission insuffisante', 403);
      }

      // Ajouter les informations de permission au request pour usage ultérieur
      req.userPermissions = {
        hasPermission: (permission) => hasPermission(req.user, permission),
        hasRole: (roles) => hasRole(req.user, roles),
        hasContextualPermission: (permission, ctx) => hasContextualPermission(req.user, permission, ctx)
      };

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification des permissions:', error);
      sendErrorResponse(res, 'Erreur de vérification des permissions', 500);
    }
  };
};

/**
 * Middleware pour vérifier un rôle
 */
const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return sendErrorResponse(res, 'Authentification requise', 401);
      }

      if (!hasRole(req.user, requiredRoles)) {
        logger.warn(`Rôle insuffisant: ${req.user.email} (${req.user.role}) tentait d'accéder à une ressource nécessitant ${requiredRoles}`, {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip
        });

        return sendErrorResponse(res, 'Rôle insuffisant', 403);
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification du rôle:', error);
      sendErrorResponse(res, 'Erreur de vérification du rôle', 500);
    }
  };
};

/**
 * Middleware pour vérifier l'appartenance au restaurant
 */
const checkRestaurantAccess = (req, res, next) => {
  try {
    if (!req.user) {
      return sendErrorResponse(res, 'Authentification requise', 401);
    }

    // Admin peut accéder à tous les restaurants
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // Récupérer l'ID du restaurant depuis différentes sources
    let targetRestaurantId = req.params.restaurantId || 
                           req.body.restaurant || 
                           req.query.restaurantId;

    // Si pas d'ID spécifique, utiliser le restaurant de l'utilisateur
    if (!targetRestaurantId) {
      targetRestaurantId = req.user.restaurant?._id;
    }

    // Vérifier que l'utilisateur appartient au restaurant
    if (!req.user.restaurant || !req.user.restaurant._id) {
      return sendErrorResponse(res, 'Utilisateur non assigné à un restaurant', 403);
    }

    if (req.user.restaurant._id.toString() !== targetRestaurantId.toString()) {
      logger.warn(`Accès restaurant refusé: ${req.user.email} tentait d'accéder au restaurant ${targetRestaurantId}`, {
        userId: req.user._id,
        userRestaurant: req.user.restaurant._id,
        targetRestaurant: targetRestaurantId,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return sendErrorResponse(res, 'Accès au restaurant non autorisé', 403);
    }

    next();
  } catch (error) {
    logger.error('Erreur lors de la vérification de l\'accès restaurant:', error);
    sendErrorResponse(res, 'Erreur de vérification d\'accès', 500);
  }
};

/**
 * Middleware pour vérifier la propriété d'une ressource
 */
const checkResourceOwnership = (resourceField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendErrorResponse(res, 'Authentification requise', 401);
      }

      // Admin et Owner peuvent accéder à toutes les ressources
      if (hasRole(req.user, [ROLES.ADMIN, ROLES.OWNER])) {
        return next();
      }

      // La vérification de propriété sera faite dans le contrôleur
      // car nous avons besoin de récupérer la ressource d'abord
      req.checkOwnership = {
        field: resourceField,
        userId: req.user._id
      };

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de propriété:', error);
      sendErrorResponse(res, 'Erreur de vérification de propriété', 500);
    }
  };
};

/**
 * Middleware combiné pour les vérifications communes
 */
const requireAuth = (permission, options = {}) => {
  const middlewares = [];

  // Toujours vérifier l'appartenance au restaurant sauf si explicitement désactivé
  if (options.checkRestaurant !== false) {
    middlewares.push(checkRestaurantAccess);
  }

  // Vérifier la permission si spécifiée
  if (permission) {
    middlewares.push(checkPermission(permission, options));
  }

  // Vérifier la propriété si spécifiée
  if (options.checkOwnership) {
    middlewares.push(checkResourceOwnership(options.ownershipField));
  }

  return middlewares;
};

/**
 * Obtenir toutes les permissions d'un utilisateur
 */
const getUserPermissions = (user) => {
  if (user.role === ROLES.ADMIN) {
    return Object.values(PERMISSIONS);
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  const customPermissions = user.permissions || [];

  return [...new Set([...rolePermissions, ...customPermissions])];
};

/**
 * Middleware pour ajouter les permissions utilisateur à la réponse
 */
const attachUserPermissions = (req, res, next) => {
  if (req.user) {
    req.user.computedPermissions = getUserPermissions(req.user);
  }
  next();
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasRole,
  hasContextualPermission,
  checkPermission,
  checkRole,
  checkRestaurantAccess,
  checkResourceOwnership,
  requireAuth,
  getUserPermissions,
  attachUserPermissions
};