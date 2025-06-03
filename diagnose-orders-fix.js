require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔧 Diagnostic et correction route /api/orders\n');

const diagnoseAndFixOrders = async () => {
  try {
    // Étape 1: Connexion à la base pour vérifier les données
    console.log('🔗 Connexion MongoDB...');
    const config = require('./src/config/config');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connexion réussie');

    // Étape 2: Vérifier l'état de l'admin
    const User = require('./src/models/User');
    const Restaurant = require('./src/models/Restaurant');
    const Order = require('./src/models/Order');

    console.log('\n👤 Vérification admin...');
    const admin = await User.findOne({ email: 'admin@zengest.com' }).populate('restaurantId');
    console.log('Admin trouvé:', admin?.firstName, admin?.lastName);
    console.log('Restaurant assigné:', admin?.restaurantId?.name || '❌ AUCUN');

    // Étape 3: Si admin sans restaurant, le corriger
    if (!admin?.restaurantId) {
      console.log('\n🔧 Correction: Assignment restaurant à admin...');
      const firstRestaurant = await Restaurant.findOne();
      if (firstRestaurant) {
        admin.restaurantId = firstRestaurant._id;
        await admin.save();
        console.log('✅ Restaurant assigné:', firstRestaurant.name);
      } else {
        console.log('❌ Aucun restaurant trouvé, exécutez: npm run seed');
        return;
      }
    }

    // Étape 4: Vérifier les commandes
    console.log('\n📋 Vérification commandes...');
    const orderCount = await Order.countDocuments();
    console.log('Nombre de commandes:', orderCount);

    if (orderCount === 0) {
      console.log('⚠️ Aucune commande, création de données test...');
      console.log('💡 Exécutez: npm run seed:orders');
    } else {
      // Tester la requête qui pose problème
      console.log('\n🧪 Test requête orders problématique...');
      try {
        // Simuler la requête de getAllOrders
        const page = 1;
        const limit = 10;
        const sortBy = 'timestamps.ordered';
        const sortOrder = 'desc';

        const query = Order.find()
          .populate('items.menuItem', 'name category price')
          .populate('assignedServer', 'firstName lastName')
          .populate('restaurantId', 'name')
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .limit(limit)
          .skip((page - 1) * limit);

        const orders = await query.exec();
        console.log('✅ Requête orders réussie');
        console.log('📊 Résultats:', orders.length, 'commandes');

        const total = await Order.countDocuments();
        console.log('📈 Total:', total);

      } catch (queryError) {
        console.error('❌ Erreur requête orders:', queryError.message);
        console.log('🔍 Stack:', queryError.stack);
      }
    }

    // Étape 5: Test API direct
    console.log('\n🌐 Test API direct...');
    
    try {
      const API_BASE = 'http://localhost:3000/api';
      
      // Connexion
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@zengest.com',
          password: 'Admin123!'
        })
      });

      if (!loginResponse.ok) {
        console.log('⚠️ Serveur non accessible');
        console.log('💡 Démarrez le serveur: npm run dev');
        return;
      }

      const loginData = await loginResponse.json();
      if (!loginData.success) {
        console.error('❌ Connexion échouée:', loginData.message);
        return;
      }

      const token = loginData.data.token;
      console.log('✅ Token obtenu');

      // Test de la route problématique
      console.log('\n📋 Test /orders...');
      const ordersResponse = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Status:', ordersResponse.status);
      
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        console.log('🎉 SUCCESS! Route /orders corrigée!');
        console.log('📄 Structure:', {
          success: data.success,
          ordersCount: data.data?.orders?.length || 0,
          pagination: !!data.data?.pagination
        });
      } else {
        const errorText = await ordersResponse.text();
        console.log('❌ Erreur persistante:', errorText);
        
        // Suggestions de correction
        console.log('\n💡 Solutions possibles:');
        console.log('1. Vérifier le fichier src/controllers/orderController.js');
        console.log('2. Vérifier la méthode getAllOrders');
        console.log('3. Vérifier les paramètres de pagination par défaut');
        console.log('4. Redémarrer le serveur: npm run dev');
      }

    } catch (apiError) {
      console.log('⚠️ Test API échoué:', apiError.message);
      console.log('💡 Vérifiez que le serveur tourne sur le port 3000');
    }

  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
    console.error(error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Connexion fermée');
    }
  }
};

// Fonction pour vérifier et corriger le contrôleur
const checkOrderController = () => {
  const fs = require('fs');
  const path = require('path');

  console.log('\n🔍 Vérification OrderController...');
  
  const controllerPath = path.join(__dirname, 'src', 'controllers', 'orderController.js');
  
  if (!fs.existsSync(controllerPath)) {
    console.error('❌ Fichier orderController.js non trouvé');
    return;
  }

  const content = fs.readFileSync(controllerPath, 'utf8');
  
  // Vérifications
  const hasGetAllOrders = content.includes('getAllOrders');
  const hasProperExport = content.includes('exports.getAllOrders') || content.includes('module.exports');
  const hasPagination = content.includes('page') && content.includes('limit');
  
  console.log('📋 Analyse du contrôleur:');
  console.log('✅ Méthode getAllOrders:', hasGetAllOrders ? 'Présente' : '❌ Manquante');
  console.log('✅ Export correct:', hasProperExport ? 'OK' : '❌ Problème');
  console.log('✅ Gestion pagination:', hasPagination ? 'OK' : '⚠️ À vérifier');

  if (!hasGetAllOrders) {
    console.log('\n💡 SOLUTION: Ajouter la méthode getAllOrders');
    console.log('📝 Template à ajouter:');
    console.log(`
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'timestamps.ordered',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    // Construire le filtre
    const filter = {};
    if (status) filter.status = status;

    // Requête avec pagination
    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name category')
      .populate('assignedServer', 'firstName lastName')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        }
      }
    });

  } catch (error) {
    console.error('Erreur getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des commandes'
    });
  }
};
    `);
  }
};

// Lancer le diagnostic
console.log('🚀 Démarrage diagnostic...');
checkOrderController();
diagnoseAndFixOrders();