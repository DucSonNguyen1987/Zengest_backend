console.log('🧪 Test rapide /orders avec Staff de salle\n');

const testOrdersStaffSimple = async () => {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Connexion avec Sophie (Staff de salle)
    console.log('🔐 Connexion avec Sophie (Staff Salle)...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sophie.salle@bistrot-zengest.com',
        password: 'Staff123!'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Serveur non accessible ou connexion échouée');
      console.log('💡 Vérifiez:');
      console.log('   1. Serveur démarré: npm run dev');
      console.log('   2. Données seedées: npm run seed');
      return;
    }
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Connexion échouée:', loginData.message);
      if (loginData.message.includes('Utilisateur non trouvé')) {
        console.log('💡 Exécutez: npm run seed pour créer les utilisateurs');
      }
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Connecté:', loginData.data.user.firstName, loginData.data.user.lastName);
    console.log('🎭 Rôle:', loginData.data.user.role);
    console.log('🏢 Restaurant:', loginData.data.user.restaurantId?.name || '❌ MANQUANT');
    
    if (!loginData.data.user.restaurantId) {
      console.log('⚠️ Staff sans restaurant assigné');
      console.log('💡 Exécutez: node fix-admin-restaurant.js pour corriger');
    }
    
    // Test route /orders
    console.log('\n📋 Test /orders...');
    const ordersResponse = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📊 Status:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      console.log('🎉 SUCCESS! Route /orders fonctionne avec staff');
      console.log('📄 Résultat:', {
        success: data.success,
        ordersCount: data.data?.orders?.length || 0,
        pagination: data.data?.pagination,
        hasFilters: !!data.data?.filters
      });
      
      // Vérifications spécifiques staff
      if (data.data?.orders?.length > 0) {
        console.log('📋 Exemple commande:', {
          id: data.data.orders[0]._id?.slice(-6) || 'N/A',
          status: data.data.orders[0].status,
          table: data.data.orders[0].tableNumber || 'N/A',
          total: data.data.orders[0].pricing?.total || 'N/A'
        });
      }
      
      console.log('\n✅ PARFAIT! Staff peut accéder aux commandes');
      
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ ÉCHEC - Status:', ordersResponse.status);
      console.log('📝 Erreur:', errorText.substring(0, 150));
      
      if (ordersResponse.status === 403) {
        console.log('\n💡 Erreur 403 (Forbidden):');
        console.log('   • Staff n\'a pas les permissions');
        console.log('   • Problème avec requireSameRestaurant middleware');
        console.log('   • Staff pas assigné au bon restaurant');
      } else if (ordersResponse.status === 500) {
        console.log('\n💡 Erreur 500 (même problème qu\'avec admin):');
        console.log('   • Problème dans getAllOrders controller');
        console.log('   • Exécutez: node fix-orders-controller.js');
      } else if (ordersResponse.status === 401) {
        console.log('\n💡 Erreur 401 (Unauthorized):');
        console.log('   • Token invalide ou expiré');
        console.log('   • Problème JWT');
      }
    }
    
    // Test comparatif routes qui fonctionnent
    console.log('\n🔄 Comparaison routes orders:');
    
    const routes = [
      '/orders/active',
      '/orders/statistics/summary'
    ];
    
    for (const route of routes) {
      try {
        const response = await fetch(`${API_BASE}${route}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`📍 ${route}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`📍 ${route}: ❌ ${error.message}`);
      }
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (ordersResponse.ok) {
      console.log('✅ Staff peut accéder aux commandes');
      console.log('🔒 Permissions staff correctement configurées');
      console.log('🚀 API prête pour le staff de salle');
    } else {
      console.log('❌ Problème avec l\'accès staff aux commandes');
      console.log('🔧 Même correction nécessaire que pour admin');
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
    console.log('\n💡 Vérifications:');
    console.log('1. npm run dev (serveur)');
    console.log('2. npm run seed (données)');
    console.log('3. node fix-orders-controller.js (correction)');
  }
};

testOrdersStaffSimple();