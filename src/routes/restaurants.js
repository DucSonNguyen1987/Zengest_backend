const express = require('express');
const Restaurant = require('../models/Restaurant');
const User = require ('../models/User.js');
const { auth } = require('../middleware/auth');
const {
  requireRole,
  requirePermission,
  requireSameRestaurant
} = require('../middleware/roleCheck');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// GET /api/restaurants - Obtenir tous les restaurants (admin seulement)
router.get('/', auth, requireRole(USER_ROLES.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10, city, cuisine, isActive } = req.query;
    
    const filter = {};
    
    // Filtres optionnels
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (cuisine) filter.cuisine = { $in: [cuisine] };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const restaurants = await Restaurant.find(filter)
      .populate('owner', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Restaurant.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        restaurants,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/restaurants/my - Obtenir le restaurant de l'utilisateur connecté
router.get('/my', auth, async (req, res) => {
  try {
    let restaurant;
    
    if (req.user.role === USER_ROLES.ADMIN) {
      return res.status(400).json({
        success: false,
        message: 'Les administrateurs n\'ont pas de restaurant assigné'
      });
    }
    
    if (req.user.restaurantId) {
      restaurant = await Restaurant.findById(req.user.restaurantId)
        .populate('owner', 'firstName lastName email');
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Aucun restaurant trouvé pour cet utilisateur'
      });
    }
    
    res.json({
      success: true,
      data: { restaurant: restaurant.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/restaurants/:id - Obtenir un restaurant spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('owner', 'firstName lastName email');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérifier les permissions d'accès
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== restaurant._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce restaurant'
      });
    }
    
    res.json({
      success: true,
      data: { restaurant: restaurant.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/restaurants - Créer un nouveau restaurant (admin et owner)
router.post('/', auth, requireRole([USER_ROLES.ADMIN, USER_ROLES.OWNER]), async (req, res) => {
  try {

    //  Si OWNER, l'assigner automatiquement comme propriétaire
    if (req.user.role === USER_ROLES.OWNER) {
      req.body.owner = req.user._id;
    }

    const restaurant = await Restaurant.create(req.body);

      // Si OWNER, mettre à jour son restaurantId
     if (req.user.role === USER_ROLES.OWNER) {
      await User.findByIdAndUpdate(req.user._id, { restaurantId: restaurant._id });
    }
    
    await restaurant.populate('owner', 'firstName lastName email');
    
    res.status(201).json({
      success: true,
      message: 'Restaurant créé avec succès',
      data: { restaurant: restaurant.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la création du restaurant:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création'
    });
  }
});

// PUT /api/restaurants/:id - Mettre à jour un restaurant
router.put('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérifier les permissions de modification
    const canModify = req.user.role === USER_ROLES.ADMIN || 
                     restaurant.owner.toString() === req.user._id.toString() ||
                     (req.user.restaurantId?.toString() === restaurant._id.toString() && 
                      [USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(req.user.role));
    
    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes pour modifier ce restaurant'
      });
    }
    
    // Filtrer les champs modifiables selon le rôle
    const allowedFields = ['name', 'description', 'address', 'contact', 'cuisine', 
                          'priceRange', 'capacity', 'hours', 'features', 'images', 'socialMedia'];
    
    if (req.user.role === USER_ROLES.ADMIN) {
      allowedFields.push('owner', 'isActive', 'subscriptionPlan', 'subscriptionExpiry');
    }
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Restaurant mis à jour avec succès',
      data: { restaurant: updatedRestaurant.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
});

// DELETE /api/restaurants/:id - Supprimer un restaurant (admin seulement)
router.delete('/:id', auth, requireRole([USER_ROLES.ADMIN, USER_ROLES.OWNER]), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }

    if(req.user.role === USER_ROLES_OWNER){
      if(restaurant.owner.toString() !== req.user._id.toString()){
        return res.status(403).json({
          success : false,
          message: 'Vous ne pouvez supprimer que votre propre restaurant'
        });
      }
    }
    
    // Soft delete - désactiver le restaurant
    restaurant.isActive = false;
    await restaurant.save();

    // Si OWNER supprime son restaurant, retirer l'assignation

     if (req.user.role === USER_ROLES.OWNER) {
      await User.findByIdAndUpdate(req.user._id, { $unset: { restaurantId: 1 } });
    }
    
    res.json({
      success: true,
      message: 'Restaurant désactivé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/restaurants/:id/status - Vérifier si le restaurant est ouvert
router.get('/:id/status', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    const isOpen = restaurant.isOpenNow();
    const todayHours = restaurant.getTodayHours();
    
    res.json({
      success: true,
      data: {
        isOpen,
        todayHours,
        restaurantName: restaurant.name
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;