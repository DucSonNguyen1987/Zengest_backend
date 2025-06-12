const express = require('express');

const app = express();

console.log('� APP MINIMAL - Test étape par étape');

// Middlewares de base seulement
app.use(express.json());

// Route de test simple
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API fonctionnelle - Version minimale',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ App minimal créé sans erreur');

module.exports = app;
