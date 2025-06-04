
/**
 * CRÉATION DES CONTRÔLEURS MANQUANTS ZENGEST
 * Génère les contrôleurs userController.js et restaurantController.js
 * Avec toutes les méthodes nécessaires pour les tests
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️ CRÉATION DES CONTRÔLEURS MANQUANTS');
console.log('='.repeat(50));
console.log('🎯 Objectif: Créer les contrôleurs critiques manquants\n');

let filesCreated = 0;

// === UTILITAIRES ===
const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Dossier créé: ${dirPath}`);
  }
};

const createFile = (filePath, content, description) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${description} créé`);
    console.log(`📍 Chemin: ${filePath}`);
    filesCreated++;
    return true;
  } catch (error) {
    console.error(`❌ Échec création ${description}:`, error.message);
    return false;
  }
};

// === CONTRÔLEUR RESTAURANT ===
const createRestaurantController = () => {
  console.log('\n🏢 1. Création restaurantController.js');
  
  const controllersDir = path.join(__dirname, 'src', 'controllers');
  ensureDirectory(controllersDir);
  
  const restaurantControllerPath = path.join(controllersDir, 'restaurantController.js');
  
  const restaurantControllerCode = `/**
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
      currentHour: \`\${currentHour}:\${currentMinute.toString().padStart(2, '0')}\`
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
          currentTime: \`\${currentHour}:\${currentMinute.toString().padStart(2, '0')}\`,
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
`;

  createFile(restaurantControllerPath, restaurantControllerCode, 'RestaurantController');
};

// === CONTRÔLEUR USER ===
const createUserController = () => {
  console.log('\n👥 2. Création userController.js');
  
  const controllersDir = path.join(__dirname, 'src', 'controllers');
  ensureDirectory(controllersDir);
  
  const userControllerPath = path.join(controllersDir, 'userController.js');
  
  const userControllerCode = `/**
 * CONTRÔLEUR USER - Généré automatiquement  
 * Gestion complète des utilisateurs avec pagination
 */

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');
const { createPagination } = require('../utils/pagination');

// === MÉTHODES PRINCIPALES ===

/**
 * Récupérer tous les utilisateurs
 * GET /users
 */
exports.getAllUsers = async (req, res) => {
  try {
    console.log('getAllUsers appelé par:', req.user?.email, 'rôle:', req.user?.role);
    
    const { page = 1, limit = 10, role, search, restaurantId } = req.query;
    
    // Vérification permissions
    if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    // Construire le filtre
    const filter = {};
    
    // Admin peut voir tous les utilisateurs
    // Owner/Manager ne voient que leur restaurant
    if (req.user.role === 'owner' || req.user.role === 'manager') {
      filter.restaurantId = req.user.restaurantId;
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (restaurantId && req.user.role === 'admin') {
      filter.restaurantId = restaurantId;
    }
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pagination = createPagination(page, limit, 0);
    
    // Requête avec pagination
    const users = await User.find(filter)
      .populate('restaurantId', 'name address.city')
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip);
    
    const total = await User.countDocuments(filter);
    const finalPagination = createPagination(page, limit, total);
    
    console.log('Users récupérés avec pagination:', { 
      count: users.length, 
      total, 
      page: finalPagination.currentPage,
      filter
    });
    
    res.json({
      success: true,
      data: {
        users,
        pagination: finalPagination
      }
    });
    
  } catch (error) {
    console.error('Erreur getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer un utilisateur par ID
 * GET /users/:id
 */
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('getUser appelé pour ID:', id, 'par:', req.user?.email);
    
    const user = await User.findById(id)
      .populate('restaurantId', 'name address.city')
      .select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérification permissions
    const canAccess = req.user.role === 'admin' ||
                     (req.user.role === 'owner' && user.restaurantId?._id?.toString() === req.user.restaurantId?.toString()) ||
                     (req.user.role === 'manager' && user.restaurantId?._id?.toString() === req.user.restaurantId?.toString()) ||
                     (req.user._id.toString() === id);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    console.log('User trouvé:', user.email);
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Erreur getUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Créer un utilisateur
 * POST /users
 */
exports.createUser = async (req, res) => {
  try {
    console.log('createUser appelé par:', req.user?.email);
    
    // Vérification permissions
    if (!['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      restaurantId
    } = req.body;
    
    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }
    
    // Vérifier que l'email n'existe pas
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }
    
    // Valider le rôle
    const validRoles = ['admin', 'owner', 'manager', 'staff_bar', 'staff_floor', 'staff_kitchen', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: \`Rôle invalide. Rôles autorisés: \${validRoles.join(', ')}\`
      });
    }
    
    // Déterminer le restaurantId
    let finalRestaurantId = restaurantId;
    if (!finalRestaurantId && req.user.role === 'owner') {
      finalRestaurantId = req.user.restaurantId;
    }
    
    // Valider le restaurant si fourni
    if (finalRestaurantId) {
      const restaurant = await Restaurant.findById(finalRestaurantId);
      if (!restaurant) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant spécifié non trouvé'
        });
      }
    }
    
    // Hasher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      phone,
      restaurantId: finalRestaurantId || null,
      isActive: true,
      timestamps: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    const savedUser = await newUser.save();
    await savedUser.populate('restaurantId', 'name address.city');
    
    // Retourner sans le mot de passe
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    
    console.log('User créé:', savedUser.email, 'rôle:', savedUser.role);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { user: userResponse }
    });
    
  } catch (error) {
    console.error('Erreur createUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour un utilisateur
 * PUT /users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('updateUser appelé pour ID:', id, 'par:', req.user?.email);
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérification permissions
    const canUpdate = req.user.role === 'admin' ||
                     (req.user.role === 'owner' && user.restaurantId?.toString() === req.user.restaurantId?.toString()) ||
                     (req.user._id.toString() === id);
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;
    delete updateData.password; // Le mot de passe se change via une route dédiée
    
    // Mise à jour timestamp
    updateData.timestamps = {
      ...user.timestamps,
      updatedAt: new Date()
    };
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name address.city').select('-password');
    
    console.log('User mis à jour:', updatedUser.email);
    
    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: { user: updatedUser }
    });
    
  } catch (error) {
    console.error('Erreur updateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Supprimer un utilisateur
 * DELETE /users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('deleteUser appelé pour ID:', id, 'par:', req.user?.email);
    
    // Vérification permissions - Seul admin peut supprimer
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé - Admin requis'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Empêcher la suppression de soi-même
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer votre propre compte'
      });
    }
    
    await User.findByIdAndDelete(id);
    
    console.log('User supprimé:', user.email);
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;
`;

  createFile(userControllerPath, userControllerCode, 'UserController');
};

// === CRÉATION UTILITAIRE PAGINATION ===
const createPaginationUtil = () => {
  console.log('\n📄 3. Vérification utilitaire pagination');
  
  const utilsDir = path.join(__dirname, 'src', 'utils');
  const paginationPath = path.join(utilsDir, 'pagination.js');
  
  if (!fs.existsSync(paginationPath)) {
    ensureDirectory(utilsDir);
    
    const paginationCode = `/**
 * Utilitaire de pagination Zengest
 * Généré automatiquement
 */

/**
 * Créer un objet de pagination standardisé
 * @param {number} page - Page actuelle  
 * @param {number} limit - Éléments par page
 * @param {number} total - Total d'éléments
 * @returns {Object} Objet pagination
 */
const createPagination = (page, limit, total) => {
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
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    skip: (currentPage - 1) * itemsPerPage
  };
};

/**
 * Middleware pour valider les paramètres de pagination
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: 'Le numéro de page doit être un entier positif'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'La limite doit être entre 1 et 100'
    });
  }
  
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum
  };
  
  next();
};

module.exports = {
  createPagination,
  validatePagination
};
`;

    createFile(paginationPath, paginationCode, 'Utilitaire pagination');
  } else {
    console.log('   ✅ Utilitaire pagination déjà présent');
  }
};

// === EXÉCUTION ===
const runCreation = () => {
  console.log('🚀 Création des fichiers manquants...\n');
  
  // Vérification prérequis
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    console.error('❌ Exécutez ce script depuis la racine du projet Zengest');
    process.exit(1);
  }
  
  // Créer les contrôleurs manquants
  createRestaurantController();
  createUserController();
  createPaginationUtil();
  
  // Rapport final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RAPPORT DE CRÉATION');
  console.log('='.repeat(50));
  console.log(`✅ Fichiers créés: ${filesCreated}`);
  
  console.log('\n📋 FICHIERS GÉNÉRÉS:');
  console.log('• src/controllers/restaurantController.js - Gestion restaurants complète');
  console.log('• src/controllers/userController.js - Gestion utilisateurs avec pagination');
  console.log('• src/utils/pagination.js - Utilitaire pagination (si manquant)');
  
  console.log('\n🎯 FONCTIONNALITÉS INCLUSES:');
  console.log('RestaurantController:');
  console.log('  • getAllRestaurants, getRestaurant, getRestaurantStatus');
  console.log('  • createRestaurant, updateRestaurant, deleteRestaurant');
  console.log('  • Permissions par rôle, calcul statut temps réel');
  
  console.log('UserController:');
  console.log('  • getAllUsers, getUser, createUser, updateUser, deleteUser');
  console.log('  • Pagination complète, validation rôles, permissions');
  console.log('  • Gestion restaurantId optionnelle');
  
  console.log('\n🚀 PROCHAINES ÉTAPES:');
  console.log('1. 🔄 Redémarrez le serveur: npm run dev');
  console.log('2. 🧪 Testez: node post-corrections.js');
  console.log('3. 📈 Vérifiez le nouveau taux (attendu: 90%+)');
  console.log('4. 🎉 Test complet: node test-complete-zengest.js');
  
  if (filesCreated >= 2) {
    console.log('\n🎉 SUCCÈS! Contrôleurs critiques créés');
    console.log('💡 Les erreurs 403 et "méthodes manquantes" devraient être résolues');
    console.log('🚀 Votre backend devrait maintenant atteindre 90%+ de réussite!');
  } else {
    console.log('\n⚠️ Création partielle. Vérifiez les erreurs ci-dessus');
  }
  
  console.log(`\n⏰ Création terminée à ${new Date().toLocaleTimeString()}`);
  console.log('🔧 Contrôleurs professionnels avec toutes les fonctionnalités!');
};

// Lancer la création
runCreation();