const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const FloorPlan = require('../models/FloorPlan');
const { createPagination } = require('../utils/pagination');

// Import conditionnel des utilitaires et config
let USER_ROLES, sendReservationConfirmation, sendReservationCancellation;
try {
  const constants = require('../utils/constants');
  USER_ROLES = constants.USER_ROLES || {
    ADMIN: 'admin',
    OWNER: 'owner', 
    MANAGER: 'manager',
    STAFF_FLOOR: 'staff_floor',
    STAFF_BAR: 'staff_bar',
    STAFF_KITCHEN: 'staff_kitchen'
  };
} catch {
  USER_ROLES = {
    ADMIN: 'admin',
    OWNER: 'owner',
    MANAGER: 'manager', 
    STAFF_FLOOR: 'staff_floor',
    STAFF_BAR: 'staff_bar',
    STAFF_KITCHEN: 'staff_kitchen'
  };
}

try {
  const emailConfig = require('../config/email');
  sendReservationConfirmation = emailConfig.sendReservationConfirmation;
  sendReservationCancellation = emailConfig.sendReservationCancellation;
} catch {
  // Fonctions fallback si le module email n'existe pas
  sendReservationConfirmation = async () => ({ success: false, message: 'Email non configuré' });
  sendReservationCancellation = async () => ({ success: false, message: 'Email non configuré' });
}

/**
 * Obtenir toutes les réservations avec filtres
 * GET /reservations
 */
exports.getAllReservations = async (req, res) => {
  try {
    // === CORRECTION: Valeurs par défaut ===
    const {
      page = 1,
      limit = 10,
      status,
      date,
      dateFrom,
      dateTo,
      customerName,
      customerEmail,
      customerPhone,
      tableNumber,
      numberOfGuests,
      seatingArea,
      sortBy = 'dateTime',
      sortOrder = 'asc',
      restaurantId
    } = req.query;

    console.log('getAllReservations appelé par:', req.user?.email, 'params:', { page, limit, status });

    // Conversion des paramètres avec validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    // Construction du filtre
    const filter = { isActive: true };

    // Filtrer par restaurant selon le rôle
    if (req.user.role !== USER_ROLES.ADMIN) {
      filter.restaurantId = req.user.restaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    // Filtres spécifiques
    if (status) filter.status = status;
    if (numberOfGuests) filter.numberOfGuests = parseInt(numberOfGuests);
    if (seatingArea) filter['preferences.seatingArea'] = seatingArea;

    // Filtres de date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.dateTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (dateFrom || dateTo) {
      filter.dateTime = {};
      if (dateFrom) filter.dateTime.$gte = new Date(dateFrom);
      if (dateTo) filter.dateTime.$lte = new Date(dateTo);
    }

    // Filtres client avec recherche flexible
    if (customerName) {
      filter.$or = [
        { 'customer.firstName': new RegExp(customerName, 'i') },
        { 'customer.lastName': new RegExp(customerName, 'i') },
        { 'customer.name': new RegExp(customerName, 'i') }
      ];
    }
    if (customerEmail) {
      filter['customer.email'] = new RegExp(customerEmail, 'i');
    }
    if (customerPhone) {
      filter['customer.phone'] = new RegExp(customerPhone, 'i');
    }

    // === CORRECTION: Simplification requête ===
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reservations = await Reservation.find(filter)
      .populate('restaurantId', 'name')
      .populate('assignedTable.floorPlanId', 'name')
      .populate('createdBy', 'firstName lastName')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .sort(sortOptions);

    const total = await Reservation.countDocuments(filter);
    const pagination = createPagination(pageNum, limitNum, total);

    // Ajouter les informations de table pour chaque réservation
    const reservationsWithTableInfo = await Promise.all(
      reservations.map(async (reservation) => {
        // === CORRECTION: Gestion sécurisée toPublicJSON ===
        const resObj = reservation.toPublicJSON ? 
          reservation.toPublicJSON() : 
          reservation.toObject();

        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table) {
                resObj.tableInfo = {
                  number: table.number,
                  capacity: table.capacity,
                  status: table.status,
                  floorPlanName: floorPlan.name
                };
              }
            }
          } catch (tableError) {
            console.warn('Erreur récupération info table:', tableError.message);
          }
        }

        return resObj;
      })
    );

    console.log('Réservations récupérées:', { count: reservations.length, total });

    res.json({
      success: true,
      data: {
        reservations: reservationsWithTableInfo,
        pagination
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des réservations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtenir une réservation spécifique
 * GET /reservations/:id
 */
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('getReservationById appelé pour ID:', id);

    const reservation = await Reservation.findById(id)
      .populate('restaurantId', 'name address')
      .populate('assignedTable.floorPlanId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions d'accès
    if (req.user.role !== USER_ROLES.ADMIN &&
      req.user.restaurantId?.toString() !== reservation.restaurantId._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette réservation'
      });
    }

    // === CORRECTION: Gestion sécurisée toPublicJSON ===
    const reservationData = reservation.toPublicJSON ? 
      reservation.toPublicJSON() : 
      reservation.toObject();

    if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
      try {
        const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
        if (floorPlan) {
          const table = floorPlan.tables.id(reservation.assignedTable.tableId);
          if (table) {
            reservationData.tableInfo = {
              number: table.number,
              capacity: table.capacity,
              status: table.status,
              floorPlanName: floorPlan.name
            };
          }
        }
      } catch (tableError) {
        console.warn('Erreur récupération info table:', tableError.message);
      }
    }

    res.json({
      success: true,
      data: { reservation: reservationData }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Créer une nouvelle réservation
 * POST /reservations
 */
exports.createReservation = async (req, res) => {
  try {
    // === CORRECTION AUTO CUSTOMER & VALIDATION ===
    let { customer, dateTime, duration = 120, numberOfGuests, preferences, internalNotes } = req.body;
    
    console.log('createReservation appelé par:', req.user?.email, 'données:', { 
      hasCustomer: !!customer, 
      dateTime, 
      numberOfGuests 
    });

    let normalizedCustomer = customer;
    let finalNumberOfGuests = numberOfGuests;

    // Gestion alias partySize -> numberOfGuests
    if (!numberOfGuests && req.body.partySize) {
      finalNumberOfGuests = req.body.partySize;
    }

    // Validation et normalisation client flexible
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Informations client requises'
      });
    }

    if (customer.firstName && customer.lastName) {
      // Format firstName/lastName - OK tel quel
      normalizedCustomer = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes || ''
      };
    } else if (customer.name) {
      // Format name simple - séparer en firstName/lastName
      const nameParts = customer.name.trim().split(' ');
      normalizedCustomer = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes || ''
      };
      console.log('Nom client normalisé:', normalizedCustomer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Nom du client requis (name ou firstName/lastName)'
      });
    }

    // Validation autres champs
    if (!dateTime) {
      return res.status(400).json({
        success: false,
        message: 'Date et heure de réservation requises'
      });
    }

    const reservationDate = new Date(dateTime);
    if (isNaN(reservationDate.getTime()) || reservationDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Date de réservation invalide ou dans le passé'
      });
    }

    if (!finalNumberOfGuests || finalNumberOfGuests < 1 || finalNumberOfGuests > 20) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de convives invalide (1-20)'
      });
    }

    console.log('Réservation validée:', { 
      customer: normalizedCustomer.firstName + ' ' + normalizedCustomer.lastName, 
      numberOfGuests: finalNumberOfGuests, 
      date: reservationDate 
    });
    // === FIN CORRECTION AUTO ===

    // Assigner le restaurant
    const restaurantId = req.user.role === USER_ROLES.ADMIN
      ? req.body.restaurantId || req.user.restaurantId
      : req.user.restaurantId;

    // Vérifier que le restaurant existe
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }

    // Générer un numéro de réservation unique
    const reservationNumber = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Créer la réservation
    const reservationData = {
      reservationNumber,
      restaurantId,
      customer: normalizedCustomer,
      dateTime: reservationDate,
      duration: parseInt(duration) || 120,
      numberOfGuests: finalNumberOfGuests,
      preferences: preferences || {},
      internalNotes: internalNotes || '',
      status: 'pending',
      source: 'online',
      createdBy: req.user._id,
      isActive: true,
      timestamps: {
        requested: new Date()
      }
    };

    const reservation = await Reservation.create(reservationData);

    // Populer les références
    await reservation.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    // Confirmer automatiquement si l'utilisateur a les permissions
    if ([USER_ROLES.ADMIN, USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(req.user.role)) {
      reservation.status = 'confirmed';
      reservation.timestamps.confirmed = new Date();
      await reservation.save();

      // Envoyer l'email de confirmation
      try {
        const emailResult = await sendReservationConfirmation(reservation, restaurant);
        console.log('Email confirmation envoyé:', emailResult.success);
        
        // Ajouter log email si la méthode existe
        if (reservation.addEmailLog) {
          reservation.addEmailLog('confirmation', emailResult.success, emailResult.messageId);
          await reservation.save();
        }
      } catch (emailError) {
        console.error('Erreur envoi email confirmation:', emailError);
      }
    }

    const responseData = reservation.toPublicJSON ? 
      reservation.toPublicJSON() : 
      reservation.toObject();

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: { reservation: responseData }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);

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
      message: 'Erreur serveur lors de la création',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour une réservation
 * PUT /reservations/:id
 */
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('updateReservation appelé pour ID:', id);

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN &&
      req.user.restaurantId?.toString() !== reservation.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    // === CORRECTION: Gestion sécurisée canBeModified ===
    const canModify = reservation.canBeModified ? 
      reservation.canBeModified() : 
      !['completed', 'no_show'].includes(reservation.status);

    if (!canModify) {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation ne peut plus être modifiée'
      });
    }

    // Appliquer les modifications
    const allowedFields = ['customer', 'dateTime', 'duration', 'numberOfGuests', 'preferences', 'internalNotes'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'customer') {
          Object.assign(reservation.customer, req.body[field]);
        } else if (field === 'preferences') {
          Object.assign(reservation.preferences, req.body[field]);
        } else {
          reservation[field] = req.body[field];
        }
      }
    });

    reservation.lastModifiedBy = req.user._id;
    reservation.timestamps.updated = new Date();

    await reservation.save();

    await reservation.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'assignedTable.floorPlanId', select: 'name' },
      { path: 'lastModifiedBy', select: 'firstName lastName' }
    ]);

    const responseData = reservation.toPublicJSON ? 
      reservation.toPublicJSON() : 
      reservation.toObject();

    res.json({
      success: true,
      message: 'Réservation mise à jour avec succès',
      data: { reservation: responseData }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
};

/**
 * Changer le statut d'une réservation
 * PATCH /reservations/:id/status
 */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, internalNotes } = req.body;

    console.log('updateReservationStatus appelé pour ID:', id, 'nouveau statut:', status);

    // === CORRECTION: Récupérer la réservation ici ===
    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN &&
      req.user.restaurantId?.toString() !== reservation.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    // Valider le statut
    const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Statuts autorisés: ${validStatuses.join(', ')}`
      });
    }

    const oldStatus = reservation.status;
    reservation.status = status;
    reservation.lastModifiedBy = req.user._id;

    // Mettre à jour les timestamps selon le statut
    switch (status) {
      case 'confirmed':
        reservation.timestamps.confirmed = new Date();
        break;
      case 'seated':
        reservation.timestamps.seated = new Date();
        break;
      case 'completed':
        reservation.timestamps.completed = new Date();
        break;
      case 'cancelled':
      case 'no_show':
        reservation.timestamps.cancelled = new Date();
        break;
    }

    if (internalNotes) {
      reservation.internalNotes = internalNotes;
    }

    await reservation.save();

    // Gérer les actions spécifiques selon le statut
    await handleStatusChange(reservation, oldStatus, status, reason);

    res.json({
      success: true,
      message: `Statut de la réservation changé vers "${status}"`,
      data: {
        reservation: {
          id: reservation._id,
          reservationNumber: reservation.reservationNumber,
          status: reservation.status,
          timestamps: reservation.timestamps
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Assigner une table à une réservation
 * PATCH /reservations/:id/assign-table
 */
exports.assignTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { floorPlanId, tableId, tableNumber } = req.body;

    console.log('assignTable appelé pour réservation:', id, 'table:', tableNumber || tableId);

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN &&
      req.user.restaurantId?.toString() !== reservation.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    // Vérifier que le plan de salle appartient au restaurant
    const floorPlan = await FloorPlan.findById(floorPlanId);
    if (!floorPlan || floorPlan.restaurantId.toString() !== reservation.restaurantId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Plan de salle invalide'
      });
    }

    // Vérifier que la table existe
    const table = floorPlan.tables.id(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table non trouvée'
      });
    }

    // Vérifier la capacité de la table
    if (reservation.numberOfGuests > table.capacity) {
      return res.status(400).json({
        success: false,
        message: `La table ${table.number} ne peut accueillir que ${table.capacity} convives (${reservation.numberOfGuests} demandés)`
      });
    }

    // Vérifier les conflits avec d'autres réservations sur cette table
    const conflictingReservation = await Reservation.findOne({
      'assignedTable.floorPlanId': floorPlanId,
      'assignedTable.tableId': tableId,
      status: { $in: ['confirmed', 'seated'] },
      isActive: true,
      $or: [
        {
          dateTime: { $lte: reservation.dateTime },
          $expr: {
            $gte: [
              { $add: ['$dateTime', { $multiply: ['$duration', 60000] }] },
              reservation.dateTime
            ]
          }
        },
        {
          dateTime: {
            $gte: reservation.dateTime,
            $lt: new Date(reservation.dateTime.getTime() + (reservation.duration * 60000))
          }
        }
      ],
      _id: { $ne: reservation._id }
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: `Table ${table.number} déjà réservée à cette heure`,
        conflict: {
          reservationNumber: conflictingReservation.reservationNumber,
          customerName: conflictingReservation.customer.firstName + ' ' + conflictingReservation.customer.lastName,
          dateTime: conflictingReservation.dateTime
        }
      });
    }

    // Assigner la table
    reservation.assignedTable = {
      floorPlanId,
      tableId,
      tableNumber: table.number,
      assignedAt: new Date(),
      assignedBy: req.user._id
    };
    
    reservation.lastModifiedBy = req.user._id;
    await reservation.save();

    res.json({
      success: true,
      message: `Table ${table.number} assignée à la réservation`,
      data: {
        reservation: {
          id: reservation._id,
          reservationNumber: reservation.reservationNumber,
          assignedTable: reservation.assignedTable
        },
        tableInfo: {
          number: table.number,
          capacity: table.capacity,
          floorPlanName: floorPlan.name
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'assignation de table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Obtenir les réservations d'une date spécifique
 * GET /reservations/date/:date
 */
exports.getReservationsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const { status } = req.query;

    console.log('getReservationsByDate appelé pour date:', date);

    const restaurantId = req.user.role === USER_ROLES.ADMIN
      ? req.query.restaurantId || req.user.restaurantId
      : req.user.restaurantId;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      restaurantId,
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      isActive: true
    };

    if (status) {
      filter.status = status;
    }

    const reservations = await Reservation.find(filter)
      .populate('restaurantId', 'name')
      .populate('assignedTable.floorPlanId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ dateTime: 1 });

    // Ajouter les informations de table
    const reservationsWithTableInfo = await Promise.all(
      reservations.map(async (reservation) => {
        const resObj = reservation.toPublicJSON ? 
          reservation.toPublicJSON() : 
          reservation.toObject();

        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table) {
                resObj.tableInfo = {
                  number: table.number,
                  capacity: table.capacity,
                  status: table.status
                };
              }
            }
          } catch (tableError) {
            console.warn('Erreur récupération info table:', tableError.message);
          }
        }

        return resObj;
      })
    );

    res.json({
      success: true,
      data: {
        date,
        reservations: reservationsWithTableInfo,
        count: reservationsWithTableInfo.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des réservations par date:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Supprimer une réservation (soft delete)
 * DELETE /reservations/:id
 */
exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('deleteReservation appelé pour ID:', id);

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN &&
      req.user.restaurantId?.toString() !== reservation.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    // Vérifier si la réservation peut être supprimée
    if (['seated', 'completed'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une réservation déjà installée ou terminée'
      });
    }

    // Soft delete
    reservation.isActive = false;
    reservation.lastModifiedBy = req.user._id;
    reservation.timestamps.deleted = new Date();
    await reservation.save();

    console.log('Réservation supprimée:', reservation.reservationNumber);

    res.json({
      success: true,
      message: 'Réservation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Gère les actions spécifiques selon le changement de statut
 */
const handleStatusChange = async (reservation, oldStatus, newStatus, reason) => {
  try {
    console.log('handleStatusChange:', oldStatus, '->', newStatus);
    
    const restaurant = await Restaurant.findById(reservation.restaurantId);

    switch (newStatus) {
      case 'confirmed':
        // Envoyer email de confirmation
        try {
          const emailResult = await sendReservationConfirmation(reservation, restaurant);
          console.log('Email confirmation envoyé:', emailResult.success);
          
          if (reservation.addEmailLog) {
            reservation.addEmailLog('confirmation', emailResult.success, emailResult.messageId);
            await reservation.save();
          }
        } catch (emailError) {
          console.error('Erreur envoi email confirmation:', emailError);
        }
        break;

      case 'seated':
        // Mettre à jour le statut de la table si assignée
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table) {
                table.status = 'occupied';
                await floorPlan.save();
                console.log('Table marquée comme occupée:', table.number);
              }
            }
          } catch (tableError) {
            console.error('Erreur mise à jour statut table (seated):', tableError);
          }
        }
        break;

      case 'completed':
        // Libérer la table
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table) {
                table.status = 'cleaning';
                await floorPlan.save();
                console.log('Table marquée pour nettoyage:', table.number);
              }
            }
          } catch (tableError) {
            console.error('Erreur libération table (completed):', tableError);
          }
        }
        break;

      case 'cancelled':
      case 'no_show':
        // Envoyer email d'annulation
        try {
          const emailResult = await sendReservationCancellation(reservation, restaurant, reason);
          console.log('Email annulation envoyé:', emailResult.success);
          
          if (reservation.addEmailLog) {
            reservation.addEmailLog('cancellation', emailResult.success, emailResult.messageId);
            await reservation.save();
          }
        } catch (emailError) {
          console.error('Erreur envoi email annulation:', emailError);
        }

        // Libérer la table si assignée
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table && table.status === 'reserved') {
                table.status = 'available';
                await floorPlan.save();
                console.log('Table libérée:', table.number);
              }
            }
          } catch (tableError) {
            console.error('Erreur libération table (cancelled):', tableError);
          }
        }
        break;
    }
  } catch (error) {
    console.error('Erreur lors du traitement du changement de statut:', error);
  }
};

module.exports = exports;