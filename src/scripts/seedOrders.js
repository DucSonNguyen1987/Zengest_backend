require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { USER_ROLES, ORDER_STATUS } = require('../utils/constants');
const Order = require('../models/Order');
const MenuItem = require('../models/Menu');
const FloorPlan = require('../models/FloorPlan');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Données fictives pour les commandes de test
const sampleCustomers = [
  { name: 'Jean Dupont', phone: '+33123456789', numberOfGuests: 2 },
  { name: 'Marie Martin', phone: '+33987654321', numberOfGuests: 4 },
  { name: 'Pierre Leroy', phone: '+33555123456', numberOfGuests: 1 },
  { name: 'Sophie Bernard', phone: '+33777888999', numberOfGuests: 3 },
  { name: 'Paul Roux', phone: '+33444555666', numberOfGuests: 6 },
  { name: 'Claire Dubois', phone: '+33222333444', numberOfGuests: 2 },
  { name: 'Michel Blanc', phone: '+33111222333', numberOfGuests: 5 },
  { name: 'Anne Petit', phone: '+33666777888', numberOfGuests: 2 }
];

const orderNotes = [
  'Table près de la fenêtre si possible',
  'Allergique aux fruits de mer',
  'Anniversaire - dessert surprise',
  'Pas trop épicé svp',
  'Cuisson bien cuite pour la viande',
  'Client régulier - VIP',
  'Commande rapide - RDV dans 1h',
  ''
];

const itemNotes = [
  'Sans oignons',
  'Sauce à part',
  'Bien cuit',
  'Légèrement épicé',
  'Extra fromage',
  'Sans gluten si possible',
  '',
  ''
];

const seedOrders = async () => {
  try {
    console.log('🚀 Initialisation des données de commandes...');
    
    // Connexion MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connexion MongoDB réussie');
    
    // Récupérer les données nécessaires
    const restaurant = await Restaurant.findOne({ name: 'Le Bistrot de Zengest' });
    if (!restaurant) {
      throw new Error('Restaurant "Le Bistrot de Zengest" non trouvé. Lancez d\'abord le script seedData.js');
    }
    
    const floorPlan = await FloorPlan.findOne({ 
      restaurantId: restaurant._id, 
      isDefault: true 
    });
    if (!floorPlan) {
      throw new Error('Plan de salle par défaut non trouvé.');
    }
    
    const menuItems = await MenuItem.find({ 
      restaurantId: restaurant._id, 
      isActive: true 
    }).limit(20);
    if (menuItems.length === 0) {
      throw new Error('Aucun item de menu trouvé. Lancez d\'abord le script seedMenu.js');
    }
    
    const servers = await User.find({ 
      restaurantId: restaurant._id,
      role: { $in: [USER_ROLES.STAFF_FLOOR, USER_ROLES.STAFF_BAR, USER_ROLES.MANAGER] },
      isActive: true
    });
    
    console.log(`✅ Données récupérées:`);
    console.log(`   Restaurant: ${restaurant.name}`);
    console.log(`   Plan de salle: ${floorPlan.name}`);
    console.log(`   Items de menu: ${menuItems.length}`);
    console.log(`   Serveurs: ${servers.length}`);
    console.log(`   Tables disponibles: ${floorPlan.tables.length}`);
    
    // Supprimer les commandes existantes
    const existingOrders = await Order.countDocuments({ restaurantId: restaurant._id });
    if (existingOrders > 0) {
      console.log(`🗑️  Suppression de ${existingOrders} commandes existantes...`);
      await Order.deleteMany({ restaurantId: restaurant._id });
    }
    
    console.log('\n📋 Création des commandes de test...');
    
    const ordersToCreate = [];
    const numberOfOrders = 15; // Nombre de commandes à créer
    
    for (let i = 0; i < numberOfOrders; i++) {
      try {
        // Sélectionner une table aléatoire
        const randomTable = floorPlan.tables[Math.floor(Math.random() * floorPlan.tables.length)];
        
        // Sélectionner un client aléatoire
        const customer = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
        
        // Ajuster le nombre de convives selon la capacité de la table
        const adjustedCustomer = {
          ...customer,
          numberOfGuests: Math.min(customer.numberOfGuests, randomTable.capacity)
        };
        
        // Sélectionner des items aléatoires (1 à 4 items par commande)
        const itemsCount = Math.floor(Math.random() * 4) + 1;
        const selectedItems = [];
        
        for (let j = 0; j < itemsCount; j++) {
          const randomMenuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          const randomVariant = randomMenuItem.priceVariants[
            Math.floor(Math.random() * randomMenuItem.priceVariants.length)
          ];
          const quantity = Math.floor(Math.random() * 3) + 1;
          
          const orderItem = {
            menuItem: randomMenuItem._id,
            menuItemSnapshot: {
              name: randomMenuItem.name,
              description: randomMenuItem.description,
              category: randomMenuItem.category,
              basePrice: randomMenuItem.basePrice
            },
            selectedVariant: {
              size: randomVariant.size,
              price: randomVariant.price
            },
            quantity,
            unitPrice: randomVariant.price,
            totalPrice: randomVariant.price * quantity,
            notes: itemNotes[Math.floor(Math.random() * itemNotes.length)],
            modifications: Math.random() > 0.7 ? ['Modification spéciale'] : [],
            status: 'pending'
          };
          
          selectedItems.push(orderItem);
        }
        
        // Calculer les prix
        const subtotal = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const taxRate = 20;
        const taxAmount = (subtotal * taxRate) / 100;
        const serviceRate = Math.random() > 0.7 ? 10 : 0; // 30% de chance d'avoir du service
        const serviceAmount = (subtotal * serviceRate) / 100;
        const total = subtotal + taxAmount + serviceAmount;
        
        // Sélectionner un serveur aléatoire
        const assignedServer = servers[Math.floor(Math.random() * servers.length)];
        
        // Créer différents statuts pour simulation
        const statuses = [
          ORDER_STATUS.PENDING,
          ORDER_STATUS.CONFIRMED,
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.READY,
          ORDER_STATUS.SERVED,
          ORDER_STATUS.PAID
        ];
        
        // Les premières commandes sont plus avancées dans le processus
        let orderStatus;
        if (i < 3) {
          orderStatus = ORDER_STATUS.PAID; // Commandes terminées
        } else if (i < 6) {
          orderStatus = ORDER_STATUS.SERVED; // Commandes servies
        } else if (i < 9) {
          orderStatus = statuses[Math.floor(Math.random() * 4) + 1]; // En cours
        } else {
          orderStatus = ORDER_STATUS.PENDING; // Nouvelles commandes
        }
        
        // Définir les timestamps selon le statut
        const now = new Date();
        const orderedTime = new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000); // 0-4h ago
        
        const timestamps = {
          ordered: orderedTime
        };
        
        if ([ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.SERVED, ORDER_STATUS.PAID].includes(orderStatus)) {
          timestamps.confirmed = new Date(orderedTime.getTime() + 5 * 60 * 1000); // +5min
        }
        if ([ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.SERVED, ORDER_STATUS.PAID].includes(orderStatus)) {
          timestamps.preparing = new Date(orderedTime.getTime() + 10 * 60 * 1000); // +10min
        }
        if ([ORDER_STATUS.READY, ORDER_STATUS.SERVED, ORDER_STATUS.PAID].includes(orderStatus)) {
          timestamps.ready = new Date(orderedTime.getTime() + 25 * 60 * 1000); // +25min
        }
        if ([ORDER_STATUS.SERVED, ORDER_STATUS.PAID].includes(orderStatus)) {
          timestamps.served = new Date(orderedTime.getTime() + 30 * 60 * 1000); // +30min
        }
        if (orderStatus === ORDER_STATUS.PAID) {
          timestamps.paid = new Date(orderedTime.getTime() + 60 * 60 * 1000); // +1h
        }
        
        // Définir le paiement pour les commandes payées
        const payment = orderStatus === ORDER_STATUS.PAID ? {
          method: ['cash', 'card', 'mobile'][Math.floor(Math.random() * 3)],
          status: 'paid',
          reference: `PAY_${Date.now()}_${i}`
        } : {
          method: 'card',
          status: 'pending'
        };
        
        // Données de la commande
        const orderData = {
          restaurantId: restaurant._id,
          floorPlanId: floorPlan._id,
          tableId: randomTable._id,
          tableSnapshot: {
            number: randomTable.number,
            capacity: randomTable.capacity
          },
          items: selectedItems,
          customer: adjustedCustomer,
          status: orderStatus,
          pricing: {
            subtotal: Number(subtotal.toFixed(2)),
            tax: {
              rate: taxRate,
              amount: Number(taxAmount.toFixed(2))
            },
            service: {
              rate: serviceRate,
              amount: Number(serviceAmount.toFixed(2))
            },
            discount: {
              type: 'percentage',
              value: 0,
              amount: 0
            },
            total: Number(total.toFixed(2))
          },
          timestamps,
          notes: orderNotes[Math.floor(Math.random() * orderNotes.length)],
          service: {
            assignedServer: assignedServer._id,
            estimatedTime: Math.floor(Math.random() * 30) + 15, // 15-45 min
            priority: ['low', 'normal', 'high'][Math.floor(Math.random() * 3)]
          },
          payment,
          metadata: {
            source: ['tablet', 'pos', 'mobile'][Math.floor(Math.random() * 3)],
            language: 'fr',
            version: 1
          },
          createdBy: assignedServer._id,
          isActive: true
        };
        
        ordersToCreate.push(orderData);
        
      } catch (error) {
        console.error(`   ❌ Erreur pour la commande ${i + 1}:`, error.message);
      }
    }
    
    // Créer toutes les commandes
    console.log(`\n💾 Création de ${ordersToCreate.length} commandes...`);
    
    let created = 0;
    for (const orderData of ordersToCreate) {
      try {
        const order = await Order.create(orderData);
        console.log(`   ✅ Commande ${order.orderNumber} créée (${order.status} - ${order.pricing.total}€)`);
        created++;
      } catch (error) {
        console.error(`   ❌ Erreur création commande:`, error.message);
      }
    }
    
    // Mettre à jour les statuts des tables
    console.log('\n🏢 Mise à jour des statuts de tables...');
    const activeOrders = await Order.find({
      restaurantId: restaurant._id,
      status: { $nin: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED] }
    });
    
    // Marquer les tables comme occupées si elles ont des commandes actives
    const occupiedTableIds = [...new Set(activeOrders.map(order => order.tableId.toString()))];
    
    floorPlan.tables.forEach(table => {
      if (occupiedTableIds.includes(table._id.toString())) {
        table.status = 'occupied';
      } else {
        table.status = 'available';
      }
    });
    
    await floorPlan.save();
    console.log(`   ✅ ${occupiedTableIds.length} tables marquées comme occupées`);
    
    // Statistiques finales
    const finalStats = await Order.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }
      }
    ]);
    
    const totalRevenue = await Order.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.total' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n🎉 Initialisation des commandes terminée !');
    console.log(`📊 ${created} commandes créées avec succès`);
    
    if (totalRevenue[0]) {
      console.log(`💰 Chiffre d'affaires total: ${totalRevenue[0].total.toFixed(2)}€`);
      console.log(`📈 Panier moyen: ${(totalRevenue[0].total / totalRevenue[0].count).toFixed(2)}€`);
    }
    
    console.log('\n📊 Répartition par statut:');
    finalStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} commandes (${stat.totalRevenue.toFixed(2)}€)`);
    });
    
    // Tests automatiques
    console.log('\n🧪 Tests automatiques...');
    
    // Test 1: Vérifier les calculs
    const orderToTest = await Order.findOne({ restaurantId: restaurant._id }).populate('items.menuItem');
    if (orderToTest) {
      const manualTotal = orderToTest.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const calculatedSubtotal = orderToTest.pricing.subtotal;
      
      if (Math.abs(manualTotal - calculatedSubtotal) < 0.01) {
        console.log('   ✅ Calculs de prix corrects');
      } else {
        console.log(`   ❌ Erreur de calcul: manuel=${manualTotal}, calculé=${calculatedSubtotal}`);
      }
    }
    
    // Test 2: Vérifier les contraintes de table
    const capacityViolations = await Order.find({
      restaurantId: restaurant._id,
      $expr: { $gt: ['$customer.numberOfGuests', '$tableSnapshot.capacity'] }
    });
    
    if (capacityViolations.length === 0) {
      console.log('   ✅ Contraintes de capacité respectées');
    } else {
      console.log(`   ❌ ${capacityViolations.length} violations de capacité détectées`);
    }
    
    console.log('\n🔗 Testez votre API Orders:');
    console.log('Commandes actives: GET http://localhost:3000/api/orders/active');
    console.log('Toutes les commandes: GET http://localhost:3000/api/orders');
    console.log('Statistiques: GET http://localhost:3000/api/orders/statistics/summary');
    console.log('Par table: GET http://localhost:3000/api/orders/table/{planId}/{tableId}');
    console.log('Script de test: npm run test:orders');
    
    await mongoose.connection.close();
    console.log('\n✅ Script terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    console.error('Stack:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

// Lancer le script si exécuté directement
if (require.main === module) {
  console.log('🎬 Lancement du script de création des commandes...');
  seedOrders();
}

module.exports = seedOrders;