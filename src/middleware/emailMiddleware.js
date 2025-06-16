/**
 * MIDDLEWARE EMAIL AUTOMATIQUE - VERSION CORRIGÉE
 * ✅ CORRECTION DU CONFLIT DE VARIABLE emailService
 */

// ✅ IMPORT UNIQUE ET RENOMMÉ pour éviter le conflit
const brevoEmailService = require('../services/emailService');

/**
 * Middleware pour envoyer des emails automatiquement après certaines actions
 */
const emailMiddleware = {
  
  /**
   * ✅ Après création d'une réservation
   */
  afterReservationCreated: async (req, res, next) => {
    try {
      console.log('📧 EmailMiddleware: afterReservationCreated');
      
      const reservation = res.locals.createdReservation;
      const customerInfo = res.locals.customerInfo;

      if (!reservation || !customerInfo) {
        console.log('⚠️ Données manquantes pour email confirmation - ignoré');
        console.log('Reservation:', !!reservation, 'CustomerInfo:', !!customerInfo);
        return next();
      }

      if (!customerInfo.email) {
        console.log('⚠️ Pas d\'email client - confirmation ignorée');
        return next();
      }

      console.log('📧 Envoi email confirmation pour réservation:', reservation._id);
      console.log('📧 Email destinataire:', customerInfo.email);

      // ✅ UTILISATION DU SERVICE RENOMMÉ
      setImmediate(async () => {
        try {
          const result = await brevoEmailService.sendReservationConfirmation(reservation, customerInfo);
          console.log('✅ Email confirmation envoyé:', {
            reservationId: reservation._id,
            to: customerInfo.email,
            messageId: result.messageId
          });
        } catch (error) {
          console.error('❌ Erreur envoi email confirmation:', {
            reservationId: reservation._id,
            to: customerInfo.email,
            error: error.message
          });
          
          try {
            await logEmailError('reservation_confirmation', reservation._id, customerInfo.email, error);
          } catch (logError) {
            console.error('❌ Erreur log email:', logError.message);
          }
        }
      });

      next();
      
    } catch (error) {
      console.error('❌ Erreur middleware email réservation:', error);
      next();
    }
  },

  /**
   * ✅ Après souscription à la newsletter
   */
  afterNewsletterSubscription: async (req, res, next) => {
    try {
      console.log('📧 EmailMiddleware: afterNewsletterSubscription');
      
      const subscriberInfo = res.locals.subscriberInfo;

      if (!subscriberInfo || !subscriberInfo.email) {
        console.log('⚠️ Données abonné manquantes pour email bienvenue - ignoré');
        return next();
      }

      console.log('📧 Envoi email bienvenue pour:', subscriberInfo.email);

      setImmediate(async () => {
        try {
          const result = await brevoEmailService.sendWelcomeEmail(subscriberInfo);
          console.log('✅ Email bienvenue envoyé:', {
            to: subscriberInfo.email,
            messageId: result.messageId
          });
        } catch (error) {
          console.error('❌ Erreur envoi email bienvenue:', {
            to: subscriberInfo.email,
            error: error.message
          });
          
          try {
            await logEmailError('newsletter_welcome', null, subscriberInfo.email, error);
          } catch (logError) {
            console.error('❌ Erreur log email:', logError.message);
          }
        }
      });

      next();
      
    } catch (error) {
      console.error('❌ Erreur middleware email newsletter:', error);
      next();
    }
  },

  /**
   * ✅ Après envoi du formulaire de contact
   */
  afterContactFormSubmitted: async (req, res, next) => {
    try {
      console.log('📧 EmailMiddleware: afterContactFormSubmitted');
      
      const contactData = res.locals.contactData;

      if (!contactData || !contactData.email) {
        console.log('⚠️ Données contact manquantes pour notification - ignoré');
        return next();
      }

      console.log('📧 Envoi notification contact de:', contactData.email);

      setImmediate(async () => {
        try {
          const result = await brevoEmailService.sendContactFormNotification(contactData);
          console.log('✅ Notification contact envoyée:', {
            from: contactData.email,
            subject: contactData.subject,
            messageId: result.messageId
          });
        } catch (error) {
          console.error('❌ Erreur envoi notification contact:', {
            from: contactData.email,
            error: error.message
          });
          
          try {
            await logEmailError('contact_notification', null, contactData.email, error);
          } catch (logError) {
            console.error('❌ Erreur log email:', logError.message);
          }
        }
      });

      next();
      
    } catch (error) {
      console.error('❌ Erreur middleware email contact:', error);
      next();
    }
  },

  /**
   * ✅ Après changement de statut de réservation
   */
  afterReservationStatusChange: async (req, res, next) => {
    try {
      console.log('📧 EmailMiddleware: afterReservationStatusChange');
      
      const reservation = res.locals.reservation;
      const oldStatus = res.locals.oldStatus;
      const newStatus = res.locals.newStatus;
      const reason = res.locals.statusChangeReason;

      if (!reservation || !newStatus) {
        console.log('⚠️ Données statut manquantes pour email - ignoré');
        return next();
      }

      const customerInfo = {
        email: reservation.customer.email,
        name: `${reservation.customer.firstName} ${reservation.customer.lastName}`.trim()
      };

      if (!customerInfo.email) {
        console.log('⚠️ Pas d\'email client pour notification statut - ignoré');
        return next();
      }

      console.log('📧 Notification changement statut:', oldStatus, '->', newStatus);

      setImmediate(async () => {
        try {
          let result = null;

          switch (newStatus) {
            case 'confirmed':
              result = await brevoEmailService.sendReservationConfirmation(reservation, customerInfo);
              console.log('✅ Email confirmation statut envoyé');
              break;

            case 'cancelled':
            case 'no_show':
              result = await brevoEmailService.sendReservationCancellation(reservation, customerInfo, reason);
              console.log('✅ Email annulation statut envoyé');
              break;

            default:
              console.log('📧 Pas d\'email prévu pour le statut:', newStatus);
              return;
          }

          if (result) {
            console.log('✅ Email statut envoyé:', {
              reservationId: reservation._id,
              status: newStatus,
              to: customerInfo.email,
              messageId: result.messageId
            });
          }

        } catch (error) {
          console.error('❌ Erreur envoi email statut:', {
            reservationId: reservation._id,
            status: newStatus,
            to: customerInfo.email,
            error: error.message
          });
          
          try {
            await logEmailError('status_change', reservation._id, customerInfo.email, error);
          } catch (logError) {
            console.error('❌ Erreur log email:', logError.message);
          }
        }
      });

      next();
      
    } catch (error) {
      console.error('❌ Erreur middleware email statut:', error);
      next();
    }
  },

  /**
   * ✅ Middleware de test pour vérifier la configuration
   */
  testEmailService: async (req, res, next) => {
    try {
      console.log('🧪 Test EmailService depuis middleware');
      
      const stats = brevoEmailService.getServiceStats();
      res.locals.emailServiceStats = stats;
      
      console.log('📊 EmailService stats:', {
        configuredTemplates: stats.configuredTemplates,
        totalTemplates: stats.totalTemplates,
        sender: stats.sender.email
      });

      next();
      
    } catch (error) {
      console.error('❌ Erreur test email service:', error);
      next();
    }
  },

  /**
   * ✅ Middleware de configuration
   */
  checkEmailConfiguration: async (req, res, next) => {
    try {
      if (!process.env.BREVO_API_KEY) {
        console.warn('⚠️ BREVO_API_KEY non configurée');
        res.locals.emailConfigured = false;
      } else {
        res.locals.emailConfigured = true;
      }
      
      next();
    } catch (error) {
      console.error('❌ Erreur vérification config email:', error);
      res.locals.emailConfigured = false;
      next();
    }
  },

  /**
   * ✅ Middleware d'authentification pour routes email admin
   */
  requireEmailAdminPermissions: (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const allowedRoles = ['admin', 'owner'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permissions administrateur requises pour les fonctions email'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Erreur vérification permissions email:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur de vérification des permissions'
      });
    }
  }
};

/**
 * ✅ Middlewares composés
 */
emailMiddleware.reservationComplete = [
  emailMiddleware.afterReservationCreated,
  emailMiddleware.testEmailService
];

emailMiddleware.newsletterComplete = [
  emailMiddleware.afterNewsletterSubscription,
  emailMiddleware.testEmailService
];

/**
 * ✅ FONCTION UTILITAIRE : Log des erreurs email
 */
async function logEmailError(type, resourceId, recipientEmail, error) {
  try {
    const EmailLog = require('../models/EmailLog');
    
    const errorLog = new EmailLog({
      type: type,
      resourceId: resourceId,
      recipientEmail: recipientEmail,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date(),
      status: 'failed'
    });

    await errorLog.save();
    console.log('📝 Erreur email loggée:', type, recipientEmail);
    
  } catch (logError) {
    console.log('📝 Erreur email (console log):', {
      type,
      resourceId,
      recipientEmail,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = emailMiddleware;