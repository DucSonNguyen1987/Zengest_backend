/**
 * ROUTES RÉSERVATIONS - ACCÈS CRUD PUBLIC
 * ✅ INTÉGRATION BREVO COMPLÈTE
 * ✅ ACCÈS PUBLIC POUR LES CLIENTS
 * ✅ ROUTES PROTÉGÉES POUR L'ADMINISTRATION
 */

const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ===================================================================
// IMPORTS SÉCURISÉS
// ===================================================================

console.log('🚀 ROUTES RESERVATIONS - ACCÈS PUBLIC + BREVO');

// Import contrôleur principal
let ReservationController = null;
try {
  ReservationController = require('../controllers/reservationController');
  console.log('✅ Import ReservationController réussi');
  console.log('📋 Méthodes disponibles:', Object.keys(ReservationController || {}));
} catch (error) {
  console.error('❌ Erreur import ReservationController:', error.message);
}

// Import roleCheck
let roleCheckMiddleware = null;
try {
  roleCheckMiddleware = require('../middleware/roleCheck');
  console.log('✅ Import roleCheck réussi');
} catch (error) {
  console.error('❌ Erreur import roleCheck:', error.message);
}

// Import validation
let validationMiddleware = null;
try {
  validationMiddleware = require('../middleware/reservationValidation');
  console.log('✅ Import reservationValidation réussi');
} catch (error) {
  console.error('❌ Erreur import reservationValidation:', error.message);
}

// Import middleware email Brevo
let emailMiddleware = null;
try {
  emailMiddleware = require('../middleware/emailMiddleware');
  console.log('✅ Import emailMiddleware réussi');
} catch (error) {
  console.error('❌ Erreur import emailMiddleware:', error.message);
  // Fallback middleware
  emailMiddleware = {
    afterReservationCreated: (req, res, next) => {
      console.log('⚠️ EmailMiddleware non disponible - email ignoré');
      next();
    }
  };
}

// ===================================================================
// 🌐 ROUTES PUBLIQUES (SANS AUTHENTIFICATION)
// ===================================================================

/**
 * ✅ CRÉATION DE RÉSERVATION PUBLIQUE
 * POST /reservations
 * Permet aux clients de réserver directement depuis le site vitrine
 */
router.post('/', async (req, res, next) => {
  try {
    console.log('📝 Création réservation publique par client');
    console.log('📋 Données reçues:', req.body);
    console.log('🌐 IP client:', req.ip);
    console.log('🔍 User-Agent:', req.get('User-Agent'));
    
    // Créer un utilisateur fictif pour les réservations publiques
    req.user = {
      _id: null,
      email: 'public@zengest.fr',
      role: 'public',
      isPublicToken: true,
      restaurantId: null // Sera déterminé automatiquement par le contrôleur
    };
    
    // Ajouter des métadonnées pour les réservations publiques
    if (req.body) {
      req.body.source = req.body.source || 'website_public';
      req.body.clientIP = req.ip;
      req.body.userAgent = req.get('User-Agent');
    }
    
    if (ReservationController && ReservationController.createReservation) {
      console.log('🚀 Appel du contrôleur principal (accès public)');
      // Le contrôleur gère automatiquement l'email
      await ReservationController.createReservation(req, res);
      // Pas de next() car le contrôleur gère déjà la réponse et l'email
    } else {
      // Fallback si le contrôleur n'est pas disponible
      console.log('⚠️ Utilisation du fallback avec middleware email');
      
      const Reservation = require('../models/Reservation');
      
      const reservation = new Reservation({
        ...req.body,
        source: 'website_public',
        createdBy: null, // Réservation publique
        clientMetadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        }
      });
      
      await reservation.save();
      console.log('✅ Réservation publique créée (fallback):', reservation._id);
      
      // Préparer les données pour le middleware email
      res.locals.createdReservation = reservation;
      res.locals.customerInfo = {
        email: reservation.customer.email,
        name: `${reservation.customer.firstName || ''} ${reservation.customer.lastName || ''}`.trim() || reservation.customer.name || 'Client'
      };
      
      res.status(201).json({
        success: true,
        message: reservation.customer.email 
          ? 'Réservation créée avec succès. Un email de confirmation vous sera envoyé.'
          : 'Réservation créée avec succès.',
        data: {
          reservation: {
            id: reservation._id,
            customer: reservation.customer,
            dateTime: reservation.dateTime,
            partySize: reservation.partySize,
            status: reservation.status
          }
        }
      });
      
      // Appeler le middleware email
      next();
    }
  } catch (error) {
    console.error('❌ Erreur création réservation publique:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}, emailMiddleware.afterReservationCreated);

/**
 * ✅ CONSULTATION DES RÉSERVATIONS PAR EMAIL (PUBLIC)
 * GET /reservations/lookup/:email
 * Permet aux clients de voir leurs réservations avec leur email
 */
router.get('/lookup/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('🔍 Consultation réservations publique pour email:', email);

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    const Reservation = require('../models/Reservation');
    
    // Chercher les réservations de cet email (actives seulement)
    const reservations = await Reservation.find({
      'customer.email': { $regex: new RegExp(email, 'i') },
      isActive: true,
      dateTime: { $gte: new Date() } // Seulement les réservations futures
    })
    .populate('restaurantId', 'name address contact')
    .sort({ dateTime: 1 })
    .limit(10); // Limiter pour sécurité

    console.log(`📋 ${reservations.length} réservations trouvées pour ${email}`);

    // Nettoyer les données sensibles pour la réponse publique
    const cleanReservations = reservations.map(reservation => ({
      id: reservation._id,
      restaurant: reservation.restaurantId ? {
        name: reservation.restaurantId.name,
        address: reservation.restaurantId.address
      } : null,
      dateTime: reservation.dateTime,
      partySize: reservation.partySize,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      customer: {
        firstName: reservation.customer.firstName,
        lastName: reservation.customer.lastName,
        phone: reservation.customer.phone
      },
      timestamps: {
        requested: reservation.timestamps.requested,
        confirmed: reservation.timestamps.confirmed
      }
    }));

    res.json({
      success: true,
      data: {
        email: email,
        reservations: cleanReservations,
        count: cleanReservations.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur consultation réservations publique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la consultation des réservations'
    });
  }
});

/**
 * ✅ CONSULTATION D'UNE RÉSERVATION SPÉCIFIQUE (PUBLIC)
 * GET /reservations/view/:id/:email
 * Permet aux clients de voir une réservation spécifique avec vérification email
 */
router.get('/view/:id/:email', async (req, res) => {
  try {
    const { id, email } = req.params;
    console.log('🔍 Consultation réservation publique:', id, 'pour email:', email);

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    const Reservation = require('../models/Reservation');
    
    const reservation = await Reservation.findOne({
      _id: id,
      'customer.email': { $regex: new RegExp(email, 'i') },
      isActive: true
    }).populate('restaurantId', 'name address contact phone');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée ou email incorrect'
      });
    }

    // Données nettoyées pour réponse publique
    const cleanReservation = {
      id: reservation._id,
      restaurant: reservation.restaurantId ? {
        name: reservation.restaurantId.name,
        address: reservation.restaurantId.address,
        phone: reservation.restaurantId.phone
      } : null,
      dateTime: reservation.dateTime,
      partySize: reservation.partySize,
      duration: reservation.duration,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      notes: reservation.notes,
      customer: {
        firstName: reservation.customer.firstName,
        lastName: reservation.customer.lastName,
        phone: reservation.customer.phone,
        email: reservation.customer.email
      },
      timestamps: reservation.timestamps
    };

    res.json({
      success: true,
      data: { reservation: cleanReservation }
    });

  } catch (error) {
    console.error('❌ Erreur consultation réservation publique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la consultation de la réservation'
    });
  }
});

/**
 * ✅ ANNULATION DE RÉSERVATION PAR LE CLIENT (PUBLIC)
 * DELETE /reservations/cancel/:id/:email
 * Permet aux clients d'annuler leur réservation avec leur email
 */
router.delete('/cancel/:id/:email', async (req, res) => {
  try {
    const { id, email } = req.params;
    const { reason } = req.body;
    
    console.log('❌ Annulation réservation publique:', id, 'par email:', email);

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    const Reservation = require('../models/Reservation');
    
    const reservation = await Reservation.findOne({
      _id: id,
      'customer.email': { $regex: new RegExp(email, 'i') },
      isActive: true,
      status: { $in: ['pending', 'confirmed'] } // Seulement si annulable
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée, email incorrect, ou réservation non annulable'
      });
    }

    // Vérifier si l'annulation est possible (par exemple, pas moins de 2h avant)
    const hoursUntilReservation = (new Date(reservation.dateTime) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilReservation < 2) {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler une réservation moins de 2 heures avant l\'heure prévue. Veuillez nous contacter directement.'
      });
    }

    // Effectuer l'annulation
    reservation.status = 'cancelled';
    reservation.isActive = false;
    reservation.timestamps.cancelled = new Date();
    reservation.notes = (reservation.notes || '') + `\nAnnulée par le client le ${new Date().toLocaleString('fr-FR')}`;
    if (reason) {
      reservation.notes += `\nRaison: ${reason}`;
    }

    await reservation.save();

    // Envoyer email d'annulation
    try {
      const customerInfo = {
        email: reservation.customer.email,
        name: `${reservation.customer.firstName} ${reservation.customer.lastName}`.trim()
      };
      
      const brevoEmailService = require('../services/emailService');
      await brevoEmailService.sendReservationCancellation(reservation, customerInfo, reason || 'Annulation par le client');
      
      console.log('✅ Email d\'annulation envoyé à:', customerInfo.email);
    } catch (emailError) {
      console.error('❌ Erreur envoi email annulation:', emailError.message);
      // Ne pas faire échouer l'annulation pour un problème d'email
    }

    console.log('✅ Réservation annulée par le client:', reservation._id);

    res.json({
      success: true,
      message: 'Réservation annulée avec succès. Un email de confirmation vous a été envoyé.',
      data: {
        reservationId: reservation._id,
        cancelledAt: reservation.timestamps.cancelled
      }
    });

  } catch (error) {
    console.error('❌ Erreur annulation réservation publique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la réservation'
    });
  }
});

/**
 * ✅ MODIFICATION DE RÉSERVATION PAR LE CLIENT (PUBLIC LIMITÉ)
 * PUT /reservations/modify/:id/:email
 * Permet aux clients de modifier certains aspects de leur réservation
 */
router.put('/modify/:id/:email', async (req, res) => {
  try {
    const { id, email } = req.params;
    const { partySize, specialRequests, customer } = req.body;
    
    console.log('📝 Modification réservation publique:', id, 'par email:', email);

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    const Reservation = require('../models/Reservation');
    
    const reservation = await Reservation.findOne({
      _id: id,
      'customer.email': { $regex: new RegExp(email, 'i') },
      isActive: true,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée, email incorrect, ou réservation non modifiable'
      });
    }

    // Vérifier si la modification est possible (par exemple, pas moins de 4h avant)
    const hoursUntilReservation = (new Date(reservation.dateTime) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilReservation < 4) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une réservation moins de 4 heures avant l\'heure prévue. Veuillez nous contacter directement.'
      });
    }

    // Appliquer les modifications autorisées (seulement certains champs)
    let hasChanges = false;

    if (partySize && partySize !== reservation.partySize) {
      if (partySize >= 1 && partySize <= 12) { // Limite raisonnable
        reservation.partySize = partySize;
        hasChanges = true;
      }
    }

    if (specialRequests !== undefined) {
      reservation.specialRequests = Array.isArray(specialRequests) ? specialRequests : [specialRequests];
      hasChanges = true;
    }

    if (customer && customer.phone) {
      reservation.customer.phone = customer.phone;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification valide fournie'
      });
    }

    // Sauvegarder les modifications
    reservation.timestamps.updated = new Date();
    reservation.notes = (reservation.notes || '') + `\nModifiée par le client le ${new Date().toLocaleString('fr-FR')}`;
    
    await reservation.save();

    console.log('✅ Réservation modifiée par le client:', reservation._id);

    res.json({
      success: true,
      message: 'Réservation modifiée avec succès',
      data: {
        reservation: {
          id: reservation._id,
          partySize: reservation.partySize,
          specialRequests: reservation.specialRequests,
          customer: {
            phone: reservation.customer.phone
          },
          updatedAt: reservation.timestamps.updated
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification réservation publique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la réservation'
    });
  }
});

// ===================================================================
// 🧪 ROUTES DE TEST ET DEBUG (PUBLIQUES)
// ===================================================================

/**
 * Test de base
 */
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Route test OK - Accès public avec Brevo intégré',
    timestamp: new Date().toISOString(),
    publicAccess: true
  });
});

/**
 * Debug des imports
 */
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    debug: {
      reservationController: {
        imported: !!ReservationController,
        methods: Object.keys(ReservationController || {}),
        getAllReservations: typeof ReservationController?.getAllReservations
      },
      roleCheck: {
        imported: !!roleCheckMiddleware,
        methods: Object.keys(roleCheckMiddleware || {})
      },
      validation: {
        imported: !!validationMiddleware,
        methods: Object.keys(validationMiddleware || {})
      },
      emailMiddleware: {
        imported: !!emailMiddleware,
        methods: Object.keys(emailMiddleware || {})
      }
    },
    publicAccess: true
  });
});

/**
 * Test création simple
 */
router.post('/test-create', async (req, res) => {
  try {
    console.log('🔄 Test création réservation simple');
    console.log('Body:', req.body);
    
    // Rediriger vers la route principale
    req.url = '/';
    return router.handle(req, res);
    
  } catch (error) {
    console.error('❌ Erreur test création:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Info sur les routes disponibles
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Routes réservations - Accès public avec Brevo intégré',
    publicRoutes: [
      'POST / - Création réservation (public)',
      'GET /lookup/:email - Consulter ses réservations',
      'GET /view/:id/:email - Voir une réservation',
      'PUT /modify/:id/:email - Modifier sa réservation (limité)',
      'DELETE /cancel/:id/:email - Annuler sa réservation',
      'GET /test - Test de base',
      'GET /debug - Debug des imports',
      'POST /test-create - Test création'
    ],
    protectedRoutes: [
      'GET /admin/list - Liste complète (admin)',
      'GET /admin/date/:date - Par date (admin)',
      'GET /admin/:id - Par ID (admin)',
      'PUT /admin/:id - Modification complète (admin)',
      'PATCH /admin/:id/status - Changement statut (admin)',
      'DELETE /admin/:id - Suppression (admin)'
    ],
    timestamp: new Date().toISOString(),
    note: 'Accès public activé pour les clients du restaurant'
  });
});

// ===================================================================
// 🔐 ROUTES PROTÉGÉES (ADMINISTRATION)
// ===================================================================

// Appliquer l'authentification pour les routes d'administration
router.use('/admin', auth);

/**
 * Liste complète des réservations (admin/staff)
 * GET /reservations/admin/list
 */
router.get('/admin/list', async (req, res) => {
  try {
    if (ReservationController && ReservationController.getAllReservations) {
      return await ReservationController.getAllReservations(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de réservations temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur liste réservations admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations'
    });
  }
});

/**
 * Réservations par date (admin/staff)
 * GET /reservations/admin/date/:date
 */
router.get('/admin/date/:date', async (req, res) => {
  try {
    if (ReservationController && ReservationController.getReservationsByDate) {
      return await ReservationController.getReservationsByDate(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de réservations par date temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur réservations par date admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations par date'
    });
  }
});

/**
 * Réservation par ID (admin/staff)
 * GET /reservations/admin/:id
 */
router.get('/admin/:id', async (req, res) => {
  try {
    if (ReservationController && ReservationController.getReservationById) {
      return await ReservationController.getReservationById(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de réservation par ID temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur réservation par ID admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la réservation'
    });
  }
});

/**
 * Création réservation par admin/staff
 * POST /reservations/admin
 */
router.post('/admin', async (req, res, next) => {
  try {
    console.log('📝 Création réservation par admin/staff:', req.user?.email);
    
    if (ReservationController && ReservationController.createReservation) {
      await ReservationController.createReservation(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de création temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur création réservation admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation'
    });
  }
}, emailMiddleware.afterReservationCreated);

/**
 * Mise à jour complète réservation (admin/staff)
 * PUT /reservations/admin/:id
 */
router.put('/admin/:id', async (req, res) => {
  try {
    if (ReservationController && ReservationController.updateReservation) {
      return await ReservationController.updateReservation(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de mise à jour temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur mise à jour réservation admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la réservation'
    });
  }
});

/**
 * Changement de statut (admin/staff)
 * PATCH /reservations/admin/:id/status
 */
router.patch('/admin/:id/status', async (req, res) => {
  try {
    if (ReservationController && ReservationController.updateReservationStatus) {
      return await ReservationController.updateReservationStatus(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de changement de statut temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur changement statut admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut'
    });
  }
});

/**
 * Assignation de table (admin/staff)
 * PATCH /reservations/admin/:id/assign-table
 */
router.patch('/admin/:id/assign-table', async (req, res) => {
  try {
    if (ReservationController && ReservationController.assignTable) {
      return await ReservationController.assignTable(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service d\'assignation de table temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur assignation table admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation de la table'
    });
  }
});

/**
 * Suppression définitive réservation (admin seulement)
 * DELETE /reservations/admin/:id
 */
router.delete('/admin/:id', async (req, res) => {
  try {
    // Vérifier permissions admin
    if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissions administrateur requises pour la suppression'
      });
    }

    if (ReservationController && ReservationController.deleteReservation) {
      return await ReservationController.deleteReservation(req, res);
    } else {
      res.status(503).json({
        success: false,
        message: 'Service de suppression temporairement indisponible'
      });
    }
  } catch (error) {
    console.error('❌ Erreur suppression réservation admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la réservation'
    });
  }
});

// ===================================================================
// 📧 ROUTES D'ADMINISTRATION EMAIL (ADMIN SEULEMENT)
// ===================================================================

/**
 * Test service email Brevo (admin)
 * POST /reservations/admin/test-email
 */
router.post('/admin/test-email', async (req, res) => {
  try {
    // Vérifier permissions admin
    if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissions administrateur requises'
      });
    }

    const brevoEmailService = require('../services/emailService');
    
    const testData = {
      email: req.body.email || req.user.email || 'test@example.com',
      firstName: req.body.firstName || 'Test',
      lastName: req.body.lastName || 'User'
    };

    console.log('📧 Test service email Brevo par admin...');
    
    const result = await brevoEmailService.sendSimpleEmail({
      to: testData.email,
      toName: `${testData.firstName} ${testData.lastName}`,
      subject: 'Test Brevo - Intégration Zengest Réservations',
      htmlContent: `
        <h2>✅ Test Brevo réussi</h2>
        <p>Bonjour ${testData.firstName},</p>
        <p>Ce message confirme que l'intégration Brevo fonctionne correctement pour les réservations Zengest.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Utilisateur admin:</strong> ${req.user.email}</p>
        <hr>
        <p><small>Test envoyé depuis les routes de réservation Zengest</small></p>
      `,
      textContent: `Test Brevo réussi - Intégration Zengest Réservations - ${new Date().toLocaleString('fr-FR')}`
    });
    
    res.json({
      success: true,
      message: 'Test email Brevo envoyé avec succès',
      data: {
        sentTo: testData.email,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur test email Brevo admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test email: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;