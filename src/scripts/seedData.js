require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { USER_ROLES } = require('../utils/constants');
const User = require('../models/User.js');
const Restaurant = require('../models/Restaurant.js');
const FloorPlan = require('../models/FloorPlan.js');

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
    const existingFloorPlans = await FloorPlan.countDocuments();
    
    console.log(`Utilisateurs existants: ${existingUsers}`);
    console.log(`Restaurants existants: ${existingRestaurants}`);
    console.log(`Plans de salle existants: ${existingFloorPlans}`);
    
    if (existingUsers > 0 || existingRestaurants > 0 || existingFloorPlans > 0) {
      console.log('🗑️  Suppression des données existantes...');
      await FloorPlan.deleteMany({});
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
    
    // 4. Créer les plans de salle
    console.log('🗺️  Création des plans de salle...');
    
    // Plan principal - Rez-de-chaussée
    const mainFloorPlan = await FloorPlan.create({
      name: 'Rez-de-chaussée',
      description: 'Plan principal du restaurant avec la majorité des tables',
      restaurantId: restaurant._id,
      dimensions: {
        width: 1200,
        height: 800,
        unit: 'cm'
      },
      tables: [
  {
    number: '1',
    capacity: 2,
    shape: 'round',
    position: { x: 200, y: 150 },
    rotation: 0,
    dimensions: { width: 80, height: 80 },
    status: 'available' // CORRIGÉ: était 'available', maintenant cohérent
  },
  {
    number: '2',
    capacity: 2,
    shape: 'round',
    position: { x: 350, y: 150 },
    rotation: 0,
    dimensions: { width: 80, height: 80 },
    status: 'available'
  },
  {
    number: '3',
    capacity: 4,
    shape: 'square',
    position: { x: 500, y: 150 },
    rotation: 0,
    dimensions: { width: 120, height: 120 },
    status: 'occupied'
  },
  {
    number: '4',
    capacity: 4,
    shape: 'square',
    position: { x: 700, y: 150 },
    rotation: 0,
    dimensions: { width: 120, height: 120 },
    status: 'reserved'
  },
  {
    number: '5',
    capacity: 6,
    shape: 'rectangle',
    position: { x: 200, y: 350 },
    rotation: 0,
    dimensions: { width: 180, height: 90 },
    status: 'available'
  },
  {
    number: '6',
    capacity: 6,
    shape: 'rectangle',
    position: { x: 450, y: 350 },
    rotation: 0,
    dimensions: { width: 180, height: 90 },
    status: 'available'
  },
  {
    number: '7',
    capacity: 8,
    shape: 'oval',
    position: { x: 750, y: 350 },
    rotation: 0,
    dimensions: { width: 200, height: 120 },
    status: 'available'
  },
  {
    number: '8',
    capacity: 2,
    shape: 'round',
    position: { x: 200, y: 550 },
    rotation: 0,
    dimensions: { width: 80, height: 80 },
    status: 'cleaning'
  },
  {
    number: '9',
    capacity: 2,
    shape: 'round',
    position: { x: 350, y: 550 },
    rotation: 0,
    dimensions: { width: 80, height: 80 },
    status: 'available'
  },
  {
    number: '10',
    capacity: 4,
    shape: 'square',
    position: { x: 500, y: 550 },
    rotation: 0,
    dimensions: { width: 120, height: 120 },
    status: 'available'
  }
],
      obstacles: [
        {
          type: 'wall',
          name: 'Mur principal',
          position: { x: 0, y: 0 },
          dimensions: { width: 1200, height: 20 },
          rotation: 0,
          color: '#8B4513',
          isWalkable: false
        },
        {
          type: 'wall',
          name: 'Mur gauche',
          position: { x: 0, y: 0 },
          dimensions: { width: 20, height: 800 },
          rotation: 0,
          color: '#8B4513',
          isWalkable: false
        },
        {
          type: 'wall',
          name: 'Mur droit',
          position: { x: 1180, y: 0 },
          dimensions: { width: 20, height: 800 },
          rotation: 0,
          color: '#8B4513',
          isWalkable: false
        },
        {
          type: 'wall',
          name: 'Mur arrière',
          position: { x: 0, y: 780 },
          dimensions: { width: 1200, height: 20 },
          rotation: 0,
          color: '#8B4513',
          isWalkable: false
        },
        {
          type: 'entrance',
          name: 'Entrée principale',
          position: { x: 550, y: 0 },
          dimensions: { width: 100, height: 20 },
          rotation: 0,
          color: '#4CAF50',
          isWalkable: true
        },
        {
          type: 'kitchen_door',
          name: 'Porte cuisine',
          position: { x: 1100, y: 650 },
          dimensions: { width: 80, height: 20 },
          rotation: 0,
          color: '#FF9800',
          isWalkable: true
        },
        {
          type: 'bar',
          name: 'Comptoir bar',
          position: { x: 950, y: 100 },
          dimensions: { width: 200, height: 60 },
          rotation: 0,
          color: '#795548',
          isWalkable: false
        },
        {
          type: 'column',
          name: 'Colonne',
          position: { x: 600, y: 450 },
          dimensions: { width: 40, height: 40 },
          rotation: 0,
          color: '#9E9E9E',
          isWalkable: false
        }
      ],
      settings: {
        backgroundColor: '#F5F5F5',
        gridSize: 20,
        showGrid: true,
        snapToGrid: true
      },
      isActive: true,
      isDefault: true,
      createdBy: manager._id
    });
    console.log('✅ Plan principal créé:', mainFloorPlan.name);
    
    // Plan terrasse
    const terraceFloorPlan = await FloorPlan.create({
      name: 'Terrasse',
      description: 'Plan de la terrasse extérieure',
      restaurantId: restaurant._id,
      dimensions: {
        width: 800,
        height: 600,
        unit: 'cm'
      },
      tables: [
        {
          number: 'T1',
          capacity: 2,
          shape: 'round',
          position: { x: 150, y: 150 },
          rotation: 0,
          dimensions: { width: 80, height: 80 },
          status: 'available'
        },
        {
          number: 'T2',
          capacity: 2,
          shape: 'round',
          position: { x: 300, y: 150 },
          rotation: 0,
          dimensions: { width: 80, height: 80 },
          status: 'available'
        },
        {
          number: 'T3',
          capacity: 4,
          shape: 'square',
          position: { x: 450, y: 150 },
          rotation: 0,
          dimensions: { width: 120, height: 120 },
          status: 'available'
        },
        {
          number: 'T4',
          capacity: 4,
          shape: 'square',
          position: { x: 600, y: 150 },
          rotation: 0,
          dimensions: { width: 120, height: 120 },
          status: 'available'
        },
        {
          number: 'T5',
          capacity: 6,
          shape: 'rectangle',
          position: { x: 250, y: 350 },
          rotation: 0,
          dimensions: { width: 180, height: 90 },
          status: 'available'
        },
        {
          number: 'T6',
          capacity: 6,
          shape: 'rectangle',
          position: { x: 500, y: 350 },
          rotation: 0,
          dimensions: { width: 180, height: 90 },
          status: 'available'
        }
      ],
      obstacles: [
        {
          type: 'wall',
          name: 'Barrière terrasse',
          position: { x: 0, y: 0 },
          dimensions: { width: 800, height: 15 },
          rotation: 0,
          color: '#8BC34A',
          isWalkable: false
        },
        {
          type: 'wall',
          name: 'Barrière gauche',
          position: { x: 0, y: 0 },
          dimensions: { width: 15, height: 600 },
          rotation: 0,
          color: '#8BC34A',
          isWalkable: false
        },
        {
          type: 'wall',
          name: 'Barrière droite',
          position: { x: 785, y: 0 },
          dimensions: { width: 15, height: 600 },
          rotation: 0,
          color: '#8BC34A',
          isWalkable: false
        },
        {
          type: 'wall',
          name: 'Barrière arrière',
          position: { x: 0, y: 585 },
          dimensions: { width: 800, height: 15 },
          rotation: 0,
          color: '#8BC34A',
          isWalkable: false
        },
        {
          type: 'entrance',
          name: 'Accès terrasse',
          position: { x: 350, y: 0 },
          dimensions: { width: 100, height: 15 },
          rotation: 0,
          color: '#4CAF50',
          isWalkable: true
        },
        {
          type: 'decoration',
          name: 'Jardinière 1',
          position: { x: 100, y: 480 },
          dimensions: { width: 100, height: 50 },
          rotation: 0,
          color: '#4CAF50',
          isWalkable: false
        },
        {
          type: 'decoration',
          name: 'Jardinière 2',
          position: { x: 600, y: 480 },
          dimensions: { width: 100, height: 50 },
          rotation: 0,
          color: '#4CAF50',
          isWalkable: false
        }
      ],
      settings: {
        backgroundColor: '#E8F5E8',
        gridSize: 20,
        showGrid: true,
        snapToGrid: true
      },
      isActive: true,
      isDefault: false,
      createdBy: manager._id
    });
    console.log('✅ Plan terrasse créé:', terraceFloorPlan.name);
    
    // Vérification finale
    const finalUserCount = await User.countDocuments();
    const finalRestaurantCount = await Restaurant.countDocuments();
    const finalFloorPlanCount = await FloorPlan.countDocuments();
    
    console.log('\n🎉 Initialisation terminée avec succès !');
    console.log(`📊 Total utilisateurs créés: ${finalUserCount}`);
    console.log(`📊 Total restaurants créés: ${finalRestaurantCount}`);
    console.log(`📊 Total plans de salle créés: ${finalFloorPlanCount}`);
    
    console.log('\n📋 Comptes créés :');
    console.log('👤 Admin: admin@zengest.com / Admin123!');
    console.log('🏢 Propriétaire: owner@bistrot-zengest.com / Owner123!');
    console.log('👔 Manager: manager@bistrot-zengest.com / Manager123!');
    console.log('🍸 Staff Bar: pierre.bar@bistrot-zengest.com / Staff123!');
    console.log('🍽️  Staff Salle: sophie.salle@bistrot-zengest.com / Staff123!');
    console.log('👨‍🍳 Staff Cuisine: paul.cuisine@bistrot-zengest.com / Staff123!');
    
    console.log('\n🗺️  Plans de salle créés :');
    console.log(`📋 ${mainFloorPlan.name} (par défaut) - ${mainFloorPlan.tables.length} tables`);
    console.log(`📋 ${terraceFloorPlan.name} - ${terraceFloorPlan.tables.length} tables`);
    
    console.log('\n🔗 Testez votre API:');
    console.log('Health check: http://localhost:3000/api/health');
    console.log('Login: POST http://localhost:3000/api/auth/login');
    console.log('Plans de salle: GET http://localhost:3000/api/floor-plans');
    console.log('Plan par défaut: GET http://localhost:3000/api/floor-plans/default');
    
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