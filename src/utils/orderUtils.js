const { ORDER_STATUS } = require('./constants');

/**
 * Calcule le prix total d'un item de commande
 * @param {Object} item - Item avec quantity et unitPrice
 * @returns {number} Prix total de l'item
 */
const calculateItemTotal = (item) => {
  return Number((item.quantity * item.unitPrice).toFixed(2));
};

/**
 * Calcule le sous-total d'une commande
 * @param {Array} items - Liste des items de la commande
 * @returns {number} Sous-total
 */
const calculateSubtotal = (items) => {
  return Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
};

/**
 * Calcule la TVA
 * @param {number} subtotal - Sous-total
 * @param {number} taxRate - Taux de TVA en pourcentage
 * @returns {number} Montant de TVA
 */
const calculateTax = (subtotal, taxRate = 20) => {
  return Number(((subtotal * taxRate) / 100).toFixed(2));
};

/**
 * Calcule le service
 * @param {number} subtotal - Sous-total
 * @param {number} serviceRate - Taux de service en pourcentage
 * @returns {number} Montant du service
 */
const calculateService = (subtotal, serviceRate = 0) => {
  return Number(((subtotal * serviceRate) / 100).toFixed(2));
};

/**
 * Calcule la réduction
 * @param {number} subtotal - Sous-total
 * @param {Object} discount - Objet discount avec type et value
 * @returns {number} Montant de la réduction
 */
const calculateDiscount = (subtotal, discount) => {
  if (!discount || discount.value === 0) return 0;
  
  if (discount.type === 'percentage') {
    return Number(((subtotal * discount.value) / 100).toFixed(2));
  } else {
    return Number(discount.value.toFixed(2));
  }
};

/**
 * Calcule le total final d'une commande
 * @param {Object} pricing - Objet avec subtotal, tax, service, discount
 * @returns {number} Total final
 */
const calculateFinalTotal = (pricing) => {
  const total = pricing.subtotal + 
                pricing.tax.amount + 
                pricing.service.amount - 
                pricing.discount.amount;
  
  return Number(Math.max(0, total).toFixed(2));
};

/**
 * Calcule tous les prix d'une commande
 * @param {Array} items - Items de la commande
 * @param {Object} settings - Paramètres de calcul (tax, service, discount)
 * @returns {Object} Objet pricing complet
 */
const calculateOrderPricing = (items, settings = {}) => {
  // Calculer le sous-total
  const subtotal = calculateSubtotal(items);
  
  // Calculer la TVA
  const taxRate = settings.tax?.rate || 20;
  const taxAmount = calculateTax(subtotal, taxRate);
  
  // Calculer le service
  const serviceRate = settings.service?.rate || 0;
  const serviceAmount = calculateService(subtotal, serviceRate);
  
  // Calculer la réduction
  const discount = settings.discount || { type: 'percentage', value: 0 };
  const discountAmount = calculateDiscount(subtotal, discount);
  
  const pricing = {
    subtotal,
    tax: {
      rate: taxRate,
      amount: taxAmount
    },
    service: {
      rate: serviceRate,
      amount: serviceAmount
    },
    discount: {
      ...discount,
      amount: discountAmount
    },
    total: 0 // Sera calculé ci-dessous
  };
  
  // Calculer le total final
  pricing.total = calculateFinalTotal(pricing);
  
  return pricing;
};

/**
 * Valide les transitions de statut d'une commande
 * @param {string} currentStatus - Statut actuel
 * @param {string} newStatus - Nouveau statut souhaité
 * @returns {boolean} True si la transition est valide
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED, ORDER_STATUS.PREPARING], // Retour possible
    [ORDER_STATUS.SERVED]: [ORDER_STATUS.PAID],
    [ORDER_STATUS.PAID]: [], // État final
    [ORDER_STATUS.CANCELLED]: [] // État final
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Obtient les transitions possibles depuis un statut
 * @param {string} currentStatus - Statut actuel
 * @returns {Array} Liste des statuts possibles
 */
const getValidTransitions = (currentStatus) => {
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED, ORDER_STATUS.PREPARING],
    [ORDER_STATUS.SERVED]: [ORDER_STATUS.PAID],
    [ORDER_STATUS.PAID]: [],
    [ORDER_STATUS.CANCELLED]: []
  };
  
  return validTransitions[currentStatus] || [];
};

/**
 * Formate un numéro de commande
 * @param {Date} date - Date de la commande
 * @param {number} sequence - Numéro de séquence du jour
 * @param {string} prefix - Préfixe optionnel
 * @returns {string} Numéro de commande formaté
 */
const formatOrderNumber = (date, sequence, prefix = '') => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const sequenceStr = sequence.toString().padStart(4, '0');
  return prefix ? `${prefix}-${dateStr}-${sequenceStr}` : `${dateStr}-${sequenceStr}`;
};

/**
 * Calcule le temps écoulé depuis la création d'une commande
 * @param {Date} createdAt - Date de création
 * @returns {Object} Objet avec minutes, heures, et texte formaté
 */
const calculateOrderDuration = (createdAt) => {
  const now = new Date();
  const diffMs = now - createdAt;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  let formattedDuration;
  if (hours > 0) {
    formattedDuration = `${hours}h ${minutes}min`;
  } else {
    formattedDuration = `${minutes}min`;
  }
  
  return {
    totalMinutes: diffMinutes,
    hours,
    minutes,
    formatted: formattedDuration
  };
};

/**
 * Calcule le temps restant estimé
 * @param {Date} createdAt - Date de création
 * @param {number} estimatedTime - Temps estimé en minutes
 * @returns {Object} Objet avec temps restant
 */
const calculateRemainingTime = (createdAt, estimatedTime) => {
  if (!estimatedTime) {
    return { totalMinutes: null, formatted: 'Non estimé' };
  }
  
  const elapsed = calculateOrderDuration(createdAt).totalMinutes;
  const remaining = Math.max(0, estimatedTime - elapsed);
  
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  
  let formatted;
  if (remaining === 0) {
    formatted = 'Dépassé';
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}min`;
  } else {
    formatted = `${minutes}min`;
  }
  
  return {
    totalMinutes: remaining,
    hours,
    minutes,
    formatted,
    isOverdue: remaining === 0 && elapsed > estimatedTime
  };
};

/**
 * Détermine la priorité suggérée basée sur l'heure et la charge
 * @param {Date} orderTime - Heure de la commande
 * @param {number} activeOrders - Nombre de commandes actives
 * @param {Object} customer - Infos client (pour VIP, etc.)
 * @returns {string} Priorité suggérée
 */
const suggestPriority = (orderTime, activeOrders = 0, customer = {}) => {
  const hour = orderTime.getHours();
  
  // Heures de pointe
  const isRushHour = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
  
  // Charge élevée
  const isHighLoad = activeOrders > 10;
  
  // Client VIP (si implémenté)
  const isVip = customer.isVip || false;
  
  if (isVip) return 'high';
  if (isHighLoad && isRushHour) return 'normal'; // Éviter trop de priorités hautes
  if (isRushHour) return 'normal';
  if (isHighLoad) return 'normal';
  
  return 'normal';
};

/**
 * Valide qu'une table peut accueillir le nombre de convives
 * @param {Object} table - Objet table avec capacity
 * @param {number} numberOfGuests - Nombre de convives
 * @param {number} tolerance - Tolérance (par défaut 0)
 * @returns {Object} Résultat de validation
 */
const validateTableCapacity = (table, numberOfGuests, tolerance = 0) => {
  const maxCapacity = table.capacity + tolerance;
  const isValid = numberOfGuests <= maxCapacity;
  
  return {
    isValid,
    tableCapacity: table.capacity,
    numberOfGuests,
    tolerance,
    maxAllowed: maxCapacity,
    message: isValid 
      ? 'Capacité suffisante'
      : `Table ${table.number} (${table.capacity} places) ne peut accueillir ${numberOfGuests} convives`
  };
};

/**
 * Groupe les items de commande par catégorie pour la cuisine
 * @param {Array} items - Items de la commande
 * @returns {Object} Items groupés par catégorie
 */
const groupItemsByCategory = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    const category = item.menuItemSnapshot.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });
  
  return grouped;
};

/**
 * Calcule les statistiques d'une commande
 * @param {Object} order - Commande complète
 * @returns {Object} Statistiques
 */
const calculateOrderStats = (order) => {
  const itemsCount = order.items.length;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const averageItemPrice = itemsCount > 0 ? order.pricing.subtotal / totalQuantity : 0;
  const pricePerGuest = order.customer.numberOfGuests > 0 
    ? order.pricing.total / order.customer.numberOfGuests 
    : order.pricing.total;
  
  const duration = calculateOrderDuration(order.timestamps.ordered);
  const categories = [...new Set(order.items.map(item => item.menuItemSnapshot.category))];
  
  return {
    itemsCount,
    totalQuantity,
    averageItemPrice: Number(averageItemPrice.toFixed(2)),
    pricePerGuest: Number(pricePerGuest.toFixed(2)),
    duration,
    categoriesCount: categories.length,
    categories,
    hasModifications: order.items.some(item => item.modifications && item.modifications.length > 0),
    hasNotes: !!(order.notes || order.items.some(item => item.notes))
  };
};

/**
 * Valide qu'un paiement fractionné est cohérent
 * @param {Array} splits - Tableau des paiements fractionnés
 * @param {number} totalAmount - Montant total à payer
 * @param {number} tolerance - Tolérance en centimes
 * @returns {Object} Résultat de validation
 */
const validateSplitPayment = (splits, totalAmount, tolerance = 0.01) => {
  if (!splits || splits.length === 0) {
    return { isValid: false, message: 'Aucun paiement fractionné fourni' };
  }
  
  const splitsTotal = splits.reduce((sum, split) => sum + split.amount, 0);
  const difference = Math.abs(splitsTotal - totalAmount);
  const isValid = difference <= tolerance;
  
  return {
    isValid,
    splitsTotal: Number(splitsTotal.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    difference: Number(difference.toFixed(2)),
    message: isValid 
      ? 'Paiement fractionné valide'
      : `Différence de ${difference.toFixed(2)}€ entre les paiements (${splitsTotal.toFixed(2)}€) et le total (${totalAmount.toFixed(2)}€)`
  };
};

module.exports = {
  calculateItemTotal,
  calculateSubtotal,
  calculateTax,
  calculateService,
  calculateDiscount,
  calculateFinalTotal,
  calculateOrderPricing,
  isValidStatusTransition,
  getValidTransitions,
  formatOrderNumber,
  calculateOrderDuration,
  calculateRemainingTime,
  suggestPriority,
  validateTableCapacity,
  groupItemsByCategory,
  calculateOrderStats,
  validateSplitPayment
};