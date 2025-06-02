require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { USER_ROLES } = require('../utils/constants');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const FloorPlan = require('../models/FloorPlan');
const MenuItem = require('../models/Menu');

// Fonction pour créer les items du menu
const createMenuItems = async (restaurantId, managerId) => {
  const menuItems = [
    // PLATS PRINCIPAUX
    { name: 'Poulet "Crousti-Crousti"', description: 'Poulet croustillant, purée maison, sweet chili sauce', category: 'mains', priceVariants: [{ size: 'portion', price: 14, isDefault: true }] },
    { name: 'Tartare de Bœuf', description: 'Tartare de bœuf à notre façon, servi avec frites maison', category: 'mains', priceVariants: [{ size: 'portion', price: 21, isDefault: true }] },
    { name: 'Pavé de Bœuf', description: 'Pavé de bœuf sauce béarnaise, servi avec frites maison', category: 'mains', priceVariants: [{ size: 'portion', price: 15, isDefault: true }] },
    { name: 'Cheese Burger', description: 'Potato bun, cheddar affiné 9 mois, oignons confits, sauce secrète', category: 'mains', priceVariants: [{ size: 'portion', price: 17.5, isDefault: true }] },
    { name: 'Bacon Cheese Burger', description: 'Cheddar affiné 9 mois, oignons confits, sauce secrète, bacon', category: 'mains', priceVariants: [{ size: 'portion', price: 16, isDefault: true }] },
    { name: 'Saumon Laqué Teriyaki', description: 'Saumon "Label Rouge", sauce sriracha & riz du dragon', category: 'mains', priceVariants: [{ size: 'portion', price: 15, isDefault: true }] },
    { name: 'Dahl de Lentilles', description: 'Dahl de lentilles, riz du dragon', category: 'mains', priceVariants: [{ size: 'portion', price: 13, isDefault: true }], dietary: { isVegan: true, isVegetarian: true } },
    { name: 'Veggie Burger', description: 'Halloumi, portobello et frites de patates douces', category: 'mains', priceVariants: [{ size: 'portion', price: 15, isDefault: true }], dietary: { isVegetarian: true } },
    
    // SALADES
    { name: 'Salade Chinoise', description: 'Poulet snacké, maki au concombre, Shanghai sauce', category: 'salads', priceVariants: [{ size: 'portion', price: 15, isDefault: true }] },
    { name: 'Salade Avocat Quinoa Halloumi', description: 'Avocat, quinoa, halloumi rôti aux herbes', category: 'salads', priceVariants: [{ size: 'portion', price: 15, isDefault: true }], dietary: { isVegetarian: true } },
    { name: 'Salade Avocat Quinoa Poulet', description: 'Avocat, quinoa, poulet mariné au miel d\'épices & sésame', category: 'salads', priceVariants: [{ size: 'portion', price: 15, isDefault: true }] },
    { name: 'Chirashi Bowl Saumon', description: 'Saumon "Label Rouge", riz vinaigré, avocat & sauce ponzu', category: 'salads', priceVariants: [{ size: 'portion', price: 16.5, isDefault: true }] },
    
    // ENTRÉES
    { name: 'Houmous', description: 'Huile au piment d\'Alep, pita maison', category: 'appetizers', priceVariants: [{ size: 'portion', price: 8, isDefault: true }], dietary: { isVegan: true, isVegetarian: true } },
    { name: 'Straciatella', description: 'Huile vierge, poires rôties, romarin et pain grillé', category: 'appetizers', priceVariants: [{ size: 'portion', price: 10, isDefault: true }], dietary: { isVegetarian: true } },
    { name: 'Assiette de Charcuterie', description: 'Jambon de pays, coppa, chorizo, saucisson sec', category: 'appetizers', priceVariants: [{ size: 'assiette', price: 17, isDefault: true }] },
    { name: 'Falafels', description: 'Sauce yaourt citron / tahini', category: 'appetizers', priceVariants: [{ size: 'portion', price: 8, isDefault: true }], dietary: { isVegan: true, isVegetarian: true } },
    
    // ACCOMPAGNEMENTS
    { name: 'Frites Homemade', description: 'Frites maison cuites en 2 cuissons', category: 'sides', priceVariants: [{ size: 'portion', price: 5, isDefault: true }], dietary: { isVegan: true, isVegetarian: true } },
    { name: 'Sweet Potatoes', description: 'Frites de patates douces', category: 'sides', priceVariants: [{ size: 'portion', price: 6, isDefault: true }], dietary: { isVegan: true, isVegetarian: true } },
    
    // DESSERTS
    { name: 'Cookie Choco-Noisettes', description: 'Cookie maison chocolat et noisettes', category: 'desserts', priceVariants: [{ size: 'simple', price: 4, isDefault: true }], dietary: { isVegetarian: true } },
    { name: 'Tiramisu', description: 'Tiramisu maison', category: 'desserts', priceVariants: [{ size: 'portion', price: 6, isDefault: true }], dietary: { isVegetarian: true } },
    { name: 'Riz au Lait Vanillé', description: 'Caramel beurre salé, spéculoos', category: 'desserts', priceVariants: [{ size: 'portion', price: 7, isDefault: true }], dietary: { isVegetarian: true } },
    
    // FROMAGES
    { name: 'Comté Affiné 18 mois', description: 'Comté affiné 18 mois', category: 'cheeses', priceVariants: [{ size: 'portion', price: 6, isDefault: true }], dietary: { isVegetarian: true } },
    { name: 'Saint Nectaire Fermier', description: 'Saint Nectaire fermier', category: 'cheeses', priceVariants: [{ size: 'portion', price: 6, isDefault: true }], dietary: { isVegetarian: true } },
    
    // VINS ROUGES
    { name: 'Côtes de Bordeaux "Pirouette"', description: 'Château Les Vieux Moulins (Bio)', category: 'wines_red', priceVariants: [{ size: '12.5cl', price: 5, isDefault: false }, { size: '35cl', price: 11, isDefault: true }, { size: '75cl', price: 22, isDefault: false }], dietary: { isOrganic: true } },
    { name: 'Bourgueil "Trinch"', description: 'Catherine & Pierre Breton (Bio)', category: 'wines_red', priceVariants: [{ size: '35cl', price: 15, isDefault: true }, { size: '75cl', price: 30, isDefault: false }], dietary: { isOrganic: true } },
    
    // VINS BLANCS
    { name: 'Côteaux de Vendômois', description: 'Domaine du Four à Chaux - Chenin', category: 'wines_white', priceVariants: [{ size: '35cl', price: 11, isDefault: true }, { size: '75cl', price: 22, isDefault: false }] },
    { name: 'Menetou-Salon "Remoortere"', description: 'Sauvignon (Bio)', category: 'wines_white', priceVariants: [{ size: '35cl', price: 17, isDefault: true }, { size: '75cl', price: 34, isDefault: false }], dietary: { isOrganic: true } },
    
    // COCKTAILS
    { name: 'Bramble', description: 'London Dry Gin, crème de mûre, citron vert, simple sirop', category: 'cocktails', priceVariants: [{ size: '25cl', price: 10, isDefault: true }] },
    { name: 'Basil Smash', description: 'Gin, basilic, citron vert, simple sirop', category: 'cocktails', priceVariants: [{ size: '25cl', price: 10, isDefault: true }] },
    { name: 'Expresso Martini', description: 'Vodka, liqueur de café, shot d\'espresso, simple sirop', category: 'cocktails', priceVariants: [{ size: '25cl', price: 11, isDefault: true }] },
    { name: 'Negroni Classico', description: 'Gin, Campari, Vermouth Otto\'s', category: 'cocktails', priceVariants: [{ size: '25cl', price: 11, isDefault: true }] },
    
    // MOCKTAILS
    { name: 'Sweet Berry', description: 'Vermouth Otto\'s, crème de framboise, Perrier, citron vert', category: 'mocktails', priceVariants: [{ size: '25cl', price: 10, isDefault: true }] },
    { name: 'Ginger Mojito', description: 'Ginger beer, menthe, citron vert, sucre', category: 'mocktails', priceVariants: [{ size: '25cl', price: 7, isDefault: true }] },
    
    // BIÈRES
    { name: 'Stella Artois', description: 'Bière blonde belge', category: 'beers', priceVariants: [{ size: '25cl', price: 4, isDefault: true }, { size: '50cl', price: 6.5, isDefault: false }] },
    { name: 'Demory Blanche', description: 'Bière blanche artisanale', category: 'beers', priceVariants: [{ size: '25cl', price: 5, isDefault: true }] },
    { name: 'Brewdog Punk I.P.A', description: 'IPA artisanale', category: 'beers', priceVariants: [{ size: '33cl', price: 9, isDefault: true }] }
  ];

  let created = 0;
  console.log(`   📋 Création de ${menuItems.length} items de menu...`);
  
  for (let i = 0; i < menuItems.length; i++) {
    try {
      const itemData = {
        ...menuItems[i],
        restaurantId,
        createdBy: managerId,
        displayOrder: i + 1,
        isActive: true,
        availability: { isAvailable: true },
        dietary: menuItems[i].dietary || { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false },
        tags: menuItems[i].tags || []
      };
      
      await MenuItem.create(itemData);
      created++;
    } catch (error) {
      console.error(`   ❌ Erreur pour "${menuItems[i].name}":`, error.message);
    }
  }
  
  console.log(`   ✅ ${created} items de menu créés avec succès`);
  return created;
};

const seedData = async () => {
  try {
    console.log('🚀 Démarrage de l\'initialisation complète des données...');
    
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
    const existingMenuItems = await MenuItem.countDocuments();
    
    console.log(`Utilisateurs existants: ${existingUsers}`);
    console.log(`Restaurants existants: ${existingRestaurants}`);
    console.log(`Plans de salle existants: ${existingFloorPlans}`);
    console.log(`Items de menu existants: ${existingMenuItems}`);
    
    if (existingUsers > 0 || existingRestaurants > 0 || existingFloorPlans > 0 || existingMenuItems > 0) {
      console.log('🗑️  Suppression des données existantes...');
      await MenuItem.deleteMany({});
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
        { number: '1', capacity: 2, shape: 'round', position: { x: 200, y: 150 }, rotation: 0, dimensions: { width: 80, height: 80 }, status: 'available' },
        { number: '2', capacity: 2, shape: 'round', position: { x: 350, y: 150 }, rotation: 0, dimensions: { width: 80, height: 80 }, status: 'available' },
        { number: '3', capacity: 4, shape: 'square', position: { x: 500, y: 150 }, rotation: 0, dimensions: { width: 120, height: 120 }, status: 'occupied' },
        { number: '4', capacity: 4, shape: 'square', position: { x: 700, y: 150 }, rotation: 0, dimensions: { width: 120, height: 120 }, status: 'reserved' },
        { number: '5', capacity: 6, shape: 'rectangle', position: { x: 200, y: 350 }, rotation: 0, dimensions: { width: 180, height: 90 }, status: 'available' }
      ],
      obstacles: [
        { type: 'wall', name: 'Mur principal', position: { x: 0, y: 0 }, dimensions: { width: 1200, height: 20 }, rotation: 0, color: '#8B4513', isWalkable: false },
        { type: 'entrance', name: 'Entrée principale', position: { x: 550, y: 0 }, dimensions: { width: 100, height: 20 }, rotation: 0, color: '#4CAF50', isWalkable: true }
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
        { number: 'T1', capacity: 2, shape: 'round', position: { x: 150, y: 150 }, rotation: 0, dimensions: { width: 80, height: 80 }, status: 'available' },
        { number: 'T2', capacity: 4, shape: 'square', position: { x: 300, y: 150 }, rotation: 0, dimensions: { width: 120, height: 120 }, status: 'available' }
      ],
      obstacles: [
        { type: 'wall', name: 'Barrière terrasse', position: { x: 0, y: 0 }, dimensions: { width: 800, height: 15 }, rotation: 0, color: '#8BC34A', isWalkable: false }
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
    
    // 5. Créer le menu
    console.log('\n🍽️  Création du menu basé sur la carte Pause Café...');
    const menuItemsCreated = await createMenuItems(restaurant._id, manager._id);
    
    // Vérification finale
    const finalUserCount = await User.countDocuments();
    const finalRestaurantCount = await Restaurant.countDocuments();
    const finalFloorPlanCount = await FloorPlan.countDocuments();
    const finalMenuItemCount = await MenuItem.countDocuments();
    
    console.log('\n🎉 Initialisation complète terminée avec succès !');
    console.log(`📊 Total utilisateurs créés: ${finalUserCount}`);
    console.log(`📊 Total restaurants créés: ${finalRestaurantCount}`);
    console.log(`📊 Total plans de salle créés: ${finalFloorPlanCount}`);
    console.log(`📊 Total items de menu créés: ${finalMenuItemCount}`);
    
    // Afficher quelques statistiques du menu
    const menuStats = await MenuItem.aggregate([
      { $match: { restaurantId: restaurant._id } },
      { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$basePrice' } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Répartition du menu par catégorie:');
    menuStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} items (prix moyen: ${stat.avgPrice.toFixed(2)}€)`);
    });
    
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
    console.log('Menu complet: GET http://localhost:3000/api/menu');
    console.log('Recherche menu: GET http://localhost:3000/api/menu/search?q=burger');
    console.log('Catégories: GET http://localhost:3000/api/menu/categories');
    
    await mongoose.connection.close();
    console.log('\n✅ Initialisation terminée !');
    
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
  console.log('🎬 Lancement du script d\'initialisation complète...');
  seedData();
}

module.exports = seedData;