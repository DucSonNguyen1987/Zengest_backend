// debug-server.js - Test minimal pour identifier le problème
console.log('🔍 DEBUT DU DIAGNOSTIC');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🐛 Node.js version:', process.version);
console.log('💻 Platform:', process.platform);

// Test 1: Chargement des modules critiques
console.log('\n📦 Test des modules...');
try {
  require('dotenv').config();
  console.log('✅ dotenv chargé');
  
  const express = require('express');
  console.log('✅ express chargé');
  
  const mongoose = require('mongoose');
  console.log('✅ mongoose chargé');
  
} catch (error) {
  console.error('❌ Erreur module:', error.message);
  process.exit(1);
}

// Test 2: Variables d'environnement
console.log('\n⚙️  Variables d\'environnement critiques:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Défini' : '❌ Manquant');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini' : '❌ Manquant');
console.log('PORT:', process.env.PORT || '3000 (défaut)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'non défini');

// Test 3: Connexion MongoDB (sans app.js)
console.log('\n🗄️  Test de connexion MongoDB...');
const mongoose = require('mongoose');

async function testMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ MongoDB connecté:', mongoose.connection.host);
    await mongoose.connection.close();
    console.log('✅ MongoDB déconnecté proprement');
  } catch (error) {
    console.error('❌ Erreur MongoDB:', error.message);
    return false;
  }
  return true;
}

// Test 4: Chargement de app.js
console.log('\n📱 Test de chargement app.js...');
async function testApp() {
  try {
    const app = require('./app');
    console.log('✅ app.js chargé sans erreur');
    
    // Test démarrage serveur
    const server = app.listen(3001, () => {
      console.log('✅ Serveur test sur port 3001');
      server.close(() => {
        console.log('✅ Serveur test fermé');
      });
    });
    
  } catch (error) {
    console.error('❌ Erreur app.js:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
  return true;
}

// Exécution des tests
async function runAllTests() {
  try {
    console.log('\n🧪 EXECUTION DES TESTS...');
    
    const mongoOK = await testMongoDB();
    const appOK = await testApp();
    
    console.log('\n📊 RESULTATS:');
    console.log('MongoDB:', mongoOK ? '✅' : '❌');
    console.log('App.js:', appOK ? '✅' : '❌');
    
    if (mongoOK && appOK) {
      console.log('\n🎉 Tous les tests passent !');
      console.log('💡 Le problème pourrait être dans server.js lui-même');
      console.log('🔧 Essayez: node --trace-warnings server.js');
    } else {
      console.log('\n🚨 Problèmes détectés - voir les erreurs ci-dessus');
    }
    
  } catch (error) {
    console.error('\n💥 ERREUR CRITIQUE:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n🏁 FIN DU DIAGNOSTIC');
  process.exit(0);
}

runAllTests();