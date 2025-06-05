/**
 * CORRECTION: src/utils/constants.js
 * Constantes du système avec rôles en minuscules et statuts cohérents
 */

// === RÔLES UTILISATEUR (EN MINUSCULES) ===
const USER_ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner', 
  MANAGER: 'manager',
  STAFF_FLOOR: 'staff_floor',
  STAFF_BAR: 'staff_bar',
  STAFF_KITCHEN: 'staff_kitchen',
  GUEST: 'guest'
};

// Liste des rôles pour validation
const USER_ROLES_LIST = Object.values(USER_ROLES);

// Rôles avec permissions étendues
const MANAGEMENT_ROLES = [USER_ROLES.ADMIN, USER_ROLES.OWNER, USER_ROLES.MANAGER];
const STAFF_ROLES = [
  USER_ROLES.ADMIN, 
  USER_ROLES.OWNER, 
  USER_ROLES.MANAGER,
  USER_ROLES.STAFF_FLOOR,
  USER_ROLES.STAFF_BAR,
  USER_ROLES.STAFF_KITCHEN
];

// === STATUTS DES COMMANDES ===
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  PAID: 'paid',
  CANCELLED: 'cancelled'
};

const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);

// Statuts actifs (commandes en cours)
const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY
];

// Statuts finaux (commandes terminées)
const FINAL_ORDER_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.CANCELLED
];

// Transitions de statuts autorisées
const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SERVED]: [ORDER_STATUS.PAID],
  [ORDER_STATUS.PAID]: [], // État final
  [ORDER_STATUS.CANCELLED]: [] // État final
};

// === STATUTS DES RÉSERVATIONS ===
const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SEATED: 'seated',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

const RESERVATION_STATUS_LIST = Object.values(RESERVATION_STATUS);

// Statuts actifs pour les réservations
const ACTIVE_RESERVATION_STATUSES = [
  RESERVATION_STATUS.PENDING,
  RESERVATION_STATUS.CONFIRMED,
  RESERVATION_STATUS.SEATED
];

// === STATUTS DES TABLES ===
const TABLE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
  CLEANING: 'cleaning'
};

const TABLE_STATUS_LIST = Object.values(TABLE_STATUS);

// === PRIORITÉS ===
const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  URGENT: 'urgent'
};

const PRIORITY_LIST = Object.values(PRIORITY_LEVELS);

// === MÉTHODES DE PAIEMENT ===
const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  MIXED: 'mixed',
  PENDING: 'pending'
};

const PAYMENT_METHODS_LIST = Object.values(PAYMENT_METHODS);

// === STATUTS DE PAIEMENT ===
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

// === TYPES DE SERVICE ===
const SERVICE_TYPES = {
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery'
};

const SERVICE_TYPES_LIST = Object.values(SERVICE_TYPES);

// === CATÉGORIES DE MENU ===
const MENU_CATEGORIES = {
  APPETIZERS: 'appetizers',
  MAINS: 'mains',
  DESSERTS: 'desserts',
  BEVERAGES: 'beverages',
  WINES_RED: 'wines_red',
  WINES_WHITE: 'wines_white',
  WINES_ROSE: 'wines_rose',
  WINES_SPARKLING: 'wines_sparkling',
  BEERS: 'beers',
  COCKTAILS: 'cocktails',
  MOCKTAILS: 'mocktails',
  SIDES: 'sides',
  SALADS: 'salads',
  CHEESES: 'cheeses'
};

const MENU_CATEGORIES_LIST = Object.values(MENU_CATEGORIES);

// === FORMES DE TABLES ===
const TABLE_SHAPES = {
  ROUND: 'round',
  SQUARE: 'square',
  RECTANGLE: 'rectangle',
  OVAL: 'oval'
};

const TABLE_SHAPES_LIST = Object.values(TABLE_SHAPES);

// === TYPES D'OBSTACLES (PLANS DE SALLE) ===
const OBSTACLE_TYPES = {
  WALL: 'wall',
  ENTRANCE: 'entrance',
  BAR: 'bar',
  KITCHEN: 'kitchen',
  RESTROOM: 'restroom',
  DECORATION: 'decoration'
};

const OBSTACLE_TYPES_LIST = Object.values(OBSTACLE_TYPES);

// === PERMISSIONS SYSTÈME ===
const PERMISSIONS = {
  // Restaurants
  RESTAURANTS_READ: 'restaurants:read',
  RESTAURANTS_WRITE: 'restaurants:write',
  RESTAURANTS_DELETE: 'restaurants:delete',
  
  // Utilisateurs
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  
  // Commandes
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_DELETE: 'orders:delete',
  
  // Menu
  MENU_READ: 'menu:read',
  MENU_WRITE: 'menu:write',
  MENU_DELETE: 'menu:delete',
  
  // Réservations
  RESERVATIONS_READ: 'reservations:read',
  RESERVATIONS_WRITE: 'reservations:write',
  RESERVATIONS_DELETE: 'reservations:delete',
  
  // Plans de salle
  FLOORPLANS_READ: 'floorplans:read',
  FLOORPLANS_WRITE: 'floorplans:write',
  FLOORPLANS_DELETE: 'floorplans:delete',
  
  // Statistiques
  STATISTICS_READ: 'statistics:read',
  
  // Notifications
  NOTIFICATIONS_SEND: 'notifications:send',
  
  // Système
  SYSTEM_ADMIN: 'system:admin'
};

// Liste des permissions pour validation
const PERMISSIONS_LIST = Object.values(PERMISSIONS);

// === MAPPING RÔLES → PERMISSIONS ===
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.RESTAURANTS_READ, PERMISSIONS.RESTAURANTS_WRITE, PERMISSIONS.RESTAURANTS_DELETE,
    PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_DELETE,
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE, PERMISSIONS.ORDERS_DELETE,
    PERMISSIONS.MENU_READ, PERMISSIONS.MENU_WRITE, PERMISSIONS.MENU_DELETE,
    PERMISSIONS.RESERVATIONS_READ, PERMISSIONS.RESERVATIONS_WRITE, PERMISSIONS.RESERVATIONS_DELETE,
    PERMISSIONS.FLOORPLANS_READ, PERMISSIONS.FLOORPLANS_WRITE, PERMISSIONS.FLOORPLANS_DELETE,
    PERMISSIONS.STATISTICS_READ,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.SYSTEM_ADMIN
  ],
  
  [USER_ROLES.OWNER]: [
    PERMISSIONS.RESTAURANTS_READ, PERMISSIONS.RESTAURANTS_WRITE, PERMISSIONS.RESTAURANTS_DELETE,
    PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_DELETE,
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE, PERMISSIONS.ORDERS_DELETE,
    PERMISSIONS.MENU_READ, PERMISSIONS.MENU_WRITE, PERMISSIONS.MENU_DELETE,
    PERMISSIONS.RESERVATIONS_READ, PERMISSIONS.RESERVATIONS_WRITE, PERMISSIONS.RESERVATIONS_DELETE,
    PERMISSIONS.FLOORPLANS_READ, PERMISSIONS.FLOORPLANS_WRITE, PERMISSIONS.FLOORPLANS_DELETE,
    PERMISSIONS.STATISTICS_READ,
    PERMISSIONS.NOTIFICATIONS_SEND
  ],
  
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.MENU_READ, PERMISSIONS.MENU_WRITE,
    PERMISSIONS.RESERVATIONS_READ, PERMISSIONS.RESERVATIONS_WRITE,
    PERMISSIONS.FLOORPLANS_READ, PERMISSIONS.FLOORPLANS_WRITE,
    PERMISSIONS.STATISTICS_READ
  ],
  
  [USER_ROLES.STAFF_FLOOR]: [
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.MENU_READ,
    PERMISSIONS.RESERVATIONS_READ, PERMISSIONS.RESERVATIONS_WRITE,
    PERMISSIONS.FLOORPLANS_READ
  ],
  
  [USER_ROLES.STAFF_BAR]: [
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.MENU_READ,
    PERMISSIONS.FLOORPLANS_READ
  ],
  
  [USER_ROLES.STAFF_KITCHEN]: [
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.MENU_READ
  ],
  
  [USER_ROLES.GUEST]: [
    PERMISSIONS.MENU_READ,
    PERMISSIONS.FLOORPLANS_READ
  ]
};

// === TYPES DE NOTIFICATIONS ===
const NOTIFICATION_TYPES = {
  RESERVATION_CONFIRMATION: 'reservation_confirmation',
  RESERVATION_REMINDER: 'reservation_reminder',
  RESERVATION_CANCELLATION: 'reservation_cancellation',
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_READY: 'order_ready',
  SYSTEM_ALERT: 'system_alert'
};

const NOTIFICATION_TYPES_LIST = Object.values(NOTIFICATION_TYPES);

// === SOURCES DE DONNÉES ===
const DATA_SOURCES = {
  POS: 'pos',
  ONLINE: 'online',
  PHONE: 'phone',
  WALK_IN: 'walk_in',
  SYSTEM: 'system'
};

const DATA_SOURCES_LIST = Object.values(DATA_SOURCES);

// === LANGUES SUPPORTÉES ===
const LANGUAGES = {
  FRENCH: 'fr',
  ENGLISH: 'en',
  SPANISH: 'es'
};

const LANGUAGES_LIST = Object.values(LANGUAGES);

// === DEVISES ===
const CURRENCIES = {
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP'
};

const CURRENCIES_LIST = Object.values(CURRENCIES);

// === FONCTIONS UTILITAIRES ===

/**
 * Vérifier si un rôle est valide
 */
const isValidRole = (role) => {
  return USER_ROLES_LIST.includes(role?.toLowerCase());
};

/**
 * Normaliser un rôle (en minuscules)
 */
const normalizeRole = (role) => {
  if (!role) return null;
  const normalized = role.toLowerCase();
  return isValidRole(normalized) ? normalized : null;
};

/**
 * Obtenir les permissions d'un rôle
 */
const getPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole] || [];
};

/**
 * Vérifier si un rôle a une permission
 */
const roleHasPermission = (role, permission) => {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
};

/**
 * Vérifier si un statut de commande est actif
 */
const isActiveOrderStatus = (status) => {
  return ACTIVE_ORDER_STATUSES.includes(status);
};

/**
 * Vérifier si une transition de statut est autorisée
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

/**
 * Obtenir les statuts suivants possibles
 */
const getNextStatuses = (currentStatus) => {
  return ORDER_STATUS_TRANSITIONS[currentStatus] || [];
};

/**
 * Vérifier si un rôle est de niveau management
 */
const isManagementRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return MANAGEMENT_ROLES.includes(normalizedRole);
};

/**
 * Vérifier si un rôle est de niveau staff
 */
const isStaffRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return STAFF_ROLES.includes(normalizedRole);
};

module.exports = {
  // Rôles
  USER_ROLES,
  USER_ROLES_LIST,
  MANAGEMENT_ROLES,
  STAFF_ROLES,
  
  // Statuts commandes
  ORDER_STATUS,
  ORDER_STATUS_LIST,
  ACTIVE_ORDER_STATUSES,
  FINAL_ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  
  // Statuts réservations
  RESERVATION_STATUS,
  RESERVATION_STATUS_LIST,
  ACTIVE_RESERVATION_STATUSES,
  
  // Tables
  TABLE_STATUS,
  TABLE_STATUS_LIST,
  TABLE_SHAPES,
  TABLE_SHAPES_LIST,
  
  // Autres constantes
  PRIORITY_LEVELS,
  PRIORITY_LIST,
  PAYMENT_METHODS,
  PAYMENT_METHODS_LIST,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LIST,
  SERVICE_TYPES,
  SERVICE_TYPES_LIST,
  MENU_CATEGORIES,
  MENU_CATEGORIES_LIST,
  OBSTACLE_TYPES,
  OBSTACLE_TYPES_LIST,
  
  // Permissions
  PERMISSIONS,
  PERMISSIONS_LIST,
  ROLE_PERMISSIONS,
  
  // Notifications
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPES_LIST,
  
  // Système
  DATA_SOURCES,
  DATA_SOURCES_LIST,
  LANGUAGES,
  LANGUAGES_LIST,
  CURRENCIES,
  CURRENCIES_LIST,
  
  // Fonctions utilitaires
  isValidRole,
  normalizeRole,
  getPermissionsForRole,
  roleHasPermission,
  isActiveOrderStatus,
  isValidStatusTransition,
  getNextStatuses,
  isManagementRole,
  isStaffRole
};