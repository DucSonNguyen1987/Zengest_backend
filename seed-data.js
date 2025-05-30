require('dotenv').config();
const mongoose = require('mongoose');

// Import depuis la racine (éviter les problèmes de chemins relatifs)
const config = require('./src/config/config');
const { USER_ROLES } = require('./src/utils/constants');
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');

console.log('🔍 Vérifications avant démarrage:');
console.log('Config mongoUri:', !!config.mongoUri);
console.log('USER_ROLES disponibles:', Object.keys(USER_ROLES));
console.log('User type:', typeof User);
console.log('User.countDocuments disponible:', typeof User.countDocuments);

const seedData = async () => {
  try {
    console.log('\n🚀 Initialisation des données...');
    
    // Connexion MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connexion MongoDB réussie');
    
    // Nettoyage
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    console.log('✅ Données existantes supprimées');
    
    // Admin
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Système', 
      email: 'admin@zengest.com',
      password: 'Admin123!',
      role: USER_ROLES.ADMIN,
      phone: '+33123456789',
      isActive: true
    });
    console.log('✅ Admin créé:', admin.email);
    
    // Restaurant
    const restaurant = await Restaurant.create({
      name: 'Le Bistrot de Zengest',
      description: 'Restaurant de démonstration',
      address: {
        street: '123 Rue de la Paix',
        city: 'Paris',
        zipCode: '75001',
        country: 'France'
      },
      contact: {
        phone: '+33140123456',
        email: 'contact@bistrot-zengest.com'
      },
      cuisine: ['française'],
      priceRange: '€€',
      capacity: {
        seatingCapacity: 60,
        tablesCount: 15
      },
      hours: {
        monday: { open: '12:00', close: '14:30', closed: false },
        tuesday: { open: '12:00', close: '14:30', closed: false },
        wednesday: { open: '12:00', close: '14:30', closed: false },
        thursday: { open: '12:00', close: '14:30', closed: false },
        friday: { open: '12:00', close: '14:30', closed: false },
        saturday: { open: '19:00', close: '23:00', closed: false },
        sunday: { closed: true }
      },
      features: {
        wifi: true,
        terrace: true,
        reservations: true,
        creditCards: true
      },
      owner: admin._id,
      isActive: true
    });
    console.log('✅ Restaurant créé:', restaurant.name);
    
    // Utilisateurs du restaurant
    const users = [
      {
        firstName: 'Jean', lastName: 'Dupont',
        email: 'owner@bistrot-zengest.com',
        password: 'Owner123!', role: USER_ROLES.OWNER
      },
      {
        firstName: 'Marie', lastName: 'Martin', 
        email: 'manager@bistrot-zengest.com',
        password: 'Manager123!', role: USER_ROLES.MANAGER
      },
      {
        firstName: 'Pierre', lastName: 'Leroy',
        email: 'pierre.bar@bistrot-zengest.com', 
        password: 'Staff123!', role: USER_ROLES.STAFF_BAR
      },
      {
        firstName: 'Sophie', lastName: 'Bernard',
        email: 'sophie.salle@bistrot-zengest.com',
        password: 'Staff123!', role: USER_ROLES.STAFF_FLOOR  
      },
      {
        firstName: 'Paul', lastName: 'Roux',
        email: 'paul.cuisine@bistrot-zengest.com',
        password: 'Staff123!', role: USER_ROLES.STAFF_KITCHEN
      }
    ];
    
    for (const userData of users) {
      const user = await User.create({
        ...userData,
        restaurantId: restaurant._id,
        isActive: true
      });
      console.log('✅ Utilisateur créé:', user.email);
    }
    
    const finalCount = await User.countDocuments();
    console.log(`\n🎉 Terminé ! ${finalCount} utilisateurs créés`);
    
    console.log('\n📋 Comptes de test:');
    console.log('👤 Admin: admin@zengest.com / Admin123!');
    console.log('🏢 Owner: owner@bistrot-zengest.com / Owner123!');
    console.log('👔 Manager: manager@bistrot-zengest.com / Manager123!');
    console.log('🍸 Staff Bar: pierre.bar@bistrot-zengest.com / Staff123!');
    console.log('🍽️  Staff Salle: sophie.salle@bistrot-zengest.com / Staff123!');
    console.log('👨‍🍳 Staff Cuisine: paul.cuisine@bistrot-zengest.com / Staff123!');
    
    await mongoose.connection.close();
    console.log('\n✅ Initialisation terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedData();