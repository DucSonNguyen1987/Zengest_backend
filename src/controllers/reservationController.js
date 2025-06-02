const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const FloorPlan = require('../models/FloorPlan');
const { USER_ROLES } = require('../utils/constants');
const {
  sendReservationConfirmation,
  sendReservationCancellation
} = require('../config/email');

/**
 * Contrôleur pour la gestion des réservations
 */
class ReservationController {
  
  /**
   * Obtenir toutes les réservations avec filtres
   */
  static async getAllReservations(req, res) {
    try {
      const {
        page,
        limit,
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
        sortBy,
        sortOrder,
        restaurantId
      } = req.query;
      
      // Construction du filtre
      const filter = { isActive: true };
      
      // Filtrer par restaurant
      if (req.user.role !== USER_ROLES.ADMIN) {
        filter.restaurantId = req.user.restaurantId;
      } else if (restaurantId) {
        filter.restaurantId = restaurantId;
      }
      
      // Filtres spécifiques
      if (status) filter.status = status;
      if (numberOfGuests) filter.numberOfGuests = numberOfGuests;
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
      
      // Filtres client
      if (customerName) {
        filter['customer.name'] = new RegExp(customerName, 'i');
      }
      if (customerEmail) {
        filter['customer.email'] = new RegExp(customerEmail, 'i');
      }
      if (customerPhone) {
        filter['customer.phone'] = new RegExp(customerPhone, 'i');
      }
      
      // Filtre par numéro de table (nécessite une agrégation)
      let reservations;
      let total;
      
      if (tableNumber) {
        const aggregationPipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'floorplans',
              localField: 'assignedTable.floorPlanId',
              foreignField: '_id',
              as: 'floorPlan'
            }
          },
          { $unwind: { path: '$floorPlan', preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              tableInfo: {
                $filter: {
                  input: '$floorPlan.tables',
                  cond: { $eq: ['$$this._id', '$assignedTable.tableId'] }
                }
              }
            }
          },
          { $unwind: { path: '$tableInfo', preserveNullAndEmptyArrays: true } },
          { $match: { 'tableInfo.number': tableNumber } },
          { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ];
        
        reservations = await Reservation.aggregate(aggregationPipeline);
        
        // Compter le total pour la pagination
        const countPipeline = aggregationPipeline.slice(0, -2);
        countPipeline.push({ $count: 'total' });
        const countResult = await Reservation.aggregate(countPipeline);
        total = countResult[0]?.total || 0;
        
      } else {
        // Requête normale
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        reservations = await Reservation.find(filter)
          .populate('restaurantId', 'name')
          .populate('assignedTable.floorPlanId', 'name')
          .populate('createdBy', 'firstName lastName')
          .limit(limit)
          .skip((page - 1) * limit)
          .sort(sortOptions);
        
        total = await Reservation.countDocuments(filter);
      }
      
      // Ajouter les informations de table pour chaque réservation
      const reservationsWithTableInfo = await Promise.all(
        reservations.map(async (reservation) => {
          const resObj = reservation.toPublicJSON ? reservation.toPublicJSON() : reservation;
          
          if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
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
          }
          
          return resObj;
        })
      );
      
      res.json({
        success: true,
        data: {
          reservations: reservationsWithTableInfo,
          pagination: {
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
            limit
          }
        }
      });
      
    } catch (error) {
      console.error('Erreur lors de la récupération des réservations:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
  
  /**
   * Obtenir une réservation spécifique
   */
  static async getReservationById(req, res) {
    try {
      const reservation = await Reservation.findById(req.params.id)
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
      
      // Ajouter les informations de table
      const reservationData = reservation.toPublicJSON();
      
      if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
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
  }
  
  /**
   * Créer une nouvelle réservation
   */
  static async createReservation(req, res) {
    try {
      const {
        customer,
        dateTime,
        duration = 120,
        numberOfGuests,
        preferences,
        internalNotes
      } = req.body;
      
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
      
      // Créer la réservation
      const reservationData = {
        restaurantId,
        customer,
        dateTime: new Date(dateTime),
        duration,
        numberOfGuests,
        preferences: preferences || {},
        internalNotes,
        createdBy: req.user._id
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
          reservation.addEmailLog('confirmation', emailResult.success, emailResult.messageId);
          await reservation.save();
        } catch (emailError) {
          console.error('Erreur envoi email confirmation:', emailError);
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Réservation créée avec succès',
        data: { reservation: reservation.toPublicJSON() }
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
        message: 'Erreur serveur lors de la création'
      });
    }
  }
  
  /**
   * Mettre à jour une réservation
   */
  static async updateReservation(req, res) {
    try {
      const reservation = await Reservation.findById(req.params.id);
      
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
      if (!reservation.canBeModified()) {
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
      
      await reservation.save();
      
      await reservation.populate([
        { path: 'restaurantId', select: 'name' },
        { path: 'assignedTable.floorPlanId', select: 'name' },
        { path: 'lastModifiedBy', select: 'firstName lastName' }
      ]);
      
      res.json({
        success: true,
        message: 'Réservation mise à jour avec succès',
        data: { reservation: reservation.toPublicJSON() }
      });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour'
      });
    }
  }
  
  /**
   * Changer le statut d'une réservation
   */
  static async updateReservationStatus(req, res) {
    try {
      const { status, reason, internalNotes } = req.body;
      const reservation = req.currentReservation; // Fourni par le middleware de validation
      
      // Vérifier les permissions
      if (req.user.role !== USER_ROLES.ADMIN && 
          req.user.restaurantId?.toString() !== reservation.restaurantId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes'
        });
      }
      
      const oldStatus = reservation.status;
      reservation.status = status;
      reservation.lastModifiedBy = req.user._id;
      
      if (internalNotes) {
        reservation.internalNotes = internalNotes;
      }
      
      await reservation.save();
      
      // Gérer les actions spécifiques selon le statut
      await ReservationController.handleStatusChange(reservation, oldStatus, status, reason);
      
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
  }
  
  /**
   * Assigner une table à une réservation
   */
  static async assignTable(req, res) {
    try {
      const { floorPlanId, tableId } = req.body;
      const reservation = await Reservation.findById(req.params.id);
      
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
      
      // Vérifier que la table existe et est disponible
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
            customerName: conflictingReservation.customer.name,
            dateTime: conflictingReservation.dateTime
          }
        });
      }
      
      // Assigner la table
      reservation.assignTable(floorPlanId, tableId, table.number, req.user._id);
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
  }
  
  /**
   * Obtenir les réservations d'une date spécifique
   */
  static async getReservationsByDate(req, res) {
    try {
      const { date } = req.params;
      const { status } = req.query;
      
      const restaurantId = req.user.role === USER_ROLES.ADMIN 
        ? req.query.restaurantId || req.user.restaurantId
        : req.user.restaurantId;
      
      const reservations = await Reservation.findByDate(restaurantId, new Date(date), status);
      
      // Ajouter les informations de table
      const reservationsWithTableInfo = await Promise.all(
        reservations.map(async (reservation) => {
          const resObj = reservation.toPublicJSON();
          
          if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
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
  }
  
  /**
   * Gère les actions spécifiques selon le changement de statut
   */
  static async handleStatusChange(reservation, oldStatus, newStatus, reason) {
    try {
      const restaurant = await Restaurant.findById(reservation.restaurantId);
      
      switch (newStatus) {
        case 'confirmed':
          // Envoyer email de confirmation
          try {
            const emailResult = await sendReservationConfirmation(reservation, restaurant);
            reservation.addEmailLog('confirmation', emailResult.success, emailResult.messageId);
            await reservation.save();
          } catch (emailError) {
            console.error('Erreur envoi email confirmation:', emailError);
          }
          break;
          
        case 'seated':
          // Mettre à jour le statut de la table si assignée
          if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table) {
                table.status = 'occupied';
                await floorPlan.save();
              }
            }
          }
          break;
          
        case 'completed':
          // Libérer la table
          if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table) {
                table.status = 'cleaning';
                await floorPlan.save();
              }
            }
          }
          break;
          
        case 'cancelled':
        case 'no_show':
          // Envoyer email d'annulation
          try {
            const emailResult = await sendReservationCancellation(reservation, restaurant, reason);
            reservation.addEmailLog('cancellation', emailResult.success, emailResult.messageId);
            await reservation.save();
          } catch (emailError) {
            console.error('Erreur envoi email annulation:', emailError);
          }
          
          // Libérer la table si assignée
          if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
            const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
            if (floorPlan) {
              const table = floorPlan.tables.id(reservation.assignedTable.tableId);
              if (table && table.status === 'reserved') {
                table.status = 'available';
                await floorPlan.save();
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Erreur lors du traitement du changement de statut:', error);
    }
  }
  
  /**
   * Supprimer une réservation (soft delete)
   */
  static async deleteReservation(req, res) {
    try {
      const reservation = await Reservation.findById(req.params.id);
      
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
      await reservation.save();
      
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
  }
}

module.exports = ReservationController;