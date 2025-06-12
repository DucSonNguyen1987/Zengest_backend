const DailySpecial = require('../models/DailySpecial');
const { validationResult } = require('express-validator');
const { sendResponse, sendErrorResponse } = require('../utils/responseHelper');
const { uploadImage } = require('../utils/imageUpload');
const logger = require('../utils/logger');

/**
 * Obtenir tous les plats du jour
 * GET /api/daily-specials
 */
exports.getAllDailySpecials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      date,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construction de la requête
    const query = { restaurant: req.user.restaurant };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      query.availableDate = { $gte: startOfDay, $lt: endOfDay };
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Calcul de la pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Exécution de la requête
    const [specials, total] = await Promise.all([
      DailySpecial.find(query)
        .populate('createdBy', 'firstName lastName role')
        .populate('approvedBy', 'firstName lastName')
        .populate('rejectedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      DailySpecial.countDocuments(query)
    ]);

    // Calcul des métadonnées de pagination
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    sendResponse(res, {
      specials,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? parseInt(page) + 1 : null,
        prevPage: hasPrevPage ? parseInt(page) - 1 : null
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des plats du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la récupération des plats du jour', 500);
  }
};

/**
 * Obtenir les plats du jour disponibles aujourd'hui
 * GET /api/daily-specials/today
 */
exports.getTodaySpecials = async (req, res) => {
  try {
    const specials = await DailySpecial.findAvailable(req.user.restaurant);
    
    sendResponse(res, { specials });
  } catch (error) {
    logger.error('Erreur lors de la récupération des plats du jour d\'aujourd\'hui:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la récupération des plats du jour', 500);
  }
};

/**
 * Obtenir les plats du jour de la semaine
 * GET /api/daily-specials/week
 */
exports.getWeekSpecials = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const specials = await DailySpecial.find({
      restaurant: req.user.restaurant,
      status: { $in: ['approved', 'active'] },
      availableDate: { $gte: startOfWeek, $lt: endOfWeek }
    })
    .populate('createdBy', 'firstName lastName')
    .sort({ availableDate: 1, createdAt: -1 });

    // Grouper par jour
    const specialsByDay = {};
    specials.forEach(special => {
      const day = special.availableDate.toISOString().split('T')[0];
      if (!specialsByDay[day]) {
        specialsByDay[day] = [];
      }
      specialsByDay[day].push(special);
    });

    sendResponse(res, { 
      specialsByDay,
      specials,
      period: {
        start: startOfWeek,
        end: endOfWeek
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des plats de la semaine:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la récupération des plats de la semaine', 500);
  }
};

/**
 * Obtenir un plat du jour par ID
 * GET /api/daily-specials/:id
 */
exports.getDailySpecialById = async (req, res) => {
  try {
    const { id } = req.params;

    const special = await DailySpecial.findById(id)
      .populate('createdBy', 'firstName lastName role')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .populate('restaurant', 'name');

    if (!special) {
      return sendErrorResponse(res, 'Plat du jour non trouvé', 404);
    }

    // Vérifier que l'utilisateur a accès à ce restaurant
    if (special.restaurant._id.toString() !== req.user.restaurant.toString()) {
      return sendErrorResponse(res, 'Accès non autorisé', 403);
    }

    // Incrémenter le compteur de vues
    await special.incrementViews();

    sendResponse(res, { special });
  } catch (error) {
    logger.error('Erreur lors de la récupération du plat du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la récupération du plat du jour', 500);
  }
};

/**
 * Créer un nouveau plat du jour
 * POST /api/daily-specials
 */
exports.createDailySpecial = async (req, res) => {
  try {
    // Vérification des erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 'Données de validation invalides', 400, errors.array());
    }

    const specialData = {
      ...req.body,
      restaurant: req.user.restaurant,
      createdBy: req.user._id
    };

    // Gestion de l'upload d'image si présente
    if (req.file) {
      try {
        const imageUrl = await uploadImage(req.file, 'daily-specials');
        specialData.image = imageUrl;
      } catch (uploadError) {
        logger.error('Erreur lors de l\'upload d\'image:', uploadError);
        return sendErrorResponse(res, 'Erreur lors de l\'upload de l\'image', 400);
      }
    }

    // Définir le statut par défaut selon le rôle
    if (req.user.role === 'admin' || req.user.role === 'owner') {
      specialData.status = 'approved';
      specialData.approvedBy = req.user._id;
      specialData.approvalDate = new Date();
    } else {
      specialData.status = 'pending';
    }

    const special = new DailySpecial(specialData);
    await special.save();

    // Peupler les données pour la réponse
    await special.populate('createdBy', 'firstName lastName role');
    await special.populate('approvedBy', 'firstName lastName');

    logger.info(`Plat du jour créé: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);

    sendResponse(res, { special }, 'Plat du jour créé avec succès', 201);
  } catch (error) {
    logger.error('Erreur lors de la création du plat du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la création du plat du jour', 500);
  }
};

/**
 * Mettre à jour un plat du jour
 * PUT /api/daily-specials/:id
 */
exports.updateDailySpecial = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérification des erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 'Données de validation invalides', 400, errors.array());
    }

    const special = await DailySpecial.findById(id);
    if (!special) {
      return sendErrorResponse(res, 'Plat du jour non trouvé', 404);
    }

    // Vérifier les permissions
    const canModify = req.user.role === 'admin' || 
                     req.user.role === 'owner' || 
                     (req.user.role === 'manager' && ['draft', 'pending', 'rejected'].includes(special.status)) ||
                     (special.createdBy.toString() === req.user._id.toString() && ['draft', 'pending', 'rejected'].includes(special.status));

    if (!canModify) {
      return sendErrorResponse(res, 'Permission insuffisante pour modifier ce plat', 403);
    }

    // Gestion de l'upload d'image si présente
    if (req.file) {
      try {
        const imageUrl = await uploadImage(req.file, 'daily-specials');
        req.body.image = imageUrl;
      } catch (uploadError) {
        logger.error('Erreur lors de l\'upload d\'image:', uploadError);
        return sendErrorResponse(res, 'Erreur lors de l\'upload de l\'image', 400);
      }
    }

    // Si le plat était rejeté et qu'on le modifie, remettre en pending
    if (special.status === 'rejected' && Object.keys(req.body).some(key => 
      !['internalNotes', 'tags'].includes(key))) {
      req.body.status = 'pending';
      req.body.rejectedBy = undefined;
      req.body.rejectionReason = undefined;
      req.body.rejectionDate = undefined;
    }

    // Mise à jour
    Object.assign(special, req.body);
    await special.save();

    await special.populate('createdBy', 'firstName lastName role');
    await special.populate('approvedBy', 'firstName lastName');
    await special.populate('rejectedBy', 'firstName lastName');

    logger.info(`Plat du jour modifié: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);

    sendResponse(res, { special }, 'Plat du jour mis à jour avec succès');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du plat du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la mise à jour du plat du jour', 500);
  }
};

/**
 * Supprimer un plat du jour
 * DELETE /api/daily-specials/:id
 */
exports.deleteDailySpecial = async (req, res) => {
  try {
    const { id } = req.params;

    const special = await DailySpecial.findById(id);
    if (!special) {
      return sendErrorResponse(res, 'Plat du jour non trouvé', 404);
    }

    // Vérifier les permissions
    const canDelete = req.user.role === 'admin' || 
                     req.user.role === 'owner' || 
                     (req.user.role === 'manager' && special.status !== 'active') ||
                     (special.createdBy.toString() === req.user._id.toString() && ['draft', 'pending', 'rejected'].includes(special.status));

    if (!canDelete) {
      return sendErrorResponse(res, 'Permission insuffisante pour supprimer ce plat', 403);
    }

    // Ne pas supprimer physiquement si le plat a des commandes
    if (special.orders > 0) {
      special.isActive = false;
      special.status = 'expired';
      await special.save();
      
      logger.info(`Plat du jour désactivé: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);
      sendResponse(res, null, 'Plat du jour désactivé (commandes existantes)');
    } else {
      await DailySpecial.findByIdAndDelete(id);
      
      logger.info(`Plat du jour supprimé: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);
      sendResponse(res, null, 'Plat du jour supprimé avec succès');
    }
  } catch (error) {
    logger.error('Erreur lors de la suppression du plat du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la suppression du plat du jour', 500);
  }
};

/**
 * Approuver un plat du jour
 * POST /api/daily-specials/:id/approve
 */
exports.approveDailySpecial = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier les permissions
    if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
      return sendErrorResponse(res, 'Permission insuffisante pour approuver', 403);
    }

    const special = await DailySpecial.findById(id);
    if (!special) {
      return sendErrorResponse(res, 'Plat du jour non trouvé', 404);
    }

    if (special.status !== 'pending') {
      return sendErrorResponse(res, 'Seuls les plats en attente peuvent être approuvés', 400);
    }

    await special.approve(req.user._id);
    await special.populate('createdBy', 'firstName lastName');
    await special.populate('approvedBy', 'firstName lastName');

    logger.info(`Plat du jour approuvé: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);

    sendResponse(res, { special }, 'Plat du jour approuvé avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'approbation du plat du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors de l\'approbation du plat du jour', 500);
  }
};

/**
 * Rejeter un plat du jour
 * POST /api/daily-specials/:id/reject
 */
exports.rejectDailySpecial = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Vérifier les permissions
    if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
      return sendErrorResponse(res, 'Permission insuffisante pour rejeter', 403);
    }

    if (!reason || reason.trim().length === 0) {
      return sendErrorResponse(res, 'Une raison de rejet est requise', 400);
    }

    const special = await DailySpecial.findById(id);
    if (!special) {
      return sendErrorResponse(res, 'Plat du jour non trouvé', 404);
    }

    if (special.status !== 'pending') {
      return sendErrorResponse(res, 'Seuls les plats en attente peuvent être rejetés', 400);
    }

    await special.reject(req.user._id, reason);
    await special.populate('createdBy', 'firstName lastName');
    await special.populate('rejectedBy', 'firstName lastName');

    logger.info(`Plat du jour rejeté: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);

    sendResponse(res, { special }, 'Plat du jour rejeté');
  } catch (error) {
    logger.error('Erreur lors du rejet du plat du jour:', error);
    sendErrorResponse(res, 'Erreur serveur lors du rejet du plat du jour', 500);
  }
};

/**
 * Activer/désactiver un plat du jour
 * PATCH /api/daily-specials/:id/toggle
 */
exports.toggleDailySpecial = async (req, res) => {
  try {
    const { id } = req.params;

    const special = await DailySpecial.findById(id);
    if (!special) {
      return sendErrorResponse(res, 'Plat du jour non trouvé', 404);
    }

    // Vérifier les permissions
    if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
      return sendErrorResponse(res, 'Permission insuffisante', 403);
    }

    if (special.isActive) {
      await special.deactivate();
    } else {
      if (special.status === 'approved') {
        await special.activate();
      } else {
        return sendErrorResponse(res, 'Le plat doit être approuvé pour être activé', 400);
      }
    }

    await special.populate('createdBy', 'firstName lastName');
    await special.populate('approvedBy', 'firstName lastName');

    const action = special.isActive ? 'activé' : 'désactivé';
    logger.info(`Plat du jour ${action}: ${special.name} par ${req.user.firstName} ${req.user.lastName}`);

    sendResponse(res, { special }, `Plat du jour ${action} avec succès`);
  } catch (error) {
    logger.error('Erreur lors de la modification du statut:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la modification du statut', 500);
  }
};

/**
 * Obtenir les statistiques des plats du jour
 * GET /api/daily-specials/statistics
 */
exports.getDailySpecialsStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [statistics] = await DailySpecial.getStatistics(
      req.user.restaurant, 
      startDate, 
      endDate
    );

    // Compter par statut
    const statusCounts = await DailySpecial.aggregate([
      { $match: { restaurant: req.user.restaurant } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Plats les plus populaires
    const topSpecials = await DailySpecial.find({ 
      restaurant: req.user.restaurant,
      orders: { $gt: 0 }
    })
    .sort({ orders: -1 })
    .limit(10)
    .select('name orders views price');

    const stats = {
      summary: statistics || {
        totalSpecials: 0,
        totalViews: 0,
        totalOrders: 0,
        avgPrice: 0
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topSpecials
    };

    sendResponse(res, stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la récupération des statistiques', 500);
  }
};

/**
 * Recherche de plats du jour
 * GET /api/daily-specials/search
 */
exports.searchDailySpecials = async (req, res) => {
  try {
    const { 
      q, 
      category, 
      isVegetarian, 
      isVegan, 
      isGlutenFree, 
      maxPrice,
      availableOnly = true,
      page = 1,
      limit = 10 
    } = req.query;

    const query = { restaurant: req.user.restaurant };

    // Recherche textuelle
    if (q) {
      query.$text = { $search: q };
    }

    // Filtres
    if (category) query.category = category;
    if (isVegetarian === 'true') query.isVegetarian = true;
    if (isVegan === 'true') query.isVegan = true;
    if (isGlutenFree === 'true') query.isGlutenFree = true;
    if (maxPrice) query.price = { $lte: parseFloat(maxPrice) };

    // Filtrer seulement les plats disponibles
    if (availableOnly === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      query.status = 'active';
      query.isActive = true;
      query.availableDate = { $lte: today };
      query.$or = [
        { expirationDate: null },
        { expirationDate: { $gte: today } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [specials, total] = await Promise.all([
      DailySpecial.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DailySpecial.countDocuments(query)
    ]);

    sendResponse(res, {
      specials,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la recherche:', error);
    sendErrorResponse(res, 'Erreur serveur lors de la recherche', 500);
  }
};