// app.js - VERSION PROGRESSIVE pour identifier la route problématique
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

console.log('🔍 DÉMARRAGE PROGRESSIF - Identification de la route problématique');

const app = express();

// === MIDDLEWARES DE BASE (fonctionnent) ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

console.log('✅ Middlewares de base installés');

// Route de test qui fonctionne
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API fonctionnelle - Version progressive',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

console.log('✅ Route de test /api/health installée');

// === CHARGEMENT PROGRESSIF DES ROUTES ===
console.log('\n📍 DÉBUT DU CHARGEMENT DES ROUTES...');

// Route 1: Auth (la plus simple)
try {
  console.log('📁 1/8 Chargement src/routes/auth.js...');
  const authRoutes = require('./src/routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ 1/8 Routes AUTH chargées avec succès');
} catch (error) {
  console.error('❌ 1/8 ERREUR routes AUTH:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: AUTH');
  process.exit(1);
}

// Route 2: Users
try {
  console.log('📁 2/8 Chargement src/routes/users.js...');
  const userRoutes = require('./src/routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ 2/8 Routes USERS chargées avec succès');
} catch (error) {
  console.error('❌ 2/8 ERREUR routes USERS:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: USERS');
  process.exit(1);
}

// Route 3: Restaurants
try {
  console.log('📁 3/8 Chargement src/routes/restaurants.js...');
  const restaurantRoutes = require('./src/routes/restaurants');
  app.use('/api/restaurants', restaurantRoutes);
  console.log('✅ 3/8 Routes RESTAURANTS chargées avec succès');
} catch (error) {
  console.error('❌ 3/8 ERREUR routes RESTAURANTS:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: RESTAURANTS');
  process.exit(1);
}

// Route 4: FloorPlans
try {
  console.log('📁 4/8 Chargement src/routes/floorplans.js...');
  const floorPlanRoutes = require('./src/routes/floorplans');
  app.use('/api/floorplans', floorPlanRoutes);
  console.log('✅ 4/8 Routes FLOORPLANS chargées avec succès');
} catch (error) {
  console.error('❌ 4/8 ERREUR routes FLOORPLANS:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: FLOORPLANS');
  process.exit(1);
}

// Route 5: Menu
try {
  console.log('📁 5/8 Chargement src/routes/menu.js...');
  const menuRoutes = require('./src/routes/menu');
  app.use('/api/menu', menuRoutes);
  console.log('✅ 5/8 Routes MENU chargées avec succès');
} catch (error) {
  console.error('❌ 5/8 ERREUR routes MENU:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: MENU');
  process.exit(1);
}

// Route 6: Orders (suspecte)
try {
  console.log('📁 6/8 Chargement src/routes/orders.js...');
  const orderRoutes = require('./src/routes/orders');
  app.use('/api/orders', orderRoutes);
  console.log('✅ 6/8 Routes ORDERS chargées avec succès');
} catch (error) {
  console.error('❌ 6/8 ERREUR routes ORDERS:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: ORDERS');
  process.exit(1);
}

// Route 7: Reservations (mode debug temporaire vu précédemment)
try {
  console.log('📁 7/8 Chargement src/routes/reservations.js...');
  const reservationRoutes = require('./src/routes/reservations');
  app.use('/api/reservations', reservationRoutes);
  console.log('✅ 7/8 Routes RESERVATIONS chargées avec succès');
} catch (error) {
  console.error('❌ 7/8 ERREUR routes RESERVATIONS:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: RESERVATIONS');
  process.exit(1);
}

// Route 8: Notifications
try {
  console.log('📁 8/8 Chargement src/routes/notifications.js...');
  const notificationRoutes = require('./src/routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  console.log('✅ 8/8 Routes NOTIFICATIONS chargées avec succès');
} catch (error) {
  console.error('❌ 8/8 ERREUR routes NOTIFICATIONS:', error.message);
  console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  console.log('🛑 ROUTE PROBLÉMATIQUE IDENTIFIÉE: NOTIFICATIONS');
  process.exit(1);
}

console.log('\n🎉 TOUTES LES ROUTES CHARGÉES AVEC SUCCÈS !');
console.log('✨ L\'application est complètement fonctionnelle');

// Middleware de gestion d'erreur global
app.use((error, req, res, next) => {
  console.error('🚨 ERREUR GLOBALE:', error.message);
  console.error('Stack:', error.stack);
  
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée`
  });
});

console.log('✅ Middlewares de fin installés');

module.exports = app;