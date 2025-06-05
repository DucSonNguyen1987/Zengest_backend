/**
 * CONTRÔLEUR RESTAURANT - VERSION CORRIGÉE COMPLÈTE
 * Gestion sécurisée avec protection contre les erreurs null/undefined
 */

const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// === UTILITAIRE PAGINATION INTERNE ===
const createSafePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = Math.min(parseInt(limit) || 10, 100);
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    total: totalItems,
    limit: itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    skip: (currentPage - 1) * itemsPerPage
  };
};

// === RÉCUPÉRER TOUS LES RESTAURANTS ===
exports.getAllRestaurants = async (req, res) => {
  console.log('🔴 DÉBUT getAllRestaurants');
  
  try {
    console.log('🔴 Dans le try block');
    
    // SÉCURITÉ: Vérifier que req et req.user existent
    if (!req || !req.user) {
      console.error('🔴 req ou req.user manquant');
      return res.status(500).json({
        success: false,
        message: 'Erreur de requête'
      });
    }

    console.log('🔴 req.user existe:', !!req.user);
    console.log('🔴 req.query avant vérification:', req.query);
    
    // CORRECTION CRITIQUE: Sécuriser req.query
    if (!req.query || typeof req.query !== 'object') {
      console.log('🔴 req.query corrigé');
      req.query = {};
    }
    
    console.log('🔴 req.query après sécurisation:', req.query);
    console.log('getAllRestaurants appelé par:', req.user?.email, 'rôle:', req.user?.role);
    
    // SÉCURITÉ: Destructuration sécurisée avec fallback
    const queryObj = req.query || {};
    const page = queryObj.page || 1;
    const limit = queryObj.limit || 10;
    const search = queryObj.search || null;
    const isActive = queryObj.isActive || null;
    
    console.log('🔴 Paramètres extraits:', { page, limit, search, isActive });
    
    // Vérification permissions - Admin ET Owner peuvent accéder
    if (!req.user.role || !['admin', 'owner'].includes(req.user.role)) {
      console.log('🔴 Accès refusé pour rôle:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé - Admin ou Owner requis'
      });
    }
    
    console.log('🔴 Permissions OK');
    
    // Construire le filtre de recherche
    const filter = {};
    
    // Filtre actif/inactif
    if (isActive !== null && isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }
    
    // Filtre de recherche textuelle
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { 'address.city': { $regex: search.trim(), $options: 'i' } },
        { 'address.street': { $regex: search.trim(), $options: 'i' } }
      ];
    }
    
    console.log('🔴 Filtre construit:', filter);
    
    // Pagination sécurisée
    const pagination = createSafePagination(page, limit, 0);
    console.log('🔴 Pagination calculée:', pagination);
    
    // SÉCURITÉ: Vérifier que Restaurant existe
    if (!Restaurant || typeof Restaurant.find !== 'function') {
      console.error('🔴 Modèle Restaurant invalide');
      return res.status(500).json({
        success: false,
        message: 'Erreur de modèle de données'
      });
    }
    
    console.log('🔴 Exécution requête MongoDB...');
    
    // Requête avec gestion d'erreur
    const restaurants = await Restaurant.find(filter)
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip)
      .lean(); // Optimisation performance
    
    console.log('🔴 Restaurants récupérés:', restaurants ? restaurants.length : 0);
    
    // Compter le total
    const total = await Restaurant.countDocuments(filter);
    console.log('🔴 Total en base:', total);
    
    // Pagination finale
    const finalPagination = createSafePagination(page, limit, total);
    
    console.log('Restaurants récupérés avec succès:', { 
      count: restaurants ? restaurants.length : 0, 
      total,
      filter: Object.keys(filter).length > 0 ? filter : 'aucun'
    });
    
    // Réponse sécurisée
    res.json({
      success: true,
      data: {
        restaurants: restaurants || [],
        pagination: finalPagination,
        filter: filter
      }
    });
    
  } catch (error) {
    console.error('🔴 ERREUR getAllRestaurants:', error);
    console.error('🔴 Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des restaurants',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : 'Erreur serveur'
    });
  }
};

// === RÉCUPÉRER UN RESTAURANT PAR ID ===
exports.getRestaurant = async (req, res) => {
  try {
    const { id } = req.params || {};
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du restaurant requis'
      });
    }
    
    console.log('getRestaurant appelé pour ID:', id, 'par:', req.user?.email);
    
    // Vérifier que l'ID est valide
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'ID invalide'
      });
    }
    
    const restaurant = await Restaurant.findById(id)
      .populate('owner', 'firstName lastName email')
      .lean();

    if (!restaurant) {
      console.log('Restaurant non trouvé pour ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }

    // Vérification permissions
    if (!['admin', 'owner'].includes(req.user.role) && 
        req.user.restaurantId?.toString() !== id) {
      console.log('Accès refusé pour utilisateur:', req.user.email, 'rôle:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce restaurant'
      });
    }

    console.log('Restaurant trouvé:', restaurant.name);
    
    res.json({
      success: true,
      data: { restaurant }
    });
    
  } catch (error) {
    console.error('Erreur getRestaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
};

// === RÉCUPÉRER LE STATUT D'UN RESTAURANT ===
exports.getRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params || {};
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du restaurant requis'
      });
    }
    
    console.log('getRestaurantStatus appelé pour ID:', id);
    
    const restaurant = await Restaurant.findById(id)
      .select('name isActive hours capacity features')
      .lean();

    if (!restaurant) {
      console.log('Restaurant non trouvé pour statut, ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }

    // Calculer le statut en temps réel
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let isOpenNow = false;
    let todayHours = null;
    
    if (restaurant.hours && restaurant.hours[currentDay]) {
      todayHours = restaurant.hours[currentDay];
      
      if (!todayHours.closed && todayHours.open && todayHours.close) {
        const openTime = todayHours.open;
        const closeTime = todayHours.close;
        
        try {
          const [openHour, openMin] = openTime.split(':').map(Number);
          const [closeHour, closeMin] = closeTime.split(':').map(Number);
          
          const currentTimeMinutes = currentHour * 60 + currentMinute;
          const openTimeMinutes = openHour * 60 + openMin;
          const closeTimeMinutes = closeHour * 60 + closeMin;
          
          isOpenNow = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes;
        } catch (timeError) {
          console.warn('Erreur parsing horaires:', timeError.message);
        }
      }
    }

    const statusData = {
      id: restaurant._id,
      name: restaurant.name,
      isActive: restaurant.isActive,
      isOpenNow,
      capacity: restaurant.capacity || { seatingCapacity: 0, tablesCount: 0 },
      features: restaurant.features || {},
      currentDay,
      currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
      todayHours: todayHours || { closed: true }
    };

    console.log('Statut restaurant calculé:', {
      name: restaurant.name,
      isActive: restaurant.isActive,
      isOpenNow,
      currentDay
    });
    
    res.json({
      success: true,
      data: { restaurant: statusData }
    });
    
  } catch (error) {
    console.error('Erreur getRestaurantStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
};

// === CRÉER UN NOUVEAU RESTAURANT ===
exports.createRestaurant = async (req, res) => {
  try {
    console.log('createRestaurant appelé par:', req.user?.email);
    
    // Vérification permissions
    if (!['admin', 'owner'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé - Admin ou Owner requis'
      });
    }
    
    const {
      name,
      description,
      address,
      contact,
      cuisine = ['française'],
      priceRange = '€€',
      capacity,
      hours,
      features = {},
      owner
    } = req.body || {};
    
    // Validation des champs requis
    if (!name || !address || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Nom, adresse et contact sont requis'
      });
    }
    
    if (!address.street || !address.city || !address.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Adresse complète requise (rue, ville, code postal)'
      });
    }
    
    if (!contact.phone || !contact.email) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone et email requis'
      });
    }
    
    // Déterminer le propriétaire
    let ownerId = owner || req.user._id;
    
    // Vérifier que le propriétaire existe si spécifié
    if (owner && owner !== req.user._id.toString()) {
      const ownerUser = await User.findById(owner);
      if (!ownerUser) {
        return res.status(400).json({
          success: false,
          message: 'Propriétaire spécifié non trouvé'
        });
      }
    }
    
    const restaurantData = {
      name: name.trim(),
      description: description?.trim(),
      address: {
        street: address.street.trim(),
        city: address.city.trim(),
        zipCode: address.zipCode.trim(),
        country: address.country || 'France'
      },
      contact: {
        phone: contact.phone.trim(),
        email: contact.email.toLowerCase().trim(),
        website: contact.website
      },
      cuisine: Array.isArray(cuisine) ? cuisine : [cuisine],
      priceRange,
      capacity,
      hours,
      features,
      owner: ownerId,
      isActive: true
    };
    
    const newRestaurant = new Restaurant(restaurantData);
    const savedRestaurant = await newRestaurant.save();
    
    // Populer pour la réponse
    await savedRestaurant.populate('owner', 'firstName lastName email');
    
    console.log('Restaurant créé:', savedRestaurant.name, 'ID:', savedRestaurant._id);
    
    res.status(201).json({
      success: true,
      message: 'Restaurant créé avec succès',
      data: { restaurant: savedRestaurant }
    });
    
  } catch (error) {
    console.error('Erreur createRestaurant:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
};

// === METTRE À JOUR UN RESTAURANT ===
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params || {};
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du restaurant requis'
      });
    }
    
    console.log('updateRestaurant appelé pour ID:', id, 'par:', req.user?.email);
    
    const restaurant = await Restaurant.findById(id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérification permissions
    const isOwner = restaurant.owner?.toString() === req.user._id?.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    // Préparer les données de mise à jour
    const updateData = { ...req.body };
    
    // Nettoyer les champs système
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Seuls les admins peuvent changer le propriétaire
    if (updateData.owner && req.user.role !== 'admin') {
      delete updateData.owner;
    }
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).populate('owner', 'firstName lastName email');
    
    console.log('Restaurant mis à jour:', updatedRestaurant.name);
    
    res.json({
      success: true,
      message: 'Restaurant mis à jour avec succès',
      data: { restaurant: updatedRestaurant }
    });
    
  } catch (error) {
    console.error('Erreur updateRestaurant:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
};

// === SUPPRIMER UN RESTAURANT ===
exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params || {};
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du restaurant requis'
      });
    }
    
    console.log('deleteRestaurant appelé pour ID:', id, 'par:', req.user?.email);
    
    // Vérification permissions - Seuls les admins peuvent supprimer
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé - Admin requis'
      });
    }
    
    const restaurant = await Restaurant.findById(id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérifications de sécurité avant suppression
    // Ici vous pourriez ajouter des vérifications comme :
    // - Vérifier qu'il n'y a pas de commandes en cours
    // - Vérifier qu'il n'y a pas de réservations futures
    
    await Restaurant.findByIdAndDelete(id);
    
    console.log('Restaurant supprimé:', restaurant.name);
    
    res.json({
      success: true,
      message: 'Restaurant supprimé avec succès',
      data: {
        deletedRestaurant: {
          id: restaurant._id,
          name: restaurant.name
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur deleteRestaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
};

module.exports = exports;