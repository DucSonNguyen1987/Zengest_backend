const express = require('express');
const NotificationManager = require('../utils/notificationManager');
const ReservationScheduler = require('../utils/reservationScheduler');
const { auth } = require('../middleware/auth');
const { requireManagement, requireSameRestaurant } = require('../middleware/roleCheck');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// POST /api/notifications/reservations/:id/confirmation - Envoyer confirmation
router.post('/reservations/:id/confirmation', 
  requireManagement,
  async (req, res) => {
    try {
      const result = await NotificationManager.sendConfirmation(req.params.id);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            reservationNumber: result.reservationNumber,
            customerEmail: result.customerEmail
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('Erreur envoi confirmation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// POST /api/notifications/reservations/:id/reminder - Envoyer rappel
router.post('/reservations/:id/reminder',
  requireManagement,
  async (req, res) => {
    try {
      const result = await NotificationManager.sendReminder(req.params.id);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            reservationNumber: result.reservationNumber,
            customerEmail: result.customerEmail,
            hoursUntilReservation: result.hoursUntilReservation
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('Erreur envoi rappel:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// POST /api/notifications/reservations/:id/cancellation - Envoyer annulation
router.post('/reservations/:id/cancellation',
  requireManagement,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await NotificationManager.sendCancellation(req.params.id, reason);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            reservationNumber: result.reservationNumber,
            customerEmail: result.customerEmail,
            reason: result.reason
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('Erreur envoi annulation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// POST /api/notifications/batch/reminders - Envoyer rappels par lot
router.post('/batch/reminders',
  requireManagement,
  async (req, res) => {
    try {
      const restaurantId = req.user.role === USER_ROLES.ADMIN 
        ? req.body.restaurantId || null
        : req.user.restaurantId;
      
      const result = await NotificationManager.sendBatchReminders(restaurantId);
      
      res.json({
        success: result.success,
        message: result.message,
        data: {
          sent: result.sent,
          failed: result.failed,
          details: result.details
        }
      });
      
    } catch (error) {
      console.error('Erreur rappels par lot:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// GET /api/notifications/reservations/:id/history - Historique notifications
router.get('/reservations/:id/history',
  requireSameRestaurant,
  async (req, res) => {
    try {
      const result = await NotificationManager.getNotificationHistory(req.params.id);
      
      if (result.success) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// GET /api/notifications/stats - Statistiques notifications
router.get('/stats',
  requireSameRestaurant,
  async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const restaurantId = req.user.role === USER_ROLES.ADMIN 
        ? req.query.restaurantId || null
        : req.user.restaurantId;
      
      const result = await NotificationManager.getNotificationStats(restaurantId, parseInt(days));
      
      res.json({
        success: result.success,
        data: result.stats,
        period: result.period
      });
      
    } catch (error) {
      console.error('Erreur statistiques notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// POST /api/notifications/test - Tester configuration email
router.post('/test',
  requireManagement,
  async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Email valide requis'
        });
      }
      
      const result = await NotificationManager.testEmailConfiguration(email);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            testEmail: email,
            messageId: result.messageId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('Erreur test email:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// POST /api/notifications/retry/:id/:type - Réessayer email échoué
router.post('/retry/:id/:type',
  requireManagement,
  async (req, res) => {
    try {
      const { id, type } = req.params;
      
      if (!['confirmation', 'reminder', 'cancellation'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type d\'email invalide'
        });
      }
      
      const result = await NotificationManager.retryFailedEmail(id, type);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            retried: result.retried,
            reservationNumber: result.reservationNumber,
            customerEmail: result.customerEmail
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('Erreur retry email:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// GET /api/notifications/scheduler/status - Statut du planificateur
router.get('/scheduler/status',
  requireManagement,
  async (req, res) => {
    try {
      const status = ReservationScheduler.getJobsStatus();
      
      res.json({
        success: true,
        data: {
          initialized: ReservationScheduler.isInitialized,
          jobs: status
        }
      });
      
    } catch (error) {
      console.error('Erreur statut planificateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// POST /api/notifications/scheduler/run/:job - Exécuter job manuellement
router.post('/scheduler/run/:job',
  requireManagement,
  async (req, res) => {
    try {
      const { job } = req.params;
      
      // Seuls les admins peuvent exécuter les jobs manuellement
      if (req.user.role !== USER_ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes'
        });
      }
      
      const validJobs = ['dailyReminders', 'cleanupExpired', 'markNoShows', 'autoReleaseTable', 'weeklyStats'];
      
      if (!validJobs.includes(job)) {
        return res.status(400).json({
          success: false,
          message: 'Job invalide',
          validJobs
        });
      }
      
      // Exécuter le job de manière asynchrone
      ReservationScheduler.runJob(job).catch(error => {
        console.error(`Erreur exécution job ${job}:`, error);
      });
      
      res.json({
        success: true,
        message: `Job '${job}' lancé en arrière-plan`,
        job
      });
      
    } catch (error) {
      console.error('Erreur exécution job:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

module.exports = router;