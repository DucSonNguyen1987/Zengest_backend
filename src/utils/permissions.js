const { USER_ROLES, PERMISSIONS } = require('./constants');

const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Toutes les permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [USER_ROLES.OWNER]: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.CREATE_MENU_ITEM,
    PERMISSIONS.READ_MENU,
    PERMISSIONS.UPDATE_MENU_ITEM,
    PERMISSIONS.DELETE_MENU_ITEM,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.CREATE_TABLE,
    PERMISSIONS.READ_TABLE,
    PERMISSIONS.UPDATE_TABLE,
    PERMISSIONS.DELETE_TABLE,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_RESTAURANT,
    PERMISSIONS.DELETE_RESTAURANT,
    PERMISSIONS.READ_RESTAURANT,
    PERMISSIONS.UPDATE_RESTAURANT
  ],
  
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.CREATE_MENU_ITEM,
    PERMISSIONS.READ_MENU,
    PERMISSIONS.UPDATE_MENU_ITEM,
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.PROCESS_ORDER,
    PERMISSIONS.READ_TABLE,
    PERMISSIONS.UPDATE_TABLE,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  
  [USER_ROLES.STAFF_BAR]: [
    PERMISSIONS.READ_MENU,
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.PROCESS_ORDER,
    PERMISSIONS.READ_TABLE,
    PERMISSIONS.UPDATE_TABLE
  ],
  
  [USER_ROLES.STAFF_FLOOR]: [
    PERMISSIONS.READ_MENU,
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.READ_TABLE,
    PERMISSIONS.UPDATE_TABLE
  ],
  
  [USER_ROLES.STAFF_KITCHEN]: [
    PERMISSIONS.READ_MENU,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.PROCESS_ORDER
  ],
  
  [USER_ROLES.GUEST]: [
    PERMISSIONS.READ_MENU,
    PERMISSIONS.CREATE_ORDER
  ]
};

const hasPermission = (userRole, permission) => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

const getUserPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

const canAccessRestaurant = (userRole, userRestaurantId, targetRestaurantId) => {
  // Les admins peuvent accéder à tous les restaurants
  if (userRole === USER_ROLES.ADMIN) {
    return true;
  }
  
  // Si pas de restaurant assigné à l'utilisateur, refuser l'accès
  if (!userRestaurantId) {
    return false;
  }
  
  // Extraire l'ID selon le type (ObjectId ou string)
  let userRestId;
  if (typeof userRestaurantId === 'object' && userRestaurantId !== null) {
    // Si c'est un objet (populé), prendre l'_id
    userRestId = userRestaurantId._id || userRestaurantId;
  } else {
    // Si c'est déjà un string/ObjectId
    userRestId = userRestaurantId;
  }
  
  // Comparer les IDs en tant que strings
  return userRestId?.toString() === targetRestaurantId?.toString();
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getUserPermissions,
  canAccessRestaurant
};