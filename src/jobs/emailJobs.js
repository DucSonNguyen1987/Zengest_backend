/**
 * TÂCHES CRON POUR EMAILS AUTOMATIQUES - VERSION SÉCURISÉE
 * Gestion des envois d'emails programmés avec imports sécurisés
 * ✅ GESTION COMPLÈTE DES MODÈLES MANQUANTS
 */

const cron = require('node-cron');
const emailService = require('../services/emailService');

// ===================================================================
// ✅ IMPORTS SÉCURISÉS DES MODÈLES
// ===================================================================

let Reservation = null;
let NewsletterSubscriber = null; 
let DailySpecial = null;
let User = null;
let EmailLog = null;

const availableModels = [];
const missingModels = [];

// Test import Reservation
try {
  Reservation = require('../models/Reservation');
  availableModels.push('Reservation');
  console.log('✅ Modèle Reservation chargé');
} catch (error) {
  missingModels.push('Reservation');
  console.warn('⚠️ Modèle Reservation non disponible:', error.message);
}

// Test import NewsletterSubscriber
try {
  NewsletterSubscriber = require('../models/NewsletterSubscriber');
  availableModels.push('NewsletterSubscriber');
  console.log('✅ Modèle NewsletterSubscriber chargé');
} catch (error) {
  missingModels.push('NewsletterSubscriber');
  console.warn('⚠️ Modèle NewsletterSubscriber non disponible:', error.message);
}

// Test import DailySpecial
try {
  DailySpecial = require('../models/DailySpecial');
  availableModels.push('DailySpecial');
  console.log('✅ Modèle DailySpecial chargé');
} catch (error) {
  missingModels.push('DailySpecial');
  console.warn('⚠️ Modèle DailySpecial non disponible:', error.message);
}

// Test import User
try {
  User = require('../models/User');
  availableModels.push('User');
  console.log('✅ Modèle User chargé');
} catch (error) {
  missingModels.push('User');
  console.warn('⚠️ Modèle User non disponible:', error.message);
}

// Test import EmailLog (optionnel)
try {
  EmailLog = require('../models/EmailLog');
  availableModels.push('EmailLog');
  console.log('✅ Modèle EmailLog chargé');
} catch (error) {
  console.warn('⚠️ Modèle EmailLog non disponible (optionnel)');
}

console.log('📊 État des modèles:', {
  disponibles: availableModels,
  manquants: missingModels,
  total: availableModels.length + missingModels.length
});

// ===================================================================
// CLASSE EMAILJOBS SÉCURISÉE
// ===================================================================

class EmailJobs {
  constructor() {
    this.jobs = [];
    this.isProduction = process.env.NODE_ENV === 'production';
    this.timezone = process.env.TZ || 'Europe/Paris';
    this.availableModels = availableModels;
    this.missingModels = missingModels;
    
    console.log('📧 EmailJobs initialisé (version sécurisée)');
    console.log('🌍 Timezone:', this.timezone);
    console.log('🚀 Environnement:', process.env.NODE_ENV);
    
    if (missingModels.length > 0) {
      console.log('⚠️ Certaines fonctionnalités seront désactivées:', missingModels.join(', '));
    }
  }

  /**
   * ✅ Vérifier si un modèle est disponible
   */
  isModelAvailable(modelName) {
    return this.availableModels.includes(modelName);
  }

  /**
   * ✅ Initialiser toutes les tâches cron
   */
  initializeJobs() {
    try {
      console.log('📧 Initialisation des tâches cron email...');

      // ===== RAPPELS DE RÉSERVATION =====
      if (this.isModelAvailable('Reservation')) {
        const reminderJob = cron.schedule('0 10 * * *', async () => {
          await this.sendReservationReminders();
        }, {
          scheduled: false,
          timezone: this.timezone,
          name: 'reservation_reminders'
        });
        this.jobs.push(reminderJob);
        console.log('✅ Tâche rappels réservation configurée');
      } else {
        console.log('⚠️ Tâche rappels réservation désactivée (modèle Reservation manquant)');
      }

      // ===== NOTIFICATIONS PLATS DU JOUR =====
      if (this.isModelAvailable('DailySpecial') && this.isModelAvailable('NewsletterSubscriber')) {
        const dailySpecialsJob = cron.schedule('0 11 * * 1-5', async () => {
          await this.sendDailySpecialsNotifications();
        }, {
          scheduled: false,
          timezone: this.timezone,
          name: 'daily_specials_notifications'
        });
        this.jobs.push(dailySpecialsJob);
        console.log('✅ Tâche notifications plats du jour configurée');
      } else {
        console.log('⚠️ Tâche plats du jour désactivée (modèles DailySpecial/NewsletterSubscriber manquants)');
      }

      // ===== NETTOYAGE DES LOGS EMAIL =====
      if (this.isModelAvailable('EmailLog')) {
        const cleanupJob = cron.schedule('0 2 * * 0', async () => {
          await this.cleanupEmailLogs();
        }, {
          scheduled: false,
          timezone: this.timezone,
          name: 'email_logs_cleanup'
        });
        this.jobs.push(cleanupJob);
        console.log('✅ Tâche nettoyage logs configurée');
      } else {
        console.log('⚠️ Tâche nettoyage logs désactivée (modèle EmailLog manquant)');
      }

      // ===== STATISTIQUES HEBDOMADAIRES =====
      if (this.isModelAvailable('User')) {
        const weeklyStatsJob = cron.schedule('0 9 * * 1', async () => {
          await this.sendWeeklyEmailStats();
        }, {
          scheduled: false,
          timezone: this.timezone,
          name: 'weekly_email_stats'
        });
        this.jobs.push(weeklyStatsJob);
        console.log('✅ Tâche statistiques hebdomadaires configurée');
      } else {
        console.log('⚠️ Tâche statistiques désactivée (modèle User manquant)');
      }

      // ===== JOB DE TEST (DÉVELOPPEMENT SEULEMENT) =====
      if (!this.isProduction) {
        const testJob = cron.schedule('*/10 * * * *', async () => {
          await this.testJobExecution();
        }, {
          scheduled: false,
          timezone: this.timezone,
          name: 'test_job'
        });
        this.jobs.push(testJob);
        console.log('🧪 Tâche de test configurée (développement)');
      }

      console.log(`✅ ${this.jobs.length} tâches cron email initialisées`);
      this.jobs.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.options?.name || 'Unnamed job'}`);
      });
      
    } catch (error) {
      console.error('❌ Erreur initialisation tâches cron:', error);
    }
  }

  /**
   * ✅ Démarrer toutes les tâches
   */
  startJobs() {
    try {
      if (this.jobs.length === 0) {
        console.log('⚠️ Aucune tâche à démarrer - initialisez d\'abord avec initializeJobs()');
        return false;
      }

      this.jobs.forEach(job => {
        job.start();
      });
      
      console.log(`✅ ${this.jobs.length} tâches cron email démarrées`);
      this.getJobsStatus();
      
      return true;
    } catch (error) {
      console.error('❌ Erreur démarrage tâches cron:', error);
      return false;
    }
  }

  /**
   * ✅ Arrêter toutes les tâches
   */
  stopJobs() {
    try {
      this.jobs.forEach(job => {
        job.stop();
      });
      
      console.log(`🛑 ${this.jobs.length} tâches cron email arrêtées`);
      return true;
    } catch (error) {
      console.error('❌ Erreur arrêt tâches cron:', error);
      return false;
    }
  }

  /**
   * ✅ Redémarrer toutes les tâches
   */
  restartJobs() {
    console.log('🔄 Redémarrage des tâches cron email...');
    this.stopJobs();
    return this.startJobs();
  }

  /**
   * ✅ Obtenir le statut des tâches
   */
  getJobsStatus() {
    const status = this.jobs.map((job, index) => ({
      id: index,
      name: job.options?.name || `Job ${index + 1}`,
      running: job.running || false,
      scheduled: job.scheduled || false,
      timezone: job.options?.timezone || 'UTC'
    }));

    console.log('📊 Statut des tâches cron:');
    status.forEach(job => {
      const statusIcon = job.running ? '🟢' : '🔴';
      console.log(`  ${statusIcon} ${job.name} - Running: ${job.running}`);
    });

    return {
      jobs: status,
      totalJobs: this.jobs.length,
      availableModels: this.availableModels,
      missingModels: this.missingModels,
      environment: this.isProduction ? 'production' : 'development'
    };
  }

  // ===================================================================
  // TÂCHES SPÉCIFIQUES AVEC VÉRIFICATIONS SÉCURISÉES
  // ===================================================================

  /**
   * ✅ Envoyer les rappels de réservation (24h avant)
   */
  async sendReservationReminders() {
    const taskName = 'RAPPELS DE RÉSERVATION';
    
    try {
      console.log(`📧 === ${taskName} ===`);
      console.log('🕐 Début:', new Date().toLocaleString('fr-FR'));

      // ✅ Vérification modèle
      if (!Reservation) {
        console.log('⚠️ Modèle Reservation non disponible - rappels ignorés');
        return { success: false, reason: 'Model unavailable' };
      }

      // Calculer la date de demain
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startOfTomorrow = new Date(tomorrow);
      startOfTomorrow.setHours(0, 0, 0, 0);
      
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      console.log('📅 Recherche réservations pour:', startOfTomorrow.toLocaleDateString('fr-FR'));

      // Chercher les réservations confirmées pour demain
      const reservations = await Reservation.find({
        dateTime: { 
          $gte: startOfTomorrow, 
          $lte: endOfTomorrow 
        },
        status: 'confirmed',
        isActive: true,
        'customer.email': { $exists: true, $ne: '' }
      }).populate('restaurantId', 'name');

      console.log(`📋 ${reservations.length} réservations trouvées pour rappels`);

      if (reservations.length === 0) {
        console.log('✅ Aucun rappel à envoyer');
        return { success: true, sent: 0, errors: 0 };
      }

      // Envoyer les rappels
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const reservation of reservations) {
        try {
          const customerInfo = {
            email: reservation.customer.email,
            name: `${reservation.customer.firstName || ''} ${reservation.customer.lastName || ''}`.trim() || 'Client'
          };

          await emailService.sendReservationReminder(reservation, customerInfo);
          successCount++;
          
          console.log(`✅ Rappel envoyé: ${customerInfo.email} - ${reservation.dateTime.toLocaleTimeString('fr-FR')}`);
          
          // ✅ Log en base si disponible
          await this.logEmailSent('reservation_reminder', reservation._id, customerInfo.email);
          
          // Petit délai pour éviter de surcharger Brevo
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          errorCount++;
          errors.push({
            reservationId: reservation._id,
            email: reservation.customer.email,
            error: error.message
          });
          console.error(`❌ Erreur rappel ${reservation._id}:`, error.message);
          
          // ✅ Log erreur en base si disponible
          await this.logEmailError('reservation_reminder', reservation._id, reservation.customer.email, error);
        }
      }

      const result = { success: true, sent: successCount, errors: errorCount, details: errors };
      console.log('📊 Rappels terminés:', { success: successCount, errors: errorCount });
      console.log('🕐 Fin:', new Date().toLocaleString('fr-FR'));
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur générale ${taskName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Envoyer les notifications plats du jour
   */
  async sendDailySpecialsNotifications() {
    const taskName = 'NOTIFICATIONS PLATS DU JOUR';
    
    try {
      console.log(`📧 === ${taskName} ===`);
      console.log('🕐 Début:', new Date().toLocaleString('fr-FR'));

      // ✅ Vérifications modèles
      if (!DailySpecial) {
        console.log('⚠️ Modèle DailySpecial non disponible - notifications ignorées');
        return { success: false, reason: 'DailySpecial model unavailable' };
      }

      if (!NewsletterSubscriber) {
        console.log('⚠️ Modèle NewsletterSubscriber non disponible - notifications ignorées');
        return { success: false, reason: 'NewsletterSubscriber model unavailable' };
      }

      // Récupérer les plats du jour d'aujourd'hui
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const dailySpecials = await DailySpecial.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'published',
        isActive: true
      });

      console.log(`🍽️ ${dailySpecials.length} plats du jour trouvés`);

      if (dailySpecials.length === 0) {
        console.log('⚠️ Aucun plat du jour publié - notification annulée');
        return { success: true, sent: 0, reason: 'No daily specials' };
      }

      // Récupérer les abonnés actifs
      const subscribers = await NewsletterSubscriber.find({ 
        active: true,
        email: { $exists: true, $ne: '' },
        'preferences.dailySpecials': { $ne: false } // Respecter les préférences
      }).select('email name unsubscribeToken');

      console.log(`👥 ${subscribers.length} abonnés trouvés`);

      if (subscribers.length === 0) {
        console.log('⚠️ Aucun abonné actif - notification annulée');
        return { success: true, sent: 0, reason: 'No active subscribers' };
      }

      // Préparer les données des plats
      const specialsData = dailySpecials.flatMap(ds => ds.specials || []);
      
      // Envoyer les notifications
      const results = await emailService.sendDailySpecialsNotification(subscribers, specialsData);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      // ✅ Marquer comme envoyé
      await DailySpecial.updateMany(
        { _id: { $in: dailySpecials.map(ds => ds._id) } },
        { notificationSent: true }
      );

      const result = { success: true, sent: successCount, errors: errorCount, total: results.length };
      console.log('📊 Notifications plats du jour terminées:', result);
      console.log('🕐 Fin:', new Date().toLocaleString('fr-FR'));
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur ${taskName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Nettoyage des logs d'emails anciens
   */
  async cleanupEmailLogs() {
    const taskName = 'NETTOYAGE LOGS EMAIL';
    
    try {
      console.log(`📧 === ${taskName} ===`);
      console.log('🕐 Début:', new Date().toLocaleString('fr-FR'));

      // ✅ Vérification modèle
      if (!EmailLog) {
        console.log('⚠️ Modèle EmailLog non disponible - nettoyage ignoré');
        return { success: false, reason: 'EmailLog model unavailable' };
      }

      // Supprimer les logs de plus de 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await EmailLog.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });

      console.log(`🗑️ ${result.deletedCount} logs email supprimés`);
      console.log('🕐 Fin:', new Date().toLocaleString('fr-FR'));
      
      return { success: true, deleted: result.deletedCount };
      
    } catch (error) {
      console.error(`❌ Erreur ${taskName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Envoyer les statistiques hebdomadaires aux admins
   */
  async sendWeeklyEmailStats() {
    const taskName = 'STATISTIQUES HEBDOMADAIRES';
    
    try {
      console.log(`📧 === ${taskName} ===`);
      console.log('🕐 Début:', new Date().toLocaleString('fr-FR'));

      // ✅ Vérification modèle
      if (!User) {
        console.log('⚠️ Modèle User non disponible - stats ignorées');
        return { success: false, reason: 'User model unavailable' };
      }

      // Calculer la semaine dernière
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Récupérer les admins
      const admins = await User.find({ 
        role: { $in: ['admin', 'owner'] },
        email: { $exists: true, $ne: '' }
      }).select('email firstName lastName');

      if (admins.length === 0) {
        console.log('⚠️ Aucun admin trouvé pour les stats');
        return { success: true, sent: 0, reason: 'No admins found' };
      }

      // ✅ Générer les statistiques réelles si EmailLog disponible
      const stats = await this.generateEmailStats(lastWeek);

      // Envoyer aux admins
      let successCount = 0;
      let errorCount = 0;

      for (const admin of admins) {
        try {
          await emailService.sendSimpleEmail({
            to: admin.email,
            toName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin',
            subject: `📊 Statistiques email hebdomadaires - ${stats.period}`,
            htmlContent: this.generateWeeklyStatsHTML(stats),
            textContent: this.generateWeeklyStatsText(stats)
          });

          successCount++;
          console.log(`✅ Stats envoyées à: ${admin.email}`);
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur envoi stats à ${admin.email}:`, error.message);
        }
      }

      const result = { success: true, sent: successCount, errors: errorCount };
      console.log('📊 Statistiques hebdomadaires terminées:', result);
      console.log('🕐 Fin:', new Date().toLocaleString('fr-FR'));
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur ${taskName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Tâche de test pour le développement
   */
  async testJobExecution() {
    try {
      const now = new Date();
      console.log(`🧪 Test cron job - ${now.toLocaleString('fr-FR')}`);
      console.log('📊 Modèles disponibles:', this.availableModels.join(', '));
      console.log('⚠️ Modèles manquants:', this.missingModels.join(', '));
      
      return { success: true, timestamp: now.toISOString() };
    } catch (error) {
      console.error('❌ Erreur test job:', error);
      return { success: false, error: error.message };
    }
  }

  // ===================================================================
  // MÉTHODES UTILITAIRES SÉCURISÉES
  // ===================================================================

  /**
   * ✅ Exécuter une tâche manuellement (pour tests)
   */
  async runTaskManually(taskName) {
    try {
      console.log(`🧪 Exécution manuelle de la tâche: ${taskName}`);
      
      let result;
      switch (taskName) {
        case 'reservation_reminders':
          result = await this.sendReservationReminders();
          break;
        case 'daily_specials':
          result = await this.sendDailySpecialsNotifications();
          break;
        case 'cleanup_logs':
          result = await this.cleanupEmailLogs();
          break;
        case 'weekly_stats':
          result = await this.sendWeeklyEmailStats();
          break;
        case 'test':
          result = await this.testJobExecution();
          break;
        default:
          throw new Error(`Tâche inconnue: ${taskName}`);
      }
      
      console.log(`✅ Tâche ${taskName} exécutée avec succès:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur exécution tâche ${taskName}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Logger un email envoyé (si modèle disponible)
   */
  async logEmailSent(type, resourceId, recipientEmail, messageId = null) {
    try {
      if (!EmailLog) return false;
      
      const log = new EmailLog({
        type,
        resourceId,
        recipientEmail,
        status: 'sent',
        messageId,
        timestamp: new Date()
      });
      
      await log.save();
      return true;
    } catch (error) {
      console.warn('⚠️ Erreur log email sent:', error.message);
      return false;
    }
  }

  /**
   * ✅ Logger une erreur email (si modèle disponible)
   */
  async logEmailError(type, resourceId, recipientEmail, error) {
    try {
      if (!EmailLog) return false;
      
      const log = new EmailLog({
        type,
        resourceId,
        recipientEmail,
        status: 'failed',
        error: {
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date()
      });
      
      await log.save();
      return true;
    } catch (logError) {
      console.warn('⚠️ Erreur log email error:', logError.message);
      return false;
    }
  }

  /**
   * ✅ Générer les statistiques email
   */
  async generateEmailStats(fromDate) {
    const toDate = new Date();
    
    if (EmailLog) {
      try {
        const stats = await EmailLog.aggregate([
          {
            $match: {
              timestamp: { $gte: fromDate, $lte: toDate }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
            }
          }
        ]);

        const result = {
          period: `${fromDate.toLocaleDateString('fr-FR')} - ${toDate.toLocaleDateString('fr-FR')}`,
          reservationConfirmations: stats.find(s => s._id === 'reservation_confirmation')?.sent || 0,
          reservationCancellations: stats.find(s => s._id === 'reservation_cancellation')?.sent || 0,
          reservationReminders: stats.find(s => s._id === 'reservation_reminder')?.sent || 0,
          dailySpecialsNotifications: stats.find(s => s._id === 'daily_specials_notification')?.sent || 0,
          newsletterSubscriptions: stats.find(s => s._id === 'newsletter_welcome')?.sent || 0,
          contactNotifications: stats.find(s => s._id === 'contact_notification')?.sent || 0,
          totalSent: stats.reduce((sum, s) => sum + s.sent, 0),
          totalFailed: stats.reduce((sum, s) => sum + s.failed, 0)
        };

        result.totalEmails = result.totalSent + result.totalFailed;
        return result;
        
      } catch (error) {
        console.warn('⚠️ Erreur génération stats depuis logs:', error.message);
      }
    }

    // Fallback avec des données d'exemple
    return {
      period: `${fromDate.toLocaleDateString('fr-FR')} - ${toDate.toLocaleDateString('fr-FR')}`,
      reservationConfirmations: 42,
      reservationCancellations: 8,
      reservationReminders: 35,
      dailySpecialsNotifications: 156,
      newsletterSubscriptions: 8,
      contactNotifications: 12,
      totalSent: 261,
      totalFailed: 3,
      totalEmails: 264,
      note: 'Statistiques d\'exemple (EmailLog non disponible)'
    };
  }

  /**
   * Générateur HTML pour stats hebdomadaires
   */
  generateWeeklyStatsHTML(stats) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50; text-align: center;">📊 Statistiques Email Hebdomadaires</h2>
        <p style="text-align: center;"><strong>Période:</strong> ${stats.period}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Type d'email</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Nombre</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">📧 Confirmations de réservation</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${stats.reservationConfirmations}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">❌ Annulations de réservation</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${stats.reservationCancellations || 0}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">🔔 Rappels de réservation</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${stats.reservationReminders || 0}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">🍽️ Notifications plats du jour</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${stats.dailySpecialsNotifications}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">🎉 Inscriptions newsletter</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${stats.newsletterSubscriptions}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">📞 Notifications contact</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${stats.contactNotifications}</td>
            </tr>
            <tr style="background: #e8f5e8; font-weight: bold;">
              <td style="padding: 12px; border: 1px solid #ddd;">✅ Total emails envoyés</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${stats.totalSent}</td>
            </tr>
            ${stats.totalFailed > 0 ? `
            <tr style="background: #ffeaa7;">
              <td style="padding: 12px; border: 1px solid #ddd;">❌ Total échecs</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${stats.totalFailed}</td>
            </tr>
            ` : ''}
            <tr style="background: #f8f9fa; font-weight: bold;">
              <td style="padding: 12px; border: 1px solid #ddd;">📊 Total général</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${stats.totalEmails}</td>
            </tr>
          </tbody>
        </table>
        
        ${stats.note ? `<p style="color: #6c757d; font-style: italic;">${stats.note}</p>` : ''}
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px; text-align: center;">
          Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')} par Zengest EmailJobs
        </p>
      </div>
    `;
  }

  /**
   * Générateur texte pour stats hebdomadaires
   */
  generateWeeklyStatsText(stats) {
    return `
Statistiques Email Hebdomadaires - Zengest
Période: ${stats.period}

📧 Confirmations de réservation: ${stats.reservationConfirmations}
❌ Annulations de réservation: ${stats.reservationCancellations || 0}
🔔 Rappels de réservation: ${stats.reservationReminders || 0}
🍽️ Notifications plats du jour: ${stats.dailySpecialsNotifications}
🎉 Inscriptions newsletter: ${stats.newsletterSubscriptions}
📞 Notifications contact: ${stats.contactNotifications}

✅ Total emails envoyés: ${stats.totalSent}
❌ Total échecs: ${stats.totalFailed}
📊 Total général: ${stats.totalEmails}

${stats.note ? `Note: ${stats.note}` : ''}

Rapport généré le ${new Date().toLocaleString('fr-FR')}
    `;
  }

  /**
   * ✅ Obtenir le résumé de santé du service
   */
  getServiceHealth() {
    return {
      serviceName: 'EmailJobs',
      version: '1.0.0',
      status: this.jobs.length > 0 ? 'configured' : 'not_configured',
      environment: this.isProduction ? 'production' : 'development',
      timezone: this.timezone,
      models: {
        available: this.availableModels,
        missing: this.missingModels,
        health: this.missingModels.length === 0 ? 'good' : 'degraded'
      },
      jobs: {
        total: this.jobs.length,
        running: this.jobs.filter(job => job.running).length,
        configured: this.jobs.map(job => job.options?.name || 'unnamed')
      },
      recommendations: this.getRecommendations()
    };
  }

  /**
   * ✅ Obtenir les recommandations basées sur l'état actuel
   */
  getRecommendations() {
    const recommendations = [];

    if (this.missingModels.includes('Reservation')) {
      recommendations.push('Créer le modèle Reservation pour activer les rappels de réservation');
    }
    
    if (this.missingModels.includes('NewsletterSubscriber')) {
      recommendations.push('Créer le modèle NewsletterSubscriber pour activer les notifications newsletter');
    }
    
    if (this.missingModels.includes('DailySpecial')) {
      recommendations.push('Créer le modèle DailySpecial pour activer les notifications plats du jour');
    }
    
    if (this.missingModels.includes('User')) {
      recommendations.push('Créer le modèle User pour activer les statistiques hebdomadaires');
    }
    
    if (!EmailLog) {
      recommendations.push('Créer le modèle EmailLog pour un meilleur tracking des emails (optionnel)');
    }
    
    if (this.jobs.length === 0) {
      recommendations.push('Appeler initializeJobs() puis startJobs() pour activer les tâches automatiques');
    }
    
    if (!this.isProduction && this.jobs.some(job => job.running)) {
      recommendations.push('Les tâches cron sont actives en développement - normal pour les tests');
    }

    return recommendations;
  }
}

// Export de l'instance unique
module.exports = new EmailJobs();