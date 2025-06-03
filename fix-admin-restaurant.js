require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config/config');

console.log('🔧 CORRECTION DÉFINITIVE: Admin sans restaurant\n');

const fixAdminRestaurant = async () => {
  try {
    // Connexion MongoDB
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connexion MongoDB réussie');
    
    // Import des modèles
    const User = require('./src/models/User');
    const Restaurant = require('./src/models/Restaurant');
    
    // Étape 1: Diagnostiquer le problème
    console.log('\n🔍 DIAGNOSTIC:');
    
    const admin = await User.findOne({ email: 'admin@zengest.com' }).populate('restaurantId');
    if (!admin) {
      console.error('❌ Admin non trouvé avec email admin@zengest.com');
      return;
    }
    
    console.log('👤 Admin trouvé:', admin.firstName, admin.lastName);
    console.log('🏢 Restaurant actuel:', admin.restaurantId?.name || '❌ AUCUN');
    console.log('🆔 RestaurantId brut:', admin.restaurantId || '❌ UNDEFINED');
    
    // Vérifier les restaurants disponibles
    const restaurants = await Restaurant.find({}, 'name address.street').limit(5);
    console.log('\n🏪 Restaurants disponibles:');
    restaurants.forEach(r => {
      console.log(`   📍 ${r.name} (ID: ${r._id})`);
      console.log(`      📧 Adresse: ${r.address?.street || 'N/A'}`);
    });
    
    if (restaurants.length === 0) {
      console.log('\n❌ AUCUN RESTAURANT TROUVÉ !');
      console.log('💡 Solution: Exécutez npm run seed pour créer les données');
      return;
    }
    
    // Étape 2: Assigner le premier restaurant trouvé à l'admin
    const targetRestaurant = restaurants[0];
    
    console.log(`\n🔧 CORRECTION: Assigner "${targetRestaurant.name}" à l'admin...`);
    
    admin.restaurantId = targetRestaurant._id;
    await admin.save();
    
    console.log('✅ Restaurant assigné avec succès !');
    
    // Étape 3: Vérification
    console.log('\n🔍 VÉRIFICATION:');
    
    const updatedAdmin = await User.findById(admin._id).populate('restaurantId', 'name address');
    console.log('👤 Admin:', updatedAdmin.firstName, updatedAdmin.lastName);
    console.log('🏢 Restaurant:', updatedAdmin.restaurantId?.name || '❌ TOUJOURS MANQUANT');
    console.log('📍 Adresse:', updatedAdmin.restaurantId?.address?.street || 'N/A');
    
    if (!updatedAdmin.restaurantId) {
      console.error('❌ PROBLÈME PERSISTANT - Restaurant non assigné');
      return;
    }
    
    // Étape 4: Test API immédiat
    console.log('\n🧪 TEST API IMMÉDIAT:');
    
    try {
      const API_BASE = 'http://localhost:3000/api';
      
      console.log('🔐 Test connexion...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@zengest.com',
          password: 'Admin123!'
        })
      });
      
      if (!loginResponse.ok) {
        console.log('⚠️ Serveur non accessible, redémarrez avec: npm run dev');
        return;
      }
      
      const loginData = await loginResponse.json();
      if (!loginData.success) {
        console.error('❌ Échec connexion API:', loginData.message);
        return;
      }
      
      console.log('✅ Connexion API réussie');
      
      const token = loginData.data.token;
      
      // Test auth/me pour vérifier le restaurant
      console.log('👤 Test profil utilisateur...');
      const meResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log('✅ Profil récupéré');
        console.log('🏢 Restaurant dans API:', meData.data?.user?.restaurantId?.name || '❌ MANQUANT');
      }
      
      // Test de la route orders qui posait problème
      console.log('\n📋 TEST CRITIQUE: Route /orders...');
      const ordersResponse = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📊 Status /orders:', ordersResponse.status);
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        console.log('🎉 SUCCESS ! Route /orders fonctionne maintenant !');
        console.log('📋 Commandes trouvées:', ordersData.data?.orders?.length || 0);
        console.log('📄 Structure:', {
          success: ordersData.success,
          hasPagination: !!ordersData.data?.pagination,
          ordersArray: Array.isArray(ordersData.data?.orders)
        });
      } else {
        const errorText = await ordersResponse.text();
        console.log('❌ Route /orders échoue encore');
        console.log('📝 Erreur:', errorText.substring(0, 200));
        
        if (ordersResponse.status === 500) {
          console.log('\n💡 Erreur 500 persistante, causes possibles:');
          console.log('1. Middleware requireSameRestaurant a encore un problème');
          console.log('2. Problème avec le modèle Order');
          console.log('3. Erreur dans la validation des filtres');
          console.log('4. Problème de requête MongoDB');
        }
      }
      
      // Test d'autres routes pour comparaison
      console.log('\n🔄 Test routes de comparaison...');
      
      const testRoutes = [
        { name: 'Menu', url: '/menu' },
        { name: 'Restaurants', url: '/restaurants' }, 
        { name: 'Floor Plans', url: '/floor-plans' },
        { name: 'Reservations', url: '/reservations' }
      ];
      
      for (const route of testRoutes) {
        try {
          const response = await fetch(`${API_BASE}${route.url}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log(`📍 ${route.name}: ${response.status} ${response.ok ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`📍 ${route.name}: ❌ ${error.message}`);
        }
      }
      
    } catch (apiError) {
      console.log('⚠️ Test API échoué:', apiError.message);
      console.log('💡 Assurez-vous que le serveur tourne: npm run dev');
    }
    
    console.log('\n🎯 RÉSUMÉ:');
    console.log('✅ Admin trouvé et restaurant assigné');
    console.log('🔄 Redémarrez le serveur: npm run dev');
    console.log('🧪 Testez la route: node test-all-routes.js');
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Connexion MongoDB fermée');
    }
  }
};

fixAdminRestaurant();