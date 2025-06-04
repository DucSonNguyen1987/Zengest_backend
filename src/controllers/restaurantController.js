/**
 * CONTRÔLEUR RESTAURANT - Généré automatiquement
 * Gestion complète des restaurants avec toutes les méthodes nécessaires
 */

const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { createPagination } = require('../utils/pagination');

// === MÉTHODES PRINCIPALES ===

/**
 * Récupérer tous les restaurants
 * GET /restaurants
 */
exports.getAllRestaurants = async (req, res) => {
  try {
    console.log('getAllRestaurants appelé par:', req.user?.email);
    
    const { page = 1, limit = 10, search, isActive } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Vérification permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé - Admin requis'
      });
    }
    
    const pagination = createPagination(page, limit, 0);
    
    const restaurants = await Restaurant.find(filter)
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip);
    
    const total = await Restaurant.countDocuments(filter);
    const finalPagination = createPagination(page, limit, total);
    
    console.log('Restaurants récupérés:', { count: restaurants.length, total });
    
    res.json({
      success: true,
      data: {
        restaurants,
        pagination: finalPagination
      }
    });
    
  } catch (error) {
    console.error('Erreur getAllRestaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des restaurants',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer un restaurant par ID
 * GET /restaurants/:id
 */
exports.getRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('getRestaurant appelé pour ID:', id, 'par:', req.user?.email);
    
    const restaurant = await Restaurant.findById(id)
      .populate('owner', 'firstName lastName email')
      .select('-__v');

    if (!restaurant) {
      console.log('Restaurant non trouvé pour ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }

    // Vérification permissions
    if (req.user.role !== 'admin' && 
        req.user.role !== 'owner' && 
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer le statut d'un restaurant
 * GET /restaurants/:id/status
 */
exports.getRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('getRestaurantStatus appelé pour ID:', id);
    
    const restaurant = await Restaurant.findById(id)
      .select('name isActive hours capacity features');

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
    if (restaurant.hours && restaurant.hours[currentDay] && !restaurant.hours[currentDay].closed) {
      const openTime = restaurant.hours[currentDay].open || '00:00';
      const closeTime = restaurant.hours[currentDay].close || '23:59';
      
      const [openHour, openMin] = openTime.split(':').map(Number);
      const [closeHour, closeMin] = closeTime.split(':').map(Number);
      
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const openTimeMinutes = openHour * 60 + openMin;
      const closeTimeMinutes = closeHour * 60 + closeMin;
      
      isOpenNow = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes;
    }

    console.log('Statut restaurant calculé:', { 
      name: restaurant.name,
      isActive: restaurant.isActive, 
      isOpenNow,
      currentDay,
      currentHour: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`
    });
    
    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          isActive: restaurant.isActive,
          isOpenNow,
          capacity: restaurant.capacity,
          features: restaurant.features,
          currentDay,
          currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
          todayHours: restaurant.hours?.[currentDay] || { closed: true }
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur getRestaurantStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Créer un nouveau restaurant
 * POST /restaurants
 */
exports.createRestaurant = async (req, res) => {
  try {
    console.log('createRestaurant appelé par:', req.user?.email);
    
    // Vérification permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé - Admin requis'
      });
    }
    
    const {
      name,
      description,
      address,
      contact,
      cuisine = [],
      priceRange = '€€',
      capacity,
      hours,
      features = {},
      owner
    } = req.body;
    
    // Validation
    if (!name || !address || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Nom, adresse et contact sont requis'
      });
    }
    
    // Vérifier que le propriétaire existe
    if (owner) {
      const ownerUser = await User.findById(owner);
      if (!ownerUser) {
        return res.status(400).json({
          success: false,
          message: 'Propriétaire spécifié non trouvé'
        });
      }
    }
    
    const newRestaurant = new Restaurant({
      name,
      description,
      address,
      contact,
      cuisine,
      priceRange,
      capacity,
      hours,
      features,
      owner: owner || req.user._id,
      isActive: true
    });
    
    const savedRestaurant = await newRestaurant.save();
    await savedRestaurant.populate('owner', 'firstName lastName email');
    
    console.log('Restaurant créé:', savedRestaurant.name, 'ID:', savedRestaurant._id);
    
    res.status(201).json({
      success: true,
      message: 'Restaurant créé avec succès',
      data: { restaurant: savedRestaurant }
    });
    
  } catch (error) {
    console.error('Erreur createRestaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour un restaurant
 * PUT /restaurants/:id
 */
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('updateRestaurant appelé pour ID:', id, 'par:', req.user?.email);
    
    const restaurant = await Restaurant.findById(id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérification permissions
    if (req.user.role !== 'admin' && 
        (req.user.role !== 'owner' || req.user.restaurantId?.toString() !== id)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const updateData = req.body;
    delete updateData._id;
    delete updateData.__v;
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');
    
    console.log('Restaurant mis à jour:', updatedRestaurant.name);
    
    res.json({
      success: true,
      message: 'Restaurant mis à jour avec succès',
      data: { restaurant: updatedRestaurant }
    });
    
  } catch (error) {
    console.error('Erreur updateRestaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Supprimer un restaurant
 * DELETE /restaurants/:id
 */
exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('deleteRestaurant appelé pour ID:', id, 'par:', req.user?.email);
    
    // Vérification permissions
    if (req.user.role !== 'admin') {
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
    
    await Restaurant.findByIdAndDelete(id);
    
    console.log('Restaurant supprimé:', restaurant.name);
    
    res.json({
      success: true,
      message: 'Restaurant supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur deleteRestaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;
