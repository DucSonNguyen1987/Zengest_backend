require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

const cleanDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('🗑️ Nettoyage base de données...');
    
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`✅ Collection ${collection.collectionName} vidée`);
    }
    
    console.log('🎯 Base de données nettoyée');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

cleanDatabase();