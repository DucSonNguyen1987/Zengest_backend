const express = require('express');
const MenuItem = require('../models/Menu');
const { auth } = require('../middleware/auth');
const { requireManagement, requireSameRestaurant } = require('../middleware/roleCheck');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// GET /api/menu - Obtenir tous les items du menu (public ou filtré par restaurant)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      subcategory,
      isVegetarian,
      isVegan,
      isGlutenFree,
      isOrganic,
      minPrice,
      maxPrice,
      isAvailable = true,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
      restaurantId
    } = req.query;
    
    // Construction du filtre
    const filter = {};
    
    // Filtrer par restaurant si spécifié ou si utilisateur connecté
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    } else if (req.user && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }
    
    // Filtres de base
    if (isAvailable === 'true') {
      filter.isActive = true;
      filter['availability.isAvailable'] = true;
    }
    
    // Filtres par catégorie
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    
    // Filtres alimentaires
    if (isVegetarian === 'true') filter['dietary.isVegetarian'] = true;
    if (isVegan === 'true') filter['dietary.isVegan'] = true;
    if (isGlutenFree === 'true') filter['dietary.isGlutenFree'] = true;
    if (isOrganic === 'true') filter['dietary.isOrganic'] = true;
    
    // Filtres de prix
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }
    
    // Construction du tri
    const sortOptions = {};
    if (sortBy === 'price') {
      sortOptions.basePrice = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'name') {
      sortOptions.name = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.displayOrder = 1;
      sortOptions.name = 1;
    }
    
    // Exécution de la requête
    const menuItems = await MenuItem.find(filter)
      .populate('restaurantId', 'name address')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);
    
    const total = await MenuItem.countDocuments(filter);
    
    // Obtenir les catégories disponibles pour les filtres
    const availableCategories = await MenuItem.distinct('category', filter);
    const priceRange = await MenuItem.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: null, 
          minPrice: { $min: '$basePrice' }, 
          maxPrice: { $max: '$basePrice' } 
        } 
      }
    ]);
    
    res.json({
      success: true,
      data: {
        menuItems: menuItems.map(item => item.toPublicJSON()),
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          limit: parseInt(limit)
        },
        filters: {
          availableCategories,
          priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du menu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/menu/search - Recherche d'items
router.get('/search', async (req, res) => {
  try {
    const { 
      q: searchTerm, 
      category, 
      isVegetarian, 
      isVegan, 
      priceMin, 
      priceMax,
      restaurantId 
    } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }
    
    // Construction du filtre de base
    const baseFilter = {
      isActive: true,
      'availability.isAvailable': true
    };
    
    // Filtrer par restaurant
    if (restaurantId) {
      baseFilter.restaurantId = restaurantId;
    } else if (req.user && req.user.restaurantId) {
      baseFilter.restaurantId = req.user.restaurantId;
    }
    
    // Filtres supplémentaires
    const filters = {};
    if (category) filters.category = category;
    if (isVegetarian === 'true') filters['dietary.isVegetarian'] = true;
    if (isVegan === 'true') filters['dietary.isVegan'] = true;
    if (priceMin || priceMax) {
      filters.basePrice = {};
      if (priceMin) filters.basePrice.$gte = parseFloat(priceMin);
      if (priceMax) filters.basePrice.$lte = parseFloat(priceMax);
    }
    
    // Utiliser la méthode de recherche du modèle
    const menuItems = await MenuItem.searchItems(
      baseFilter.restaurantId, 
      searchTerm, 
      { ...filters, ...baseFilter }
    ).populate('restaurantId', 'name');
    
    res.json({
      success: true,
      data: {
        menuItems: menuItems.map(item => item.toPublicJSON()),
        searchTerm,
        resultsCount: menuItems.length
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche'
    });
  }
});

// GET /api/menu/categories - Obtenir toutes les catégories avec compteurs
router.get('/categories', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    const filter = { isActive: true };
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    } else if (req.user && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }
    
    const categories = await MenuItem.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' },
          avgPrice: { $avg: '$basePrice' },
          minPrice: { $min: '$basePrice' },
          maxPrice: { $max: '$basePrice' }
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: { categories }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/menu/:id - Obtenir un item spécifique
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate('restaurantId', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de menu non trouvé'
      });
    }
    
    // Vérifier les permissions d'accès si utilisateur connecté
    if (req.user && req.user.role !== USER_ROLES.ADMIN) {
      if (!req.user.restaurantId || 
          req.user.restaurantId.toString() !== menuItem.restaurantId._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cet item'
        });
      }
    }
    
    res.json({
      success: true,
      data: { menuItem: menuItem.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'item:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Routes protégées (nécessitent une authentification)
router.use(auth);

// POST /api/menu - Créer un nouvel item (management seulement)
router.post('/', requireManagement, async (req, res) => {
  try {
    // Assigner automatiquement le restaurant si pas admin
    if (req.user.role !== USER_ROLES.ADMIN) {
      req.body.restaurantId = req.user.restaurantId;
    }
    
    // Assigner le créateur
    req.body.createdBy = req.user._id;
    
    // Validation des variantes de prix
    if (!req.body.priceVariants || req.body.priceVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins une variante de prix est requise'
      });
    }
    
    const menuItem = await MenuItem.create(req.body);
    
    await menuItem.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Item de menu créé avec succès',
      data: { menuItem: menuItem.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'item:', error);
    
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

// PUT /api/menu/:id - Mettre à jour un item
router.put('/:id', requireManagement, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de menu non trouvé'
      });
    }
    
    // Vérifier les permissions de modification
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes pour modifier cet item'
      });
    }
    
    // Interdire la modification du restaurant et du créateur
    delete req.body.restaurantId;
    delete req.body.createdBy;
    
    // Mettre à jour le modificateur
    req.body.lastModifiedBy = req.user._id;
    
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'lastModifiedBy', select: 'firstName lastName' }
    ]);
    
    res.json({
      success: true,
      message: 'Item de menu mis à jour avec succès',
      data: { menuItem: updatedMenuItem.toPublicJSON() }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    
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
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
});

// PATCH /api/menu/:id/availability - Mettre à jour la disponibilité
router.patch('/:id/availability', requireManagement, async (req, res) => {
  try {
    const { isAvailable, isOutOfStock, currentStock } = req.body;
    
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de menu non trouvé'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    // Mettre à jour la disponibilité
    if (isAvailable !== undefined) {
      menuItem.availability.isAvailable = isAvailable;
    }
    
    if (isOutOfStock !== undefined) {
      menuItem.inventory.isOutOfStock = isOutOfStock;
    }
    
    if (currentStock !== undefined) {
      menuItem.inventory.currentStock = currentStock;
      menuItem.inventory.hasInventory = true;
    }
    
    menuItem.lastModifiedBy = req.user._id;
    await menuItem.save();
    
    res.json({
      success: true,
      message: 'Disponibilité mise à jour',
      data: {
        menuItem: {
          id: menuItem._id,
          name: menuItem.name,
          availability: menuItem.availability,
          inventory: menuItem.inventory
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la disponibilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PATCH /api/menu/:id/price - Mettre à jour les prix
router.patch('/:id/price', requireManagement, async (req, res) => {
  try {
    const { priceVariants } = req.body;
    
    if (!priceVariants || !Array.isArray(priceVariants) || priceVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins une variante de prix est requise'
      });
    }
    
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de menu non trouvé'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    menuItem.priceVariants = priceVariants;
    menuItem.lastModifiedBy = req.user._id;
    await menuItem.save();
    
    res.json({
      success: true,
      message: 'Prix mis à jour avec succès',
      data: {
        menuItem: {
          id: menuItem._id,
          name: menuItem.name,
          priceVariants: menuItem.priceVariants,
          basePrice: menuItem.basePrice
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des prix:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour des prix'
    });
  }
});

// DELETE /api/menu/:id - Supprimer un item (soft delete)
router.delete('/:id', requireManagement, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de menu non trouvé'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.restaurantId?.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
    
    // Soft delete - désactiver l'item
    menuItem.isActive = false;
    menuItem.lastModifiedBy = req.user._id;
    await menuItem.save();
    
    res.json({
      success: true,
      message: 'Item de menu désactivé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/menu/:id/related - Obtenir des items similaires
router.get('/:id/related', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de menu non trouvé'
      });
    }
    
    // Rechercher des items similaires (même catégorie, prix similaire)
    const relatedItems = await MenuItem.find({
      _id: { $ne: menuItem._id },
      restaurantId: menuItem.restaurantId,
      category: menuItem.category,
      isActive: true,
      'availability.isAvailable': true,
      basePrice: {
        $gte: menuItem.basePrice * 0.7,
        $lte: menuItem.basePrice * 1.3
      }
    })
    .limit(6)
    .sort({ displayOrder: 1 })
    .select('name description category basePrice priceVariants dietary tags');
    
    res.json({
      success: true,
      data: { relatedItems }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des items similaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;