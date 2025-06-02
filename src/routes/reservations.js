const express = require('express');
const ReservationController = require('../controllers/reservationController');
const { auth } = require('../middleware/auth');
const { requireSameRestaurant, requireStaff } = require('../middleware/roleCheck');
const {
  validateCreateReservation,
  validateUpdateReservation,
  validateReservationStatus,
  validateTableAssignment,
  validateReservationFilters,
  validateRestaurantHours,
  validateReservationConflicts,
  validateStatusTransition
} = require('../middleware/reservationValidation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// GET /api/reservations - Obtenir toutes les réservations avec filtres
router.get('/', 
  requireSameRestaurant, 
  validateReservationFilters, 
  ReservationController.getAllReservations
);

// GET /api/reservations/date/:date - Obtenir les réservations d'une date spécifique
router.get('/date/:date', 
  requireSameRestaurant, 
  ReservationController.getReservationsByDate
);

// GET /api/reservations/:id - Obtenir une réservation spécifique
router.get('/:id', 
  requireSameRestaurant, 
  ReservationController.getReservationById
);

// POST /api/reservations - Créer une nouvelle réservation
router.post('/', 
  requireStaff,
  validateCreateReservation,
  validateRestaurantHours,
  validateReservationConflicts,
  ReservationController.createReservation
);

// PUT /api/reservations/:id - Mettre à jour une réservation
router.put('/:id',
  requireStaff,
  validateUpdateReservation,
  validateRestaurantHours,
  validateReservationConflicts,
  ReservationController.updateReservation
);

// PATCH /api/reservations/:id/status - Changer le statut d'une réservation
router.patch('/:id/status',
  requireStaff,
  validateReservationStatus,
  validateStatusTransition,
  ReservationController.updateReservationStatus
);

// PATCH /api/reservations/:id/assign-table - Assigner une table à une réservation
router.patch('/:id/assign-table',
  requireStaff,
  validateTableAssignment,
  ReservationController.assignTable
);

// DELETE /api/reservations/:id - Supprimer une réservation
router.delete('/:id',
  requireStaff,
  ReservationController.deleteReservation
);

module.exports = router;