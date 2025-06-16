/**
 * CONTRÔLEUR RÉSERVATIONS
 * Gestion complète des réservations avec formats clients flexibles
 * ✅ INTÉGRATION BREVO COMPLÈTE
 */

const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const FloorPlan = require('../models/FloorPlan');
const { createPagination } = require('../utils/pagination');

// Import sécurisé des utilitaires
let USER_ROLES;
try {
  const constants = require('../utils/constants');
  USER_ROLES = constants.USER_ROLES;
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

// ✅ MODIFICATION : Import direct du service Brevo
const emailService = require('../services/emailService');

/**
 * Obtenir toutes les réservations avec filtres
 * GET /reservations
 */
exports.getAllReservations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      date,
      dateFrom,
      dateTo,
      customerName,
      customerEmail,
      sortBy = 'dateTime',
      sortOrder = 'asc'
    } = req.query;

    console.log('getAllReservations appelé par:', req.user?.email);

    // Validation et conversion des paramètres
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    // Construction du filtre
    const filter = { isActive: true };

    // Filtrer par restaurant selon le rôle
    if (req.user.role !== USER_ROLES.ADMIN) {
      filter.restaurantId = req.user.restaurantId;
    }

    // Filtres optionnels
    if (status) filter.status = status;
    
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

    // Filtres client flexibles
    if (customerName) {
      filter.$or = [
        { 'customer.firstName': new RegExp(customerName, 'i') },
        { 'customer.lastName': new RegExp(customerName, 'i') }
      ];
    }
    if (customerEmail) {
      filter['customer.email'] = new RegExp(customerEmail, 'i');
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Requête avec pagination
    const reservations = await Reservation.find(filter)
      .populate('restaurantId', 'name address.city')
      .populate('assignedTo', 'firstName lastName')
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Reservation.countDocuments(filter);
    const pagination = createPagination(pageNum, limitNum, total);

    // Enrichir avec les informations de table
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const resObj = reservation.toObject();
        
        // Ajouter informations de table si assignée
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableNumber) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.find(t => t.number === reservation.assignedTable.tableNumber);
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
        reservations: enrichedReservations,
        pagination,
        filters: { status, date, customerName }
      }
    });

  } catch (error) {
    console.error('Erreur getAllReservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtenir une réservation par ID
 * GET /reservations/:id
 */
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('getReservationById appelé pour ID:', id);

    const reservation = await Reservation.findById(id)
      .populate('restaurantId', 'name address contact')
      .populate('assignedTo', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN &&
        req.user.restaurantId?.toString() !== reservation.restaurantId._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette réservation'
      });
    }

    const reservationData = reservation.toObject();

    // Enrichir avec les informations de table
    if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableNumber) {
      try {
        const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
        if (floorPlan) {
          const table = floorPlan.tables.find(t => t.number === reservation.assignedTable.tableNumber);
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
    console.error('Erreur getReservationById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la réservation'
    });
  }
};

/**
 * Créer une nouvelle réservation
 * POST /reservations
 * ✅ AVEC ENVOI EMAIL AUTOMATIQUE BREVO
 */
exports.createReservation = async (req, res) => {
  try {
    console.log('createReservation appelé par:', req.user?.email);
    console.log('Données reçues:', req.body);

    const {
      customer,
      dateTime,
      partySize = 2,
      duration = 120,
      specialRequests = [],
      source = 'online',
      notes = ''
    } = req.body;

    // === VALIDATION ET NORMALISATION CLIENT FLEXIBLE ===
    if (!customer || typeof customer !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Informations client requises',
        field: 'customer'
      });
    }

    let normalizedCustomer = {};

    // Format 1: firstName/lastName
    if (customer.firstName && customer.lastName) {
      normalizedCustomer = {
        firstName: String(customer.firstName).trim(),
        lastName: String(customer.lastName).trim(),
        email: customer.email ? String(customer.email).trim() : '',
        phone: customer.phone ? String(customer.phone).trim() : '',
        notes: customer.notes ? String(customer.notes).trim() : ''
      };
    } 
    // Format 2: name simple (à splitter)
    else if (customer.name) {
      const fullName = String(customer.name).trim();
      const nameParts = fullName.split(' ').filter(part => part.trim());
      normalizedCustomer = {
        firstName: nameParts[0] || 'Client',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customer.email ? String(customer.email).trim() : '',
        phone: customer.phone ? String(customer.phone).trim() : '',
        notes: customer.notes ? String(customer.notes).trim() : ''
      };
      console.log('Nom client normalisé:', normalizedCustomer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Nom du client requis (customer.name ou customer.firstName/lastName)',
        field: 'customer.name'
      });
    }

    // Validation date
    if (!dateTime) {
      return res.status(400).json({
        success: false,
        message: 'Date et heure de réservation requises',
        field: 'dateTime'
      });
    }

    const reservationDate = new Date(dateTime);
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
        field: 'dateTime'
      });
    }

    if (reservationDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date de réservation ne peut pas être dans le passé',
        field: 'dateTime'
      });
    }

    // Validation partySize
    const validatedPartySize = parseInt(partySize);
    if (isNaN(validatedPartySize) || validatedPartySize < 1 || validatedPartySize > 20) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de convives invalide (entre 1 et 20)',
        field: 'partySize'
      });
    }

    // Déterminer le restaurant
    let finalRestaurantId = req.body.restaurantId || req.user.restaurantId;

    // Gestion spéciale pour admin
    if (!finalRestaurantId && req.user.role === USER_ROLES.ADMIN) {
      const firstRestaurant = await Restaurant.findOne();
      if (firstRestaurant) {
        finalRestaurantId = firstRestaurant._id;
        console.log('Admin: Restaurant auto-assigné:', firstRestaurant.name);
      }
    }

    if (!finalRestaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant requis pour créer une réservation'
      });
    }

    // Créer la réservation
    const newReservation = new Reservation({
      restaurantId: finalRestaurantId,
      customer: normalizedCustomer,
      dateTime: reservationDate,
      partySize: validatedPartySize,
      duration: parseInt(duration) || 120,
      status: 'pending',
      specialRequests: Array.isArray(specialRequests) ? specialRequests : [],
      source: source || 'online',
      assignedTo: req.user._id,
      notes: notes || '',
      timestamps: {
        requested: new Date()
      }
    });

    const savedReservation = await newReservation.save();
    
    // Populer les données pour la réponse
    await savedReservation.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'assignedTo', select: 'firstName lastName' }
    ]);

    // ✅ AJOUT : Envoi automatique de l'email de confirmation
    if (normalizedCustomer.email) {
      try {
        console.log('📧 Envoi email de confirmation...');
        
        // Appel asynchrone pour ne pas bloquer la réponse
        setImmediate(async () => {
          try {
            await emailService.sendReservationConfirmation(savedReservation, normalizedCustomer);
            console.log('✅ Email de confirmation envoyé à:', normalizedCustomer.email);
          } catch (emailError) {
            console.error('❌ Erreur envoi email confirmation:', emailError.message);
          }
        });
        
      } catch (error) {
        console.warn('⚠️ Erreur programmation email:', error.message);
      }
    }

    console.log('Réservation créée:', {
      id: savedReservation._id,
      customer: `${normalizedCustomer.firstName} ${normalizedCustomer.lastName}`,
      dateTime: reservationDate
    });

    // ✅ MODIFICATION : Message de réponse adapté
    res.status(201).json({
      success: true,
      message: normalizedCustomer.email 
        ? 'Réservation créée avec succès. Un email de confirmation vous sera envoyé.'
        : 'Réservation créée avec succès.',
      data: { reservation: savedReservation }
    });

  } catch (error) {
    console.error('Erreur createReservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation',
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

    // Vérifier si la réservation peut être modifiée
    if (['completed', 'no_show'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation ne peut plus être modifiée'
      });
    }

    // Appliquer les modifications autorisées
    const allowedFields = ['customer', 'dateTime', 'partySize', 'duration', 'specialRequests', 'notes'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'customer' && req.body[field]) {
          // Gérer la normalisation du client pour les mises à jour aussi
          if (req.body[field].name && !req.body[field].firstName) {
            const nameParts = req.body[field].name.split(' ').filter(p => p.trim());
            updateData.customer = {
              ...reservation.customer.toObject(),
              firstName: nameParts[0] || reservation.customer.firstName,
              lastName: nameParts.slice(1).join(' ') || reservation.customer.lastName,
              ...req.body[field]
            };
            delete updateData.customer.name; // Supprimer le champ name après normalisation
          } else {
            updateData.customer = { ...reservation.customer.toObject(), ...req.body[field] };
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Validation des nouvelles données
    if (updateData.dateTime) {
      const newDate = new Date(updateData.dateTime);
      if (isNaN(newDate.getTime()) || newDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Date de réservation invalide'
        });
      }
    }

    if (updateData.partySize) {
      const partySize = parseInt(updateData.partySize);
      if (isNaN(partySize) || partySize < 1 || partySize > 20) {
        return res.status(400).json({
          success: false,
          message: 'Nombre de convives invalide (entre 1 et 20)'
        });
      }
    }

    // Appliquer les modifications
    Object.keys(updateData).forEach(key => {
      reservation[key] = updateData[key];
    });

    reservation.lastModifiedBy = req.user._id;
    reservation.timestamps.updated = new Date();

    await reservation.save();

    await reservation.populate([
      { path: 'restaurantId', select: 'name' },
      { path: 'lastModifiedBy', select: 'firstName lastName' }
    ]);

    console.log('Réservation mise à jour:', reservation._id);

    res.json({
      success: true,
      message: 'Réservation mise à jour avec succès',
      data: { reservation: reservation.toObject() }
    });

  } catch (error) {
    console.error('Erreur updateReservation:', error);
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
    const { status, reason, notes } = req.body;

    console.log('updateReservationStatus appelé pour ID:', id, 'nouveau statut:', status);

    const reservation = await Reservation.findById(id)
      .populate('restaurantId', 'name');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== USER_ROLES.ADMIN &&
        req.user.restaurantId?.toString() !== reservation.restaurantId._id.toString()) {
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

    // Mettre à jour les timestamps
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

    if (notes) {
      reservation.notes = notes;
    }

    await reservation.save();

    // Gérer les actions spécifiques au changement de statut
    try {
      await handleStatusChange(reservation, oldStatus, status, reason);
    } catch (statusError) {
      console.error('Erreur traitement changement statut:', statusError);
      // Ne pas faire échouer la réponse pour autant
    }

    console.log('Statut réservation changé:', oldStatus, '->', status);

    res.json({
      success: true,
      message: `Statut changé vers "${status}" avec succès`,
      data: {
        reservation: {
          id: reservation._id,
          status: reservation.status,
          timestamps: reservation.timestamps
        }
      }
    });

  } catch (error) {
    console.error('Erreur updateReservationStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut'
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
    const { floorPlanId, tableNumber } = req.body;

    console.log('assignTable appelé pour réservation:', id, 'table:', tableNumber);

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

    // Vérifier le plan de salle
    const floorPlan = await FloorPlan.findById(floorPlanId);
    if (!floorPlan || floorPlan.restaurantId.toString() !== reservation.restaurantId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Plan de salle invalide ou non autorisé'
      });
    }

    // Vérifier que la table existe
    const table = floorPlan.tables.find(t => t.number === tableNumber);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: `Table ${tableNumber} non trouvée dans le plan`
      });
    }

    // Vérifier la capacité
    if (reservation.partySize > table.capacity) {
      return res.status(400).json({
        success: false,
        message: `La table ${tableNumber} ne peut accueillir que ${table.capacity} convives (${reservation.partySize} demandés)`
      });
    }

    // Assigner la table
    reservation.assignedTable = {
      floorPlanId,
      tableNumber,
      assignedAt: new Date(),
      assignedBy: req.user._id
    };

    reservation.lastModifiedBy = req.user._id;
    await reservation.save();

    console.log('Table assignée:', tableNumber, 'à réservation:', reservation._id);

    res.json({
      success: true,
      message: `Table ${tableNumber} assignée avec succès`,
      data: {
        reservation: {
          id: reservation._id,
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
    console.error('Erreur assignTable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation de la table'
    });
  }
};

/**
 * Obtenir les réservations par date
 * GET /reservations/date/:date
 */
exports.getReservationsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const { status } = req.query;

    console.log('getReservationsByDate appelé pour date:', date);

    // Déterminer le restaurant selon le rôle
    const restaurantId = req.user.role === USER_ROLES.ADMIN
      ? req.query.restaurantId || req.user.restaurantId
      : req.user.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant requis'
      });
    }

    // Créer la plage de dates
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
      .populate('assignedTo', 'firstName lastName')
      .sort({ dateTime: 1 });

    // Enrichir avec les informations de table
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const resObj = reservation.toObject();

        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableNumber) {
          try {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.find(t => t.number === reservation.assignedTable.tableNumber);
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

    console.log('Réservations par date récupérées:', { date, count: enrichedReservations.length });

    res.json({
      success: true,
      data: {
        date,
        reservations: enrichedReservations,
        count: enrichedReservations.length,
        summary: {
          byStatus: await getReservationsSummaryByStatus(filter)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getReservationsByDate:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations par date'
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
    reservation.status = 'cancelled';
    reservation.lastModifiedBy = req.user._id;
    reservation.timestamps.deleted = new Date();
    reservation.timestamps.cancelled = new Date();
    
    await reservation.save();

    console.log('Réservation supprimée (soft delete):', reservation._id);

    res.json({
      success: true,
      message: 'Réservation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur deleteReservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la réservation'
    });
  }
};

// === FONCTIONS UTILITAIRES ===

/**
 * Gère les actions selon le changement de statut
 * ✅ MODIFICATION : Intégration Brevo avec paramètres corrects
 */
const handleStatusChange = async (reservation, oldStatus, newStatus, reason) => {
  try {
    console.log('handleStatusChange:', oldStatus, '->', newStatus);

    switch (newStatus) {
      case 'confirmed':
        // ✅ MODIFICATION : Envoyer email de confirmation avec paramètres corrects
        try {
          const customerInfo = {
            email: reservation.customer.email,
            name: `${reservation.customer.firstName} ${reservation.customer.lastName}`.trim()
          };
          
          if (customerInfo.email) {
            const emailResult = await emailService.sendReservationConfirmation(reservation, customerInfo);
            console.log('Email confirmation:', emailResult.success ? 'envoyé' : 'échec');
          }
        } catch (emailError) {
          console.warn('Erreur email confirmation:', emailError.message);
        }
        break;

      case 'seated':
        // Mettre à jour le statut de la table
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableNumber) {
          try {
            await updateTableStatus(reservation.assignedTable.floorPlanId, reservation.assignedTable.tableNumber, 'occupied');
          } catch (tableError) {
            console.warn('Erreur mise à jour table (seated):', tableError.message);
          }
        }
        break;

      case 'completed':
        // Libérer la table
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableNumber) {
          try {
            await updateTableStatus(reservation.assignedTable.floorPlanId, reservation.assignedTable.tableNumber, 'cleaning');
          } catch (tableError) {
            console.warn('Erreur libération table (completed):', tableError.message);
          }
        }
        break;

      case 'cancelled':
      case 'no_show':
        // ✅ MODIFICATION : Envoyer email d'annulation avec paramètres corrects
        try {
          const customerInfo = {
            email: reservation.customer.email,
            name: `${reservation.customer.firstName} ${reservation.customer.lastName}`.trim()
          };
          
          if (customerInfo.email) {
            const emailResult = await emailService.sendReservationCancellation(reservation, customerInfo, reason);
            console.log('Email annulation:', emailResult.success ? 'envoyé' : 'échec');
          }
        } catch (emailError) {
          console.warn('Erreur email annulation:', emailError.message);
        }

        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableNumber) {
          try {
            await updateTableStatus(reservation.assignedTable.floorPlanId, reservation.assignedTable.tableNumber, 'available');
          } catch (tableError) {
            console.warn('Erreur libération table (cancelled):', tableError.message);
          }
        }
        break;
    }
  } catch (error) {
    console.error('Erreur handleStatusChange:', error);
  }
};

/**
 * Met à jour le statut d'une table
 */
const updateTableStatus = async (floorPlanId, tableNumber, status) => {
  try {
    const floorPlan = await FloorPlan.findById(floorPlanId);
    if (floorPlan) {
      const table = floorPlan.tables.find(t => t.number === tableNumber);
      if (table) {
        table.status = status;
        await floorPlan.save();
        console.log(`Table ${tableNumber} statut changé vers: ${status}`);
      }
    }
  } catch (error) {
    console.error('Erreur updateTableStatus:', error);
  }
};

/**
 * Obtient un résumé des réservations par statut
 */
const getReservationsSummaryByStatus = async (baseFilter) => {
  try {
    const pipeline = [
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];
    
    const results = await Reservation.aggregate(pipeline);
    
    const summary = {};
    results.forEach(result => {
      summary[result._id] = result.count;
    });
    
    return summary;
  } catch (error) {
    console.error('Erreur getReservationsSummaryByStatus:', error);
    return {};
  }
};

module.exports = {
  getAllReservations: exports.getAllReservations,
  getReservationById: exports.getReservationById,
  createReservation: exports.createReservation,
  updateReservation: exports.updateReservation,
  updateReservationStatus: exports.updateReservationStatus,
  assignTable: exports.assignTable,
  getReservationsByDate: exports.getReservationsByDate,
  deleteReservation: exports.deleteReservation
};