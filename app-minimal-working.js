const express = require('express');

const app = express();

console.log('í´ APP MINIMAL - Test Ã©tape par Ã©tape');

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

console.log('âœ… App minimal crÃ©Ã© sans erreur');

module.exports = app;
