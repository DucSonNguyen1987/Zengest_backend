console.log('🧪 Test rapide route /orders après correction\n');

const testOrdersQuick = async () => {
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
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Échec connexion');
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Token obtenu');
    
    // Test route orders
    console.log('\n📋 Test /orders...');
    const ordersResponse = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📊 Status:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      console.log('✅ SUCCESS ! Route /orders fonctionne');
      console.log('📄 Structure:', {
        success: data.success,
        ordersCount: data.data?.orders?.length || 0,
        pagination: !!data.data?.pagination,
        filters: !!data.data?.filters
      });
      
      if (data.data?.orders?.length > 0) {
        console.log('📋 Première commande:', {
          id: data.data.orders[0]._id || data.data.orders[0].id,
          status: data.data.orders[0].status,
          total: data.data.orders[0].pricing?.total || data.data.orders[0].totalAmount
        });
      } else {
        console.log('📋 Aucune commande trouvée (normal si base vide)');
      }
      
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ ÉCHEC - Status:', ordersResponse.status);
      console.log('📝 Erreur:', errorText);
      
      if (ordersResponse.status === 500) {
        console.log('\n💡 Erreur 500 persistante:');
        console.log('1. Vérifiez que fix-orders-complete.js a été exécuté');
        console.log('2. Redémarrez le serveur: npm run dev');
        console.log('3. Vérifiez les logs du serveur');
        console.log('4. Vérifiez que la méthode getAllOrders existe dans OrderController');
      }
    }
    
    // Test rapide d'autres routes orders
    console.log('\n🔄 Test autres routes orders...');
    
    const otherRoutes = [
      '/orders/active',
      '/orders/statistics/summary'
    ];
    
    for (const route of otherRoutes) {
      try {
        const response = await fetch(`${API_BASE}${route}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`📍 ${route}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`📍 ${route}: ❌ ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
    console.log('💡 Vérifiez que le serveur tourne: npm run dev');
  }
};

testOrdersQuick();