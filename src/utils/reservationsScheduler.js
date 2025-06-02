const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const FloorPlan = require('../models/FloorPlan');
const {
  sendReservationReminder,
  verifyEmailConfig
} = require('../config/email');

/**
 * Planificateur de tâches pour les réservations
 */
class ReservationScheduler {
  
  static isInitialized = false;
  static jobs = new Map();
  
  /**
   * Initialise tous les jobs planifiés
   */
  static async initialize() {
    if (this.isInitialized) {
      console.log('⚠️  Planificateur déjà initialisé');
      return;
    }
    
    console.log('🕐 Initialisation du planificateur de réservations...');
    
    // Vérifier la configuration email
    const emailConfigValid = await verifyEmailConfig();
    if (!emailConfigValid) {
      console.warn('⚠️  Configuration email invalide - certaines notifications seront désactivées');
    }
    
    // Job 1: Envoyer les rappels de réservation (tous les jours à 10h)
    this.jobs.set('dailyReminders', cron.schedule('0 10 * * *', async () => {
      if (emailConfigValid) {
        await this.sendDailyReminders();
      }
    }, {
      scheduled: false,
      timezone: 'Europe/Paris'
    }));
    
    // Job 2: Nettoyer les réservations expirées (tous les jours à 2h du matin)
    this.jobs.set('cleanupExpired', cron.schedule('0 2 * * *', async () => {
      await this.cleanupExpiredReservations();
    }, {
      scheduled: false,
      timezone: 'Europe/Paris'
    }));
    
    // Job 3: Marquer les no-shows (toutes les heures)
    this.jobs.set('markNoShows', cron.schedule('0 * * * *', async () => {
      await this.markNoShowReservations();
    }, {
      scheduled: false,
      timezone: 'Europe/Paris'
    }));
    
    // Job 4: Libérer les tables automatiquement (toutes les 15 minutes)
    this.jobs.set('autoReleaseTable', cron.schedule('*/15 * * * *', async () => {
      await this.autoReleaseCompletedTables();
    }, {
      scheduled: false,
      timezone: 'Europe/Paris'
    }));
    
    // Job 5: Statistiques hebdomadaires (tous les lundis à 9h)
    this.jobs.set('weeklyStats', cron.schedule('0 9 * * 1', async () => {
      await this.generateWeeklyStats();
    }, {
      scheduled: false,
      timezone: 'Europe/Paris'
    }));
    
    this.isInitialized = true;
    console.log('✅ Planificateur de réservations initialisé');
  }
  
  /**
   * Démarre tous les jobs
   */
  static start() {
    if (!this.isInitialized) {
      console.error('❌ Planificateur non initialisé');
      return;
    }
    
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`▶️  Job '${name}' démarré`);
    });
    
    console.log('🚀 Tous les jobs de réservation sont actifs');
  }
  
  /**
   * Arrête tous les jobs
   */
  static stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Job '${name}' arrêté`);
    });
    
    console.log('⏸️  Tous les jobs de réservation sont arrêtés');
  }
  
  /**
   * Envoie les rappels quotidiens pour les réservations de demain
   */
  static async sendDailyReminders() {
    try {
      console.log('📧 Début de l\'envoi des rappels quotidiens...');
      
      const reservationsNeedingReminder = await Reservation.findNeedingReminder();
      
      if (reservationsNeedingReminder.length === 0) {
        console.log('ℹ️  Aucune réservation nécessitant un rappel');
        return;
      }
      
      console.log(`📬 ${reservationsNeedingReminder.length} rappel(s) à envoyer`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const reservation of reservationsNeedingReminder) {
        try {
          const restaurant = reservation.restaurantId;
          const emailResult = await sendReservationReminder(reservation, restaurant);
          
          // Enregistrer le résultat
          reservation.addEmailLog('reminder', emailResult.success, emailResult.messageId);
          await reservation.save();
          
          if (emailResult.success) {
            successCount++;
            console.log(`✅ Rappel envoyé: ${reservation.reservationNumber} -> ${reservation.customer.email}`);
          } else {
            errorCount++;
            console.error(`❌ Échec rappel: ${reservation.reservationNumber} -> ${emailResult.error}`);
          }
          
          // Pause entre les emails pour éviter le spam
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur rappel ${reservation.reservationNumber}:`, error.message);
        }
      }
      
      console.log(`📊 Rappels terminés: ${successCount} succès, ${errorCount} erreurs`);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des rappels:', error);
    }
  }
  
  /**
   * Nettoie les réservations expirées
   */
  static async cleanupExpiredReservations() {
    try {
      console.log('🧹 Nettoyage des réservations expirées...');
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Marquer comme terminées les réservations anciennes encore en statut 'seated'
      const expiredSeated = await Reservation.updateMany(
        {
          status: 'seated',
          dateTime: { $lt: threeDaysAgo },
          isActive: true
        },
        {
          status: 'completed',
          'timestamps.completed': new Date()
        }
      );
      
      if (expiredSeated.modifiedCount > 0) {
        console.log(`✅ ${expiredSeated.modifiedCount} réservation(s) expirée(s) marquée(s) comme terminée(s)`);
      }
      
      // Archiver les très anciennes réservations (plus de 30 jours)
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      
      const archivedCount = await Reservation.updateMany(
        {
          dateTime: { $lt: oneMonthAgo },
          status: { $in: ['completed', 'cancelled', 'no_show'] },
          isActive: true
        },
        {
          isActive: false
        }
      );
      
      if (archivedCount.modifiedCount > 0) {
        console.log(`🗃️  ${archivedCount.modifiedCount} réservation(s) archivée(s)`);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
  
  /**
   * Marque automatiquement les no-shows
   */
  static async markNoShowReservations() {
    try {
      console.log('🔍 Vérification des no-shows...');
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
      
      // Chercher les réservations confirmées qui ont dépassé leur heure + 1h de grâce
      const potentialNoShows = await Reservation.find({
        status: 'confirmed',
        dateTime: { $lt: oneHourAgo },
        isActive: true
      });
      
      let noShowCount = 0;
      
      for (const reservation of potentialNoShows) {
        const graceEndTime = new Date(reservation.dateTime.getTime() + (60 * 60 * 1000)); // +1h de grâce
        
        if (now > graceEndTime) {
          reservation.status = 'no_show';
          reservation.timestamps.cancelled = now;
          
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
          
          await reservation.save();
          noShowCount++;
          
          console.log(`⌛ No-show marqué: ${reservation.reservationNumber} (${reservation.customer.name})`);
        }
      }
      
      if (noShowCount > 0) {
        console.log(`📊 ${noShowCount} no-show(s) marqué(s)`);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des no-shows:', error);
    }
  }
  
  /**
   * Libère automatiquement les tables des réservations terminées
   */
  static async autoReleaseCompletedTables() {
    try {
      console.log('🏁 Libération automatique des tables...');
      
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      
      // Chercher les réservations qui devraient être terminées
      const completableReservations = await Reservation.find({
        status: 'seated',
        isActive: true,
        $expr: {
          $lt: [
            { $add: ['$dateTime', { $multiply: ['$duration', 60000] }] },
            twoHoursAgo
          ]
        }
      });
      
      let releasedCount = 0;
      
      for (const reservation of completableReservations) {
        // Marquer comme terminée
        reservation.status = 'completed';
        reservation.timestamps.completed = now;
        
        // Libérer la table
        if (reservation.assignedTable?.floorPlanId && reservation.assignedTable?.tableId) {
          const floorPlan = await FloorPlan.findById(reservation.assignedTable.floorPlanId);
          if (floorPlan) {
            const table = floorPlan.tables.id(reservation.assignedTable.tableId);
            if (table) {
              table.status = 'cleaning';
              await floorPlan.save();
              releasedCount++;
            }
          }
        }
        
        await reservation.save();
        
        console.log(`🆓 Table libérée: ${reservation.reservationNumber} -> Table ${reservation.assignedTable?.tableNumber}`);
      }
      
      if (releasedCount > 0) {
        console.log(`📊 ${releasedCount} table(s) libérée(s) automatiquement`);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la libération des tables:', error);
    }
  }
  
  /**
   * Génère des statistiques hebdomadaires
   */
  static async generateWeeklyStats() {
    try {
      console.log('📈 Génération des statistiques hebdomadaires...');
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      const stats = await Reservation.aggregate([
        {
          $match: {
            dateTime: { $gte: oneWeekAgo },
            isActive: true
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            totalReservations: { $sum: 1 },
            confirmedReservations: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            completedReservations: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelledReservations: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            noShowReservations: {
              $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] }
            },
            totalGuests: { $sum: '$numberOfGuests' },
            avgGuestsPerReservation: { $avg: '$numberOfGuests' }
          }
        },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant'
          }
        },
        { $unwind: '$restaurant' }
      ]);
      
      console.log('📊 Statistiques de la semaine:');
      stats.forEach(stat => {
        const completionRate = stat.totalReservations > 0 
          ? ((stat.completedReservations / stat.totalReservations) * 100).toFixed(1)
          : 0;
        
        const noShowRate = stat.totalReservations > 0
          ? ((stat.noShowReservations / stat.totalReservations) * 100).toFixed(1)
          : 0;
        
        console.log(`
🏪 ${stat.restaurant.name}:
   📋 Total: ${stat.totalReservations} réservations
   ✅ Terminées: ${stat.completedReservations} (${completionRate}%)
   ❌ No-shows: ${stat.noShowReservations} (${noShowRate}%)
   👥 Total convives: ${stat.totalGuests}
   📊 Moyenne/réservation: ${stat.avgGuestsPerReservation.toFixed(1)} convives
        `);
      });
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération des statistiques:', error);
    }
  }
  
  /**
   * Exécute manuellement un job spécifique
   */
  static async runJob(jobName) {
    console.log(`🔧 Exécution manuelle du job: ${jobName}`);
    
    switch (jobName) {
      case 'dailyReminders':
        await this.sendDailyReminders();
        break;
      case 'cleanupExpired':
        await this.cleanupExpiredReservations();
        break;
      case 'markNoShows':
        await this.markNoShowReservations();
        break;
      case 'autoReleaseTable':
        await this.autoReleaseCompletedTables();
        break;
      case 'weeklyStats':
        await this.generateWeeklyStats();
        break;
      default:
        console.error(`❌ Job inconnu: ${jobName}`);
    }
  }
  
  /**
   * Obtient le statut de tous les jobs
   */
  static getJobsStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    return status;
  }
}

module.exports = ReservationScheduler;