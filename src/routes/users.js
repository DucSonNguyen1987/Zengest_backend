const express = require('express');
const { auth } = require('../middleware/auth');
const {
  requireManagement,
  requireSameRestaurant,
  canModifyUser
} = require('../middleware/roleCheck');
const { validateRegister } = require('../middleware/validation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// GET /api/users - Obtenir tous les utilisateurs (management seulement)
router.get('/', requireManagement, requireSameRestaurant, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    
    const filter = {};
    
    // Filtrer par restaurant si pas admin
    if (req.user.role !== 'admin') {
      filter.restaurantId = req.user.restaurantId;
    }
    
    // Filtres optionnels
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const users = await User.find(filter)
      .populate('restaurantId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .select('-password');
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/users/:id - Obtenir un utilisateur spécifique
router.get('/:id', canModifyUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('restaurantId', 'name address')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: { user: user.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/users - Créer un nouvel utilisateur (management seulement)
router.post('/', requireManagement, validateRegister, async (req, res) => {
  try {
    // Assigner automatiquement le restaurant si pas admin
    if (req.user.role !== 'admin' && !req.body.restaurantId) {
      req.body.restaurantId = req.user.restaurantId;
    }
    
    const user = await User.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { user: user.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création'
    });
  }
});

// PUT /api/users/:id - Mettre à jour un utilisateur
router.put('/:id', canModifyUser, async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'preferences', 'isActive'];
    
    // Seuls les managers+ peuvent modifier le rôle et le statut
    if (req.user.canManageUsers()) {
      allowedFields.push('role', 'isActive', 'restaurantId');
    }
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: { user: user.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur (soft delete)
router.delete('/:id', requireManagement, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Empêcher la suppression de son propre compte
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }
    
    // Soft delete - désactiver le compte
    user.isActive = false;
    await user.save();
    
    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;