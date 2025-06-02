require('dotenv').config();
const path = require('path');

console.log('🔍 Debug du script seedData.js');
console.log('Current working directory:', process.cwd());
console.log('Script path:', __filename);
console.log('Script directory:', __dirname);

// Test des chemins relatifs
console.log('\n📁 Test des chemins:');
console.log('Config path:', path.resolve(__dirname, '../config/config.js'));
console.log('Constants path:', path.resolve(__dirname, '../utils/constants.js'));
console.log('User model path:', path.resolve(__dirname, '../models/User.js'));

// Test des imports un par un
console.log('\n🧪 Test des imports:');

try {
  console.log('1. Test config...');
  const config = require('../config/config');
  console.log('✅ Config importé, mongoUri définie:', !!config.mongoUri);
} catch (e) {
  console.error('❌ Erreur config:', e.message);
}

try {
  console.log('2. Test constants...');
  const { USER_ROLES } = require('../utils/constants');
  console.log('✅ Constants importées, roles:', Object.keys(USER_ROLES));
} catch (e) {
  console.error('❌ Erreur constants:', e.message);
}

try {
  console.log('3. Test modèle User...');
  const User = require('../models/User');
  console.log('✅ User importé, type:', typeof User);
  console.log('User constructor:', User.constructor.name);
  console.log('User.countDocuments exists:', typeof User.countDocuments);
  
  if (User.schema) {
    console.log('✅ User a un schema Mongoose');
  } else {
    console.error('❌ User n\'a pas de schema Mongoose');
  }
} catch (e) {
  console.error('❌ Erreur User model:', e.message);
  console.error('Stack:', e.stack);
}

try {
  console.log('4. Test modèle Restaurant...');
  const Restaurant = require('../models/Restaurant');
  console.log('✅ Restaurant importé, type:', typeof Restaurant);
  console.log('Restaurant.countDocuments exists:', typeof Restaurant.countDocuments);
} catch (e) {
  console.error('❌ Erreur Restaurant model:', e.message);
}

console.log('\n🎯 Résumé du debug terminé');