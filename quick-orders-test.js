console.log('🧪 Test rapide - Route /orders problématique\n');

const quickTest = async () => {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Connexion rapide
    console.log('🔐 Connexion...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zengest.com',
        password: 'Admin123!'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Serveur non accessible');
      console.log('💡 Démarrez: npm run dev');
      return;
    }
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Connexion échouée:', loginData.message);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Connecté en tant que:', loginData.data.user.firstName);
    console.log('🏢 Restaurant:', loginData.data.user.restaurantId?.name || '❌ MANQUANT');
    
    // Test comparatif des routes orders
    console.log('\n📊 Comparaison routes orders:');
    
    const routes = [
      { name: 'orders (problématique)', url: '/orders' },
      { name: 'orders/active (fonctionne)', url: '/orders/active' },
      { name: 'orders/statistics (fonctionne)', url: '/orders/statistics/summary' }
    ];
    
    for (const route of routes) {
      try {
        console.log(`\n🔗 Test ${route.name}:`);
        
        const response = await fetch(`${API_BASE}${route.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success: ${data.success}`);
          
          if (data.data) {
            if (data.data.orders) {
              console.log(`   📋 Orders: ${data.data.orders.length} éléments`);
            }
            if (data.data.pagination) {
              console.log(`   📄 Pagination: Page ${data.data.pagination.currentPage}/${data.data.pagination.totalPages}`);
            }
            if (data.data.summary) {
              console.log(`   📊 Summary: ${Object.keys(data.data.summary).length} métriques`);
            }
          }
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Error: ${errorText.substring(0, 100)}...`);
          
          // Analyse de l'erreur 500
          if (response.status === 500) {
            console.log(`   💡 Erreur 500 sur ${route.url}`);
            if (route.url === '/orders') {
              console.log('   🔧 Solutions possibles:');
              console.log('      1. Problème pagination dans getAllOrders');
              console.log('      2. Paramètres par défaut manquants');
              console.log('      3. Erreur dans le filtrage des commandes');
            }
          }
        }
        
      } catch (error) {
        console.log(`   💥 Erreur réseau: ${error.message}`);
      }
    }
    
    // Test avec paramètres explicites
    console.log('\n🎯 Test /orders avec paramètres explicites:');
    
    try {
      const explicitResponse = await fetch(`${API_BASE}/orders?page=1&limit=5&sortBy=timestamps.ordered&sortOrder=desc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log(`Status avec params: ${explicitResponse.status}`);
      
      if (explicitResponse.ok) {
        console.log('✅ Fonctionne avec paramètres explicites!');
        console.log('💡 Le problème est dans les valeurs par défaut');
      } else {
        const errorText = await explicitResponse.text();
        console.log('❌ Échoue même avec paramètres:', errorText.substring(0, 100));
      }
      
    } catch (error) {
      console.log('💥 Erreur test explicite:', error.message);
    }
    
    // Recommandations
    console.log('\n💡 DIAGNOSTIC:');
    console.log('Si /orders échoue mais /orders/active fonctionne:');
    console.log('  → Problème spécifique dans la méthode getAllOrders');
    console.log('  → Vérifiez les paramètres de pagination par défaut');
    console.log('  → Vérifiez la construction de la requête MongoDB');
    
    console.log('\n🔧 ACTIONS RECOMMANDÉES:');
    console.log('1. Exécutez: node diagnose-orders-fix.js');
    console.log('2. Vérifiez src/controllers/orderController.js');
    console.log('3. Redémarrez le serveur: npm run dev');
    console.log('4. Si persistant, exécutez: npm run seed:orders');
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
};

quickTest();