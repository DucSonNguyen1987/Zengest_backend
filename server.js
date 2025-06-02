require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/database');
const config = require('./src/config/config');
const ReservationScheduler = require('./src/utils/reservationScheduler');
const { verifyEmailConfig } = require('./src/config/email');

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Connexion à la base de données
    await connectDB();
    
    // Vérification de la configuration email
    console.log('📧 Vérification de la configuration email...');
    const emailConfigValid = await verifyEmailConfig();
    if (emailConfigValid) {
      console.log('✅ Configuration email validée');
    } else {
      console.warn('⚠️  Configuration email invalide - notifications désactivées');
    }
    
    // Initialisation du planificateur de réservations
    if (process.env.ENABLE_CRON_JOBS === 'true') {
      console.log('⏰ Initialisation du planificateur de réservations...');
      try {
        await ReservationScheduler.initialize();
        ReservationScheduler.start();
        console.log('✅ Planificateur de réservations démarré');
      } catch (schedulerError) {
        console.error('⚠️  Erreur initialisation planificateur:', schedulerError.message);
        console.log('🔄 Le serveur continue sans les tâches automatisées');
      }
    } else {
      console.log('ℹ️  Planificateur de réservations désactivé (ENABLE_CRON_JOBS=false)');
    }
    
    // Démarrage du serveur HTTP
    const PORT = config.port;
    const server = app.listen(PORT, () => {
      console.log(`
🚀 Serveur Restaurant Backend démarré !
📍 Mode: ${config.nodeEnv}
🌐 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/api/health
📚 API Base: http://localhost:${PORT}/api
📧 Emails: ${emailConfigValid ? '✅ Configuré' : '❌ Non configuré'}
⏰ Cron Jobs: ${process.env.ENABLE_CRON_JOBS === 'true' ? '✅ Actif' : '❌ Désactivé'}

🎯 Nouvelles fonctionnalités disponibles:
   📋 Réservations: http://localhost:${PORT}/api/reservations
   📧 Notifications: http://localhost:${PORT}/api/notifications
   📈 Docs complètes: http://localhost:${PORT}/api/docs
      `);
      
      // Affichage des tâches automatisées actives
      if (process.env.ENABLE_CRON_JOBS === 'true' && ReservationScheduler.isInitialized) {
        console.log('⏰ Tâches automatisées actives:');
        console.log('   • Rappels quotidiens (10h00)');
        console.log('   • Nettoyage données (02h00)');
        console.log('   • Détection no-shows (toutes les heures)');
        console.log('   • Libération tables (toutes les 15min)');
        console.log('   • Statistiques hebdomadaires (lundi 09h00)');
      }
      
      // Message de configuration email
      if (emailConfigValid) {
        console.log('📬 Notifications email prêtes:');
        console.log('   • Confirmations de réservation');
        console.log('   • Rappels automatiques');
        console.log('   • Notifications d\'annulation');
      } else {
        console.log('💡 Pour activer les emails:');
        console.log('   • Configurez EMAIL_USER et EMAIL_PASSWORD dans .env');
        console.log('   • Testez avec: POST /api/notifications/test');
      }
    });
    
    // Gestion de l'arrêt propre du serveur
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Signal ${signal} reçu. Arrêt propre du serveur...`);
      
      // Arrêter les jobs planifiés en premier
      if (process.env.ENABLE_CRON_JOBS === 'true' && ReservationScheduler.isInitialized) {
        console.log('⏹️  Arrêt du planificateur de réservations...');
        try {
          ReservationScheduler.stop();
          console.log('✅ Planificateur arrêté proprement');
        } catch (error) {
          console.error('⚠️  Erreur arrêt planificateur:', error.message);
        }
      }
      
      // Arrêter le serveur HTTP
      server.close(async () => {
        console.log('🔌 Serveur HTTP fermé');
        
        // Fermer la connexion MongoDB
        try {
          const mongoose = require('mongoose');
          if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🗄️  Connexion MongoDB fermée');
          }
        } catch (error) {
          console.error('⚠️  Erreur fermeture MongoDB:', error.message);
        }
        
        console.log('👋 Arrêt complet du serveur');
        process.exit(0);
      });
      
      // Force l'arrêt après 30 secondes si le serveur ne répond pas
      setTimeout(() => {
        console.error('⚠️  Arrêt forcé après 30 secondes');
        process.exit(1);
      }, 30000);
    };
    
    // Écoute des signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Gestion des erreurs de serveur
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${PORT} est déjà utilisé`);
        console.log('💡 Suggestions:');
        console.log(`   • Changez le port dans .env: PORT=3001`);
        console.log(`   • Arrêtez le processus utilisant le port: lsof -ti:${PORT} | xargs kill`);
      } else {
        console.error('❌ Erreur serveur:', error.message);
      }
      process.exit(1);
    });
    
    return server;
    
  } catch (error) {
    console.error('💥 Erreur lors du démarrage du serveur:', error);
    
    // Affichage d'aide selon le type d'erreur
    if (error.message.includes('ECONNREFUSED') && error.message.includes('MongoDB')) {
      console.log('\n💡 Problème de connexion MongoDB:');
      console.log('   • Vérifiez que MongoDB est démarré');
      console.log('   • Vérifiez MONGODB_URI dans .env');
      console.log('   • Commande: mongod --dbpath /data/db');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Problème de réseau:');
      console.log('   • Vérifiez votre connexion internet');
      console.log('   • Vérifiez les URLs dans la configuration');
    }
    
    process.exit(1);
  }
};

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err, promise) => {
  console.error('🚨 Erreur non gérée détectée:');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('Promise:', promise);
  
  // En développement, on peut être plus verbeux
  if (config.nodeEnv === 'development') {
    console.error('Détails complets:', err);
  }
  
  // En production, arrêt propre
  if (config.nodeEnv === 'production') {
    console.log('🔄 Redémarrage recommandé en production');
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('🚨 Exception non gérée détectée:');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  
  // Arrêt immédiat pour les exceptions non gérées
  console.log('💥 Arrêt immédiat requis');
  process.exit(1);
});

// Gestion de la mémoire
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('⚠️  Avertissement: Trop d\'écouteurs d\'événements');
  } else {
    console.warn('⚠️  Avertissement Node.js:', warning.message);
  }
});

// Monitoring de la mémoire en développement
if (config.nodeEnv === 'development') {
  setInterval(() => {
    const used = process.memoryUsage();
    const memoryInfo = {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024)
    };
    
    // Alerte si utilisation mémoire > 500MB
    if (memoryInfo.heapUsed > 500) {
      console.warn('⚠️  Utilisation mémoire élevée:', memoryInfo);
    }
  }, 60000); // Vérification toutes les minutes
}

// Fonction utilitaire pour vérifier les prérequis
const checkPrerequisites = () => {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:');
    missing.forEach(varName => {
      console.error(`   • ${varName}`);
    });
    console.log('\n💡 Copiez .env.example vers .env et configurez ces variables');
    process.exit(1);
  }
  
  // Vérifications optionnelles avec avertissements
  const optionalVars = [
    { name: 'EMAIL_USER', feature: 'Notifications email' },
    { name: 'EMAIL_PASSWORD', feature: 'Notifications email' },
    { name: 'FRONTEND_URL', feature: 'CORS configuré' }
  ];
  
  optionalVars.forEach(({ name, feature }) => {
    if (!process.env[name]) {
      console.warn(`⚠️  ${name} non configuré - ${feature} désactivé`);
    }
  });
};

// Affichage des informations de version
const displayStartupInfo = () => {
  console.log('🏪 Zengest Restaurant Management System');
  console.log('📦 Version: 1.2.0');
  console.log(`📅 Démarrage: ${new Date().toLocaleString('fr-FR')}`);
  console.log(`🐛 Node.js: ${process.version}`);
  console.log(`💻 Plateforme: ${process.platform} (${process.arch})`);
  console.log(`🆔 PID: ${process.pid}`);
  console.log('─'.repeat(50));
};

// Point d'entrée principal
const main = async () => {
  try {
    // Affichage des informations de démarrage
    displayStartupInfo();
    
    // Vérification des prérequis
    console.log('🔍 Vérification des prérequis...');
    checkPrerequisites();
    console.log('✅ Prérequis validés');
    
    // Démarrage du serveur
    await startServer();
    
  } catch (error) {
    console.error('💥 Erreur dans main():', error.message);
    process.exit(1);
  }
};

// Démarrer l'application
main();