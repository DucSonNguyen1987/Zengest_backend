/**
 * CONTRÔLEUR USER
 */

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');

// Utilitaire pagination
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
    skip: (currentPage - 1) * itemsPerPage
  };
};

// Récupérer tous les utilisateurs
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
    
    // Admin peut voir tous, Owner/Manager limités à leur restaurant
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

// Récupérer un utilisateur par ID
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
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Créer un utilisateur
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
    
    // Valider le rôle (CORRECTION: rôles en minuscules)
    const validRoles = ['admin', 'owner', 'manager', 'staff_bar', 'staff_floor', 'staff_kitchen', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Rôle invalide. Rôles autorisés: ${validRoles.join(', ')}`
      });
    }
    
    // Déterminer le restaurantId
    let finalRestaurantId = restaurantId;
    if (!finalRestaurantId && req.user.role === 'owner') {
      finalRestaurantId = req.user.restaurantId;
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
      restaurantId: finalRestaurantId || null, // CORRECTION: optionnel
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
      message: 'Erreur lors de la création de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mettre à jour un utilisateur
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
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Supprimer un utilisateur
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
      message: 'Erreur lors de la suppression de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;