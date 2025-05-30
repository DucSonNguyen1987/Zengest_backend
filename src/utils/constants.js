const USER_ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner', 
  MANAGER: 'manager',
  STAFF_BAR: 'staff_bar',
  STAFF_FLOOR: 'staff_floor',
  STAFF_KITCHEN: 'staff_kitchen',
  GUEST: 'guest'
};

const PERMISSIONS = {
  // Gestion des utilisateurs
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  
  // Gestion du menu
  CREATE_MENU_ITEM: 'create_menu_item',
  READ_MENU: 'read_menu',
  UPDATE_MENU_ITEM: 'update_menu_item',
  DELETE_MENU_ITEM: 'delete_menu_item',
  
  // Gestion des commandes
  CREATE_ORDER: 'create_order',
  READ_ORDER: 'read_order',
  UPDATE_ORDER: 'update_order',
  DELETE_ORDER: 'delete_order',
  PROCESS_ORDER: 'process_order',
  
  // Gestion des tables
  CREATE_TABLE: 'create_table',
  READ_TABLE: 'read_table',
  UPDATE_TABLE: 'update_table',
  DELETE_TABLE: 'delete_table',
  
  // Analytics et rapports
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REPORTS: 'view_reports'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  PAID: 'paid',
  CANCELLED: 'cancelled'
};

const TABLE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning'
};

module.exports = {
  USER_ROLES,
  PERMISSIONS,
  ORDER_STATUS,
  TABLE_STATUS
};