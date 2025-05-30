require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/database');
const config = require('./src/config/config');

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Connexion à la base de données
    await connectDB();
    
    // Démarrage du serveur
    const PORT = config.port;
    const server = app.listen(PORT, () => {
      console.log(`
🚀 Serveur Restaurant Backend démarré !
📍 Mode: ${config.nodeEnv}
🌐 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/api/health
📚 API Base: http://localhost:${PORT}/api
      `);
    });
    
    // Gestion de l'arrêt propre du serveur
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} reçu. Arrêt propre du serveur...`);
      server.close(() => {
        console.log('Serveur fermé.');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err, promise) => {
  console.error('Erreur non gérée détectée:', err.message);
  console.error('Promise rejetée:', promise);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Exception non gérée détectée:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Démarrer le serveur
startServer();