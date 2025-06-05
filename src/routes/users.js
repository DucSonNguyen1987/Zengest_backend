/**
 * CORRECTION: src/routes/users.js
 * Routes utilisateurs avec imports sécurisés
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { 
  requireManagement, 
  requireAdmin, 
  requireOwnerOrAdmin,
  requireUserAccess 
} = require('../middleware/roleCheck');

const router = express.Router();

// Import du contrôleur avec gestion d'erreur
let userController;
try {
  userController = require('../controllers/userController');
} catch (error) {
  console.error('❌ Erreur import userController:', error.message);
  console.log('💡 Créer le fichier userController.js avec les méthodes requises');
  
  // Contrôleur minimal de fallback
  userController = {
    getAllUsers: async (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Contrôleur utilisateurs non implémenté',
        code: 'CONTROLLER_NOT_IMPLEMENTED'
      });
    },
    getUser: async (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Méthode getUser non implémentée',
        code: 'METHOD_NOT_IMPLEMENTED'
      });
    },
    createUser: async (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Méthode createUser non implémentée',
        code: 'METHOD_NOT_IMPLEMENTED'
      });
    },
    updateUser: async (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Méthode updateUser non implémentée',
        code: 'METHOD_NOT_IMPLEMENTED'
      });
    },
    deleteUser: async (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Méthode deleteUser non implémentée',
        code: 'METHOD_NOT_IMPLEMENTED'
      });
    }
  };
}

// Vérifier que toutes les méthodes existent
const requiredMethods = ['getAllUsers', 'getUser', 'createUser', 'updateUser', 'deleteUser'];
const missingMethods = requiredMethods.filter(method => typeof userController[method] !== 'function');

if (missingMethods.length > 0) {
  console.warn(`⚠️ Méthodes manquantes dans userController: ${missingMethods.join(', ')}`);
  
  // Ajouter des méthodes de fallback
  missingMethods.forEach(method => {
    userController[method] = async (req, res) => {
      res.status(501).json({
        success: false,
        message: `Méthode ${method} non implémentée`,
        code: 'METHOD_NOT_IMPLEMENTED'
      });
    };
  });
}

// === MIDDLEWARE GLOBAL ===
router.use(auth); // Authentification requise

// === ROUTES PRINCIPALES ===

/**
 * GET /api/users
 * Liste des utilisateurs avec pagination
 */
router.get('/', requireManagement, userController.getAllUsers);

/**
 * GET /api/users/:id
 * Détails d'un utilisateur
 */
router.get('/:id', requireUserAccess, userController.getUser);

/**
 * POST /api/users
 * Créer un nouvel utilisateur
 */
router.post('/', requireOwnerOrAdmin, userController.createUser);

/**
 * PUT /api/users/:id
 * Mettre à jour un utilisateur
 */
router.put('/:id', requireUserAccess, userController.updateUser);

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur (admin uniquement)
 */
router.delete('/:id', requireAdmin, userController.deleteUser);

// === ROUTES SPÉCIALISÉES ===

/**
 * GET /api/users/me/profile
 * Profil de l'utilisateur connecté
 */
router.get('/me/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    
    const user = await User.findById(req.user._id)
      .populate('restaurantId', 'name address.city')
      .select('-password -security');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Erreur profil utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

/**
 * PUT /api/users/me/profile
 * Mettre à jour son propre profil
 */
router.put('/me/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    const { firstName, lastName, phone, preferences } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };
    
    updateData.timestamps = {
      ...req.user.timestamps,
      updatedAt: new Date()
    };
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name').select('-password');
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user: updatedUser }
    });
    
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

/**
 * PUT /api/users/me/password
 * Changer son mot de passe
 */
router.put('/me/password', async (req, res) => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau requis'
      });
    }
    
    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(req.user._id).select('+password');
    
    // Vérifier le mot de passe actuel
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Hasher le nouveau mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Mettre à jour
    user.password = hashedPassword;
    user.security.lastPasswordChange = new Date();
    user.timestamps.updatedAt = new Date();
    await user.save();
    
    console.log(`Mot de passe changé pour ${user.email}`);
    
    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });
    
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

/**
 * GET /api/users/roles/available
 * Liste des rôles disponibles
 */
router.get('/roles/available', requireManagement, async (req, res) => {
  try {
    const { USER_ROLES, USER_ROLES_LIST } = require('../utils/constants');
    
    // Filtrer selon le rôle de l'utilisateur
    let availableRoles = [];
    
    if (req.user.role === 'admin') {
      availableRoles = USER_ROLES_LIST;
    } else if (req.user.role === 'owner') {
      // Owner peut créer tous sauf admin
      availableRoles = USER_ROLES_LIST.filter(role => role !== 'admin');
    } else if (req.user.role === 'manager') {
      // Manager peut créer uniquement staff
      availableRoles = [
        USER_ROLES.STAFF_FLOOR,
        USER_ROLES.STAFF_BAR,
        USER_ROLES.STAFF_KITCHEN,
        USER_ROLES.GUEST
      ];
    }
    
    const rolesWithLabels = availableRoles.map(role => ({
      value: role,
      label: {
        admin: 'Administrateur',
        owner: 'Propriétaire',
        manager: 'Manager',
        staff_floor: 'Personnel de salle',
        staff_bar: 'Personnel de bar',
        staff_kitchen: 'Personnel de cuisine',
        guest: 'Invité'
      }[role] || role
    }));
    
    res.json({
      success: true,
      data: {
        roles: rolesWithLabels,
        userRole: req.user.role
      }
    });
    
  } catch (error) {
    console.error('Erreur récupération rôles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des rôles'
    });
  }
});

/**
 * GET /api/users/search
 * Recherche d'utilisateurs
 */
router.get('/search', requireManagement, async (req, res) => {
  try {
    const User = require('../models/User');
    const { q, role, restaurant } = req.query;
    
    const filter = {};
    
    // Filtrer par restaurant selon les permissions
    if (req.user.role !== 'admin') {
      filter.restaurantId = req.user.restaurantId;
    } else if (restaurant) {
      filter.restaurantId = restaurant;
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .populate('restaurantId', 'name')
      .select('-password -security')
      .sort({ firstName: 1, lastName: 1 })
      .limit(20);
    
    res.json({
      success: true,
      data: {
        users,
        query: { q, role, restaurant },
        count: users.length
      }
    });
    
  } catch (error) {
    console.error('Erreur recherche utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
});

/**
 * POST /api/users/:id/activate
 * Activer/désactiver un utilisateur
 */
router.post('/:id/activate', requireOwnerOrAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const { id } = req.params;
    const { isActive } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifications de sécurité
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier son propre statut'
      });
    }
    
    if (req.user.role !== 'admin' && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier un administrateur'
      });
    }
    
    user.isActive = isActive;
    user.timestamps.updatedAt = new Date();
    await user.save();
    
    console.log(`Utilisateur ${user.email} ${isActive ? 'activé' : 'désactivé'} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
      data: { user }
    });
    
  } catch (error) {
    console.error('Erreur activation utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut'
    });
  }
});

// === GESTION D'ERREUR ===
router.use((error, req, res, next) => {
  console.error('Erreur route users:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      details: Object.values(error.errors).map(e => e.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID utilisateur invalide'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne'
  });
});

module.exports = router;