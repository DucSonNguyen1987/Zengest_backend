require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config/config');
const { USER_ROLES } = require('./src/utils/constants');
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');

const seedData = async () => {
  try {
    console.log('🚀 Démarrage de l\'initialisation des données...');
    
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('✅ Connexion MongoDB réussie');
    
    // Vérifier et nettoyer les données existantes
    console.log('🔍 Vérification des données existantes...');
    const existingUsers = await User.countDocuments();
    const existingRestaurants = await Restaurant.countDocuments();
    
    console.log(`Utilisateurs existants: ${existingUsers}`);
    console.log(`Restaurants existants: ${existingRestaurants}`);
    
    if (existingUsers > 0 || existingRestaurants > 0) {
      console.log('🗑️  Suppression des données existantes...');
      await User.deleteMany({});
      await Restaurant.deleteMany({});
      console.log('✅ Données existantes supprimées');
    }
    
    // 1. Créer l'utilisateur admin
    console.log('👤 Création de l\'utilisateur admin...');
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Système',
      email: 'admin@zengest.com',
      password: 'Admin123!',
      role: USER_ROLES.ADMIN,
      phone: '+33123456789',
      isActive: true,
      preferences: {
        language: 'fr',
        timezone: 'Europe/Paris',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      }
    });
    console.log('✅ Admin créé:', adminUser.email);
    
    // 2. Créer le restaurant
    console.log('🏢 Création du restaurant...');
    const restaurant = await Restaurant.create({
      name: 'Le Bistrot de Zengest',
      description: 'Un restaurant de démonstration pour tester l\'application Zengest',
      address: {
        street: '123 Rue de la Paix',
        city: 'Paris',
        zipCode: '75001',
        country: 'France'
      },
      contact: {
        phone: '+33140123456',
        email: 'contact@bistrot-zengest.com',
        website: 'https://bistrot-zengest.com'
      },
      cuisine: ['française', 'bistrot'],
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
        parking: false,
        terrace: true,
        delivery: false,
        takeaway: true,
        reservations: true,
        creditCards: true,
        accessibility: true
      },
      owner: adminUser._id,
      isActive: true,
      subscriptionPlan: 'premium'
    });
    console.log('✅ Restaurant créé:', restaurant.name);
    
    // 3. Créer les utilisateurs du restaurant
    console.log('👥 Création des utilisateurs du restaurant...');
    
    const owner = await User.create({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'owner@bistrot-zengest.com',
      password: 'Owner123!',
      role: USER_ROLES.OWNER,
      phone: '+33140987654',
      restaurantId: restaurant._id,
      isActive: true
    });
    console.log('✅ Propriétaire créé:', owner.email);
    
    const manager = await User.create({
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'manager@bistrot-zengest.com',
      password: 'Manager123!',
      role: USER_ROLES.MANAGER,
      phone: '+33140555666',
      restaurantId: restaurant._id,
      isActive: true
    });
    console.log('✅ Manager créé:', manager.email);
    
    const staffBar = await User.create({
      firstName: 'Pierre',
      lastName: 'Leroy',
      email: 'pierre.bar@bistrot-zengest.com',
      password: 'Staff123!',
      role: USER_ROLES.STAFF_BAR,
      phone: '+33140111222',
      restaurantId: restaurant._id,
      isActive: true
    });
    console.log('✅ Staff bar créé:', staffBar.email);
    
    const staffFloor = await User.create({
      firstName: 'Sophie',
      lastName: 'Bernard',
      email: 'sophie.salle@bistrot-zengest.com',
      password: 'Staff123!',
      role: USER_ROLES.STAFF_FLOOR,
      phone: '+33140333444',
      restaurantId: restaurant._id,
      isActive: true
    });
    console.log('✅ Staff salle créé:', staffFloor.email);
    
    const staffKitchen = await User.create({
      firstName: 'Paul',
      lastName: 'Roux',
      email: 'paul.cuisine@bistrot-zengest.com',
      password: 'Staff123!',
      role: USER_ROLES.STAFF_KITCHEN,
      phone: '+33140555777',
      restaurantId: restaurant._id,
      isActive: true
    });
    console.log('✅ Staff cuisine créé:', staffKitchen.email);
    
    // Vérification finale
    const finalUserCount = await User.countDocuments();
    const finalRestaurantCount = await Restaurant.countDocuments();
    
    console.log('\n🎉 Initialisation terminée avec succès !');
    console.log(`📊 Total utilisateurs créés: ${finalUserCount}`);
    console.log(`📊 Total restaurants créés: ${finalRestaurantCount}`);
    
    console.log('\n📋 Comptes créés :');
    console.log('👤 Admin: admin@zengest.com / Admin123!');
    console.log('🏢 Propriétaire: owner@bistrot-zengest.com / Owner123!');
    console.log('👔 Manager: manager@bistrot-zengest.com / Manager123!');
    console.log('🍸 Staff Bar: pierre.bar@bistrot-zengest.com / Staff123!');
    console.log('🍽️  Staff Salle: sophie.salle@bistrot-zengest.com / Staff123!');
    console.log('👨‍🍳 Staff Cuisine: paul.cuisine@bistrot-zengest.com / Staff123!');
    
    console.log('\n🔗 Testez votre API:');
    console.log('Health check: http://localhost:3000/api/health');
    console.log('Login: POST http://localhost:3000/api/auth/login');
    
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

// Lancer le script si exécuté directement
if (require.main === module) {
  console.log('🎬 Lancement du script d\'initialisation...');
  seedData();
}

module.exports = seedData;