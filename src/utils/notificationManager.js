const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const {
  sendReservationConfirmation,
  sendReservationReminder,
  sendReservationCancellation,
  emailConfig
} = require('../config/email');

/**
 * Gestionnaire de notifications pour les réservations
 */
class NotificationManager {
  
  /**
   * Envoie une confirmation de réservation
   */
  static async sendConfirmation(reservationId) {
    try {
      const reservation = await Reservation.findById(reservationId)
        .populate('restaurantId', 'name address contact');
      
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }
      
      if (reservation.status !== 'confirmed') {
        throw new Error('La réservation doit être confirmée pour envoyer une confirmation');
      }
      
      const result = await sendReservationConfirmation(reservation, reservation.restaurantId);
      
      // Enregistrer le résultat
      reservation.addEmailLog('confirmation', result.success, result.messageId);
      await reservation.save();
      
      return {
        success: result.success,
        message: result.success ? 'Confirmation envoyée' : `Erreur: ${result.error}`,
        reservationNumber: reservation.reservationNumber,
        customerEmail: reservation.customer.email
      };
      
    } catch (error) {
      console.error('Erreur envoi confirmation:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Envoie un rappel de réservation
   */
  static async sendReminder(reservationId) {
    try {
      const reservation = await Reservation.findById(reservationId)
        .populate('restaurantId', 'name address contact');
      
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }
      
      if (reservation.status !== 'confirmed') {
        throw new Error('Seules les réservations confirmées peuvent recevoir un rappel');
      }
      
      if (reservation.notifications.reminderSent) {
        throw new Error('Rappel déjà envoyé pour cette réservation');
      }
      
      // Vérifier que la réservation est dans les prochaines 48h
      const now = new Date();
      const timeDiff = reservation.dateTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 0) {
        throw new Error('Impossible d\'envoyer un rappel pour une réservation passée');
      }
      
      if (hoursDiff > 48) {
        throw new Error('Rappel trop tôt (plus de 48h à l\'avance)');
      }
      
      const result = await sendReservationReminder(reservation, reservation.restaurantId);
      
      // Enregistrer le résultat
      reservation.addEmailLog('reminder', result.success, result.messageId);
      await reservation.save();
      
      return {
        success: result.success,
        message: result.success ? 'Rappel envoyé' : `Erreur: ${result.error}`,
        reservationNumber: reservation.reservationNumber,
        customerEmail: reservation.customer.email,
        hoursUntilReservation: Math.round(hoursDiff)
      };
      
    } catch (error) {
      console.error('Erreur envoi rappel:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Envoie une notification d'annulation
   */
  static async sendCancellation(reservationId, reason = '') {
    try {
      const reservation = await Reservation.findById(reservationId)
        .populate('restaurantId', 'name address contact');
      
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }
      
      if (!['cancelled', 'no_show'].includes(reservation.status)) {
        throw new Error('La réservation doit être annulée ou marquée no-show');
      }
      
      const result = await sendReservationCancellation(reservation, reservation.restaurantId, reason);
      
      // Enregistrer le résultat
      reservation.addEmailLog('cancellation', result.success, result.messageId);
      await reservation.save();
      
      return {
        success: result.success,
        message: result.success ? 'Notification d\'annulation envoyée' : `Erreur: ${result.error}`,
        reservationNumber: reservation.reservationNumber,
        customerEmail: reservation.customer.email,
        reason
      };
      
    } catch (error) {
      console.error('Erreur envoi annulation:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Envoie les rappels pour toutes les réservations éligibles
   */
  static async sendBatchReminders(restaurantId = null) {
    try {
      console.log('📧 Début de l\'envoi par lot des rappels...');
      
      let reservations;
      
      if (restaurantId) {
        // Rappels pour un restaurant spécifique
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        
        reservations = await Reservation.find({
          restaurantId,
          dateTime: {
            $gte: tomorrow,
            $lte: endOfTomorrow
          },
          status: 'confirmed',
          'notifications.reminderSent': false,
          isActive: true
        }).populate('restaurantId', 'name');
        
      } else {
        // Utiliser la méthode statique du modèle
        reservations = await Reservation.findNeedingReminder();
      }
      
      if (reservations.length === 0) {
        return {
          success: true,
          message: 'Aucune réservation nécessitant un rappel',
          sent: 0,
          failed: 0
        };
      }
      
      let sentCount = 0;
      let failedCount = 0;
      const results = [];
      
      for (const reservation of reservations) {
        try {
          const result = await this.sendReminder(reservation._id);
          
          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }
          
          results.push({
            reservationNumber: reservation.reservationNumber,
            customerEmail: reservation.customer.email,
            success: result.success,
            message: result.message
          });
          
          // Pause entre les emails
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failedCount++;
          results.push({
            reservationNumber: reservation.reservationNumber,
            customerEmail: reservation.customer.email,
            success: false,
            message: error.message
          });
        }
      }
      
      console.log(`📊 Rappels terminés: ${sentCount} envoyés, ${failedCount} échecs`);
      
      return {
        success: true,
        message: `Rappels par lot terminés: ${sentCount} envoyés, ${failedCount} échecs`,
        sent: sentCount,
        failed: failedCount,
        details: results
      };
      
    } catch (error) {
      console.error('Erreur envoi rappels par lot:', error);
      return {
        success: false,
        message: error.message,
        sent: 0,
        failed: 0
      };
    }
  }
  
  /**
   * Obtient l'historique des notifications d'une réservation
   */
  static async getNotificationHistory(reservationId) {
    try {
      const reservation = await Reservation.findById(reservationId)
        .select('notifications customer reservationNumber');
      
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }
      
      return {
        success: true,
        reservationNumber: reservation.reservationNumber,
        customerEmail: reservation.customer.email,
        confirmationSent: reservation.notifications.confirmationSent,
        reminderSent: reservation.notifications.reminderSent,
        emails: reservation.notifications.emails.map(email => ({
          type: email.type,
          sentAt: email.sentAt,
          success: email.success,
          messageId: email.messageId
        }))
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Teste la configuration email en envoyant un email de test
   */
  static async testEmailConfiguration(testEmail) {
    try {
      const { sendEmail } = require('../config/email');
      
      const result = await sendEmail(
        testEmail,
        'reservationConfirmation',
        {
          customerName: 'Test Utilisateur',
          restaurantName: 'Restaurant Test',
          date: new Date().toLocaleDateString('fr-FR'),
          time: '19:30',
          guests: 2,
          tableNumber: 'Test',
          reservationNumber: 'TEST-123'
        }
      );
      
      return {
        success: result.success,
        message: result.success 
          ? `Email de test envoyé à ${testEmail}` 
          : `Erreur: ${result.error}`,
        messageId: result.messageId
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Obtient les statistiques des notifications
   */
  static async getNotificationStats(restaurantId = null, days = 7) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      
      const matchFilter = {
        createdAt: { $gte: dateFrom },
        isActive: true
      };
      
      if (restaurantId) {
        matchFilter.restaurantId = restaurantId;
      }
      
      const stats = await Reservation.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalReservations: { $sum: 1 },
            confirmationsSent: {
              $sum: { $cond: ['$notifications.confirmationSent', 1, 0] }
            },
            remindersSent: {
              $sum: { $cond: ['$notifications.reminderSent', 1, 0] }
            },
            totalEmailsSent: {
              $sum: { $size: '$notifications.emails' }
            },
            successfulEmails: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$notifications.emails',
                    cond: { $eq: ['$$this.success', true] }
                  }
                }
              }
            }
          }
        }
      ]);
      
      const result = stats[0] || {
        totalReservations: 0,
        confirmationsSent: 0,
        remindersSent: 0,
        totalEmailsSent: 0,
        successfulEmails: 0
      };
      
      // Calculer les taux
      result.confirmationRate = result.totalReservations > 0 
        ? ((result.confirmationsSent / result.totalReservations) * 100).toFixed(1)
        : 0;
      
      result.reminderRate = result.totalReservations > 0
        ? ((result.remindersSent / result.totalReservations) * 100).toFixed(1)
        : 0;
      
      result.emailSuccessRate = result.totalEmailsSent > 0
        ? ((result.successfulEmails / result.totalEmailsSent) * 100).toFixed(1)
        : 0;
      
      return {
        success: true,
        period: `${days} derniers jours`,
        stats: result
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Reessaie l'envoi d'un email échoué
   */
  static async retryFailedEmail(reservationId, emailType) {
    try {
      const reservation = await Reservation.findById(reservationId)
        .populate('restaurantId', 'name address contact');
      
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }
      
      // Chercher le dernier email échoué de ce type
      const lastEmail = reservation.notifications.emails
        .filter(email => email.type === emailType && !email.success)
        .sort((a, b) => b.sentAt - a.sentAt)[0];
      
      if (!lastEmail) {
        throw new Error(`Aucun email échoué de type '${emailType}' trouvé`);
      }
      
      let result;
      
      switch (emailType) {
        case 'confirmation':
          result = await this.sendConfirmation(reservationId);
          break;
        case 'reminder':
          result = await this.sendReminder(reservationId);
          break;
        case 'cancellation':
          result = await this.sendCancellation(reservationId);
          break;
        default:
          throw new Error(`Type d'email non supporté: ${emailType}`);
      }
      
      return {
        ...result,
        retried: true,
        originalError: lastEmail.error
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message,
        retried: false
      };
    }
  }
}

module.exports = NotificationManager;